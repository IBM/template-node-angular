// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0

var log4js = require('log4js');
var logger = log4js.getLogger('knj_log');


var MetricSender = function() {
    // MetricsSender class
};

var quickFix = function(data) {
    if (!data.CPU_P) {
        data.CPU_P = 0;
    }
    return data;
};

MetricSender.prototype.send = function(data, sender) {
    if (!data) {
        logger.error('can not send undefined data');
        return;
    }
    // write data to request body
    if (sender.getDataType() === 'xml') {
        var data_string = data.getAppInfo();
        data_string += '\n';
        data_string += data.getHttpReq();
        data_string += '\n';
        data_string += data.getGC();
        data_string += '\n';
        data_string += data.getEventLoop();
        data_string += '\n';
        data_string += data.getLoop();
        data_string += '\n';
        logger.debug('XML message: ' + data_string);

        sender.send(data_string, function(msg) {
            // currently we do not handle errors, so will ignore msg
            if (msg !== undefined)
                logger.error('sender callback with message: ' + msg);
        });
    } else if (sender.getDataType() === 'json') {
        var jsonAppInfo = quickFix(data.getJSONAppInfo());
        var jsonAppInfo2 = data.getJSONAppInfo2();
        var jsonComputeInfo = data.getJSONComputeInfo();
        var jsonHttpReq = data.getJSONHttpReq();
        var jsonGC = data.getJSONGC();
        var jsonEventLoop = data.getJSONEventLoop();
        var jsonProfiling = data.getJSONProfiling();
        var jsonProfilingMeta = data.getJSONProfilingMeta();

        var arrayGC = data.getArrayGC();
        var arrayEL = data.getArrayEL();
        var arrayLoop = data.getArrayLoop();

        try {
            sender.send({
                appInfo: jsonAppInfo,
                appInfo2: jsonAppInfo2,
                computeInfo: jsonComputeInfo,
                httpReq: jsonHttpReq,
                GC: jsonGC,
                El: jsonEventLoop,
                prof: jsonProfiling,
                profMeta: jsonProfilingMeta,
                GC_Arr: arrayGC,
                EL_Arr: arrayEL,
                Loop_Arr: arrayLoop
            });
        } catch (e) {
            logger.error('Error while sending json data: ' + e);
        }
    } else {
        logger.error('Unknown sender data type: ' + sender.getDataType());
    }
};

exports.metricSender = new MetricSender();
