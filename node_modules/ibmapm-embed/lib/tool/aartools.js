// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0

var uuid = require('uuid');
var commonTools = require('./common');
var log4js = require('log4js');
var logger = log4js.getLogger('knj_log');
var dbTypes = [
    'DB',
    'MONGO',
    'MYSQL',
    'LEVELDOWN',
    'REDIS',
    'RIAK',
    'MEMCACHED',
    'ORACLEDB',
    'ORACLE',
    'STRONG-ORACLE',
    'POSTGRES'
];

function hexStringToByteArray(hex) {
    var bytes = [];
    var length = hex.length / 2;
    for (var i = 0; i < length; i++) {
        bytes.push(parseInt(hex.substr(i * 2, 2), 16));
    }
    return bytes;
}

var HEX_ARRAY = ['0', '1', '2', '3', '4', '5',
    '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'
];

function byteArrayToHexString(bytes) {
    var str = '';
    for (var i = 0; i < bytes.length; i++) {
        var upperBits = bytes[i] >>> 4;
        var lowerBits = bytes[i] & 0x0f;
        str += HEX_ARRAY[upperBits % 16];
        str += HEX_ARRAY[lowerBits % 16];
    }
    return str;
}

var decodeARMCorrelator = function decodeARMCorrelator(correlator) {
    if (correlator.length < 46) {
        return undefined;
    } else {
        var corrBytes = hexStringToByteArray(correlator);
        var i;

        var rootUUID = [];
        for (i = 0; i < 16; i++) {
            rootUUID.push(corrBytes[i + 4]);
        }
        var rootUUIDStr = byteArrayToHexString(rootUUID);

        var parentUUID = [];
        for (i = 0; i < 16; i++) {
            parentUUID.push(corrBytes[i + 20]);
        }
        var parentUUIDStr = byteArrayToHexString(parentUUID);

        var instanceRoot = [];
        for (i = 0; i < 8; i++) {
            instanceRoot.push(corrBytes[i + 36]);
        }
        var instanceRootStr = byteArrayToHexString(instanceRoot);
        return rootUUIDStr + parentUUIDStr + instanceRootStr;
    }
};

function extractInfoFromHeader(header, reqHeader) {
    var headers = header.split('\r\n');
    var interaction_info = {};

    headers.forEach(function(header) {
        if (header.indexOf('HTTP') === 0) {
            interaction_info.protocol = header.split(' ')[0];
        }
    });

    if (reqHeader && reqHeader.arm_correlator) {
        interaction_info.correlator = decodeARMCorrelator(reqHeader.arm_correlator);
    }
    if (reqHeader && reqHeader['x-forwarded-for']) {
        interaction_info['x-forwarded-for'] = reqHeader['x-forwarded-for'];
    }

    return interaction_info;
}

exports.extractInfoFromHeader = extractInfoFromHeader;

function processAAROneInteraction(interData) {
    var interaction = {
        interactionTimestamp: (new Date(interData.time)).toISOString(),
        interactionType: interData.bound + '_' + interData.type,
        interactionCallerID: interData.correlator ? 'ARM' : 'WR',
        interactionContext: interData.info
    };
    if (interData.correlator) {
        interaction.interactionCorrelator = interData.type === 'REQUEST' ?
            new Buffer(interData.correlator).toString('base64') :
            new Buffer(interData.correlator + 'FF').toString('base64');
    }
    if (interData.stitch) {
        interaction.interactionStitch = interData.stitch;
    }
    if (interaction.interactionType === 'OUTBOUND_RESPONSE' && interData.ctx.statusCode >= 400) {
        interaction.responseStatusCode = interData.ctx.statusCode;
    }
    if (interaction.interactionType === 'OUTBOUND_RESPONSE' &&
        interData.req.context.statusCode >= 400) {
        interaction.responseStatusCode = interData.req.context.statusCode;
    }
    interData.interactions.push(interaction);
}

function processAARInteractions(req, result, port, context) {
    logger.debug('aartools.js', 'processAARInteractions', 'start');
    var traceIt = true;
    var interaction_info = {};
    var stitch_info;
    var correlator;
    if (!req.type) {
        traceIt = false;
    } else if (req.type.toUpperCase() === 'HTTP' || req.type.toUpperCase() === 'HTTP-OUTBOUND') {
        interaction_info.requestType = req.type.toUpperCase();
        if (!(req.type === 'HTTP' && req.parent)) {
            interaction_info.componentName = req.type.toUpperCase() === 'HTTP' ?
                'HTTP Client' : 'External Call(HTTP)';
            if (req.type.toUpperCase() === 'HTTP-OUTBOUND') {
                interaction_info.requestType = 'HTTP';
            }
            if (req.context) {
                stitch_info = {
                    destinationIPAddress: context.IP,
                    'IPDestination Port': port
                };
                if (req.context.requestHeader) {
                    var header_info = extractInfoFromHeader('',
                        req.context.requestHeader);
                    correlator = header_info.correlator;

                    if (header_info.method) {
                        stitch_info.method = header_info.method || req.context.method;
                    }
                    if (header_info.protocol) {
                        stitch_info.protocol = header_info.protocol;
                    }
                    if (header_info['x-forwarded-for']) {
                        stitch_info['x-forwarded-for'] = header_info['x-forwarded-for'];
                    }

                    interaction_info.url =
                        commonTools.getFullURL(req.name, context.IP, port, header_info.protocol);
                }
            }
            interaction_info.appName = req.name;
            interaction_info.applicationName = req.name;
            interaction_info.transactionName = req.name;
            if (!interaction_info.url) {
                interaction_info.url = commonTools.getFullURL(req.name, context.IP, port);
            }
        } else {
            traceIt = false;
        }
    } else {
        interaction_info.resource = req.name;
        interaction_info.requestType = req.type.toUpperCase();
        if (dbTypes.indexOf(interaction_info.requestType) < 0 || global.SECURITY_OFF) {
            interaction_info = commonTools.merge(
                [interaction_info, req.context ? req.context : {}]);
        }
        interaction_info.componentName = 'External Call (' + req.type.toUpperCase() + ')';
        interaction_info.applicationName = req.name;
        interaction_info.transactionName = req.name;
    }
    if (traceIt && req.tracedStart) {
        processAAROneInteraction({
            interactions: result.interactions,
            ctx: context,
            port: port,
            info: interaction_info,
            bound: req.parent ? 'OUTBOUND' : 'INBOUND',
            type: 'REQUEST',
            time: req.timer.startTimeMillis,
            stitch: stitch_info,
            correlator: correlator,
            req: req
        });
    }

    if (req.children && req.children.length > 0) {
        for (var i = 0; i < req.children.length; i++) {
            var child = req.children[i];
            processAARInteractions(child, result, port, context);
        }
    }

    if (traceIt && req.traceStopped) {
        processAAROneInteraction({
            interactions: result.interactions,
            ctx: context,
            port: port,
            info: interaction_info,
            bound: req.parent ? 'INBOUND' : 'OUTBOUND',
            type: 'RESPONSE',
            time: req.timer.startTimeMillis + req.timer.timeDelta,
            stitch: stitch_info,
            correlator: correlator,
            req: req
        });
    }
}

exports.composeAARTT = function composeAARTT(data, port) {
    logger.debug('aartools.js', 'composeAARTT', 'start');
    var context = require('../json-sender').jsonSender;
    var statusCode = data.request.context.statusCode;
    var result = {
        metrics: {
            status: statusCode ? (statusCode < 400 ? 'Good' : 'Failed') : 'Unknown',
            responseTime: data.duration / 1000
        },
        properties: {
            // threadID: '0',
            documentType: '/AAR/Middleware/NODEJS',
            softwareServerType: 'http://open-services.net/ns/crtv#NodeJS',
            softwareModuleName: context.applicationName,
            resourceID: context.nodeAppMD5String,
            processID: process.pid,
            diagnosticsEnabled: commonTools.testTrue(process.env.KNJ_ENABLE_DEEPDIVE),
            applicationName: context.applicationName,
            serverName: context.app_hostname,
            serverAddress: context.IP,
            requestName: data.name,
            componentName: 'Node.JS Application',
            transactionName: data.name,
            documentVersion: '2.0', // why?
            startTime: (new Date(data.time)).toISOString(),
            finishTime: (new Date(data.time + data.duration)).toISOString(),
            documentID: uuid.v1()
        },
        interactions: []
    };
    if (statusCode >= 400) {
        result.properties.responseStatusCode = statusCode;
    }
    if (process.env.HYBRID_BMAPPID) {
        result.properties.originID = process.env.HYBRID_BMAPPID;
    }

    if (context.isicp && context.serviceIds.length > 0) {
        result.properties.serviceIds = context.serviceIds;
    }
    processAARInteractions(data.request, result, port, context);
    return result;
};
