// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0
'use strict';
var fs = require('fs');
var url = require('url');
var crypto = require('crypto');
var restClient = require('ibmapm-restclient');
var aarTools = require('./tool/aartools');
var adrTools = require('./tool/adrtools');
var uuid = require('uuid');
var os = require('os');
var commonTools = require('./tool/common');
var k8sutil = restClient.getK8stool();
var log4js = require('log4js');
var logger = log4js.getLogger('knj_log');
var serviceEndPointResIDs = [];
var hostPorts = {};
var predefined_situation = require('../etc/predefined_situation.json');
var dcConfig = require('./config.js');

var getDeployment = function() {
    if (k8sutil.isICP()) {
        return 'container';
    } else {
        return 'traditional';
    }

};


function JsonSender() {
    this.port = 443;
    this.app_hostname = os.hostname();
    this.applicationName = process.env.APPLICATION_NAME;
    this.nodeAppRuntimeString = undefined;
    this.nodeAppRuntimeMD5String = undefined;
    this.interfaceMD5String = undefined;
    this.serviceEndPointMD5Strings = [];
    this.instanceString = undefined;
    this.isServiceEndPointReady = false;
    this.externalRegister = {};
    this.startTime = (new Date()).toISOString();
    this.vcap = undefined;
    this.appVersion = undefined;

    this.app_data = undefined;

    this.isAppMetricInitialized = false;
    this.environment = undefined;

    this.registeredAll = false;
    this.situationPosted = false;
    this.aarBatchForBI = {
        payload: [],
        committed: false
    };
    this.dcversion = global.DC_VERSION ? global.DC_VERSION : getDCVersion();
    this.serviceIds = [];
    this.serviceNames = [];
    this.isicp = k8sutil.isICP();
}

function getDCVersion() {
    var packageFile = __dirname + '/../package.json';
    var packageString = fs.readFileSync(packageFile);
    var packageJson = JSON.parse(packageString);
    if (packageJson && packageJson.version) {
        return packageJson.version;
    }
    return '1.0.0';
}

function getServerAddress(family, defAddr) {
    var interfaces = os.networkInterfaces();
    for (var intf in interfaces) {
        if (interfaces.hasOwnProperty(intf)) {
            var iface = interfaces[intf];
            for (var i = 0; i < iface.length; i++) {
                var alias = iface[i];

                if (alias.family === family && alias.address !== '127.0.0.1' &&
                    alias.address !== '::1' && !alias.internal)
                    return alias.address;
            }
        }
    }
    return defAddr || '127.0.0.1';
}

var _this = this;
JsonSender.prototype.register = function register() { // Register DC and Resouce
    // Prepare Node.js App related reusable strings: this.applicationName, this.nodeAppMD5String

    logger.debug('Register...');
    var path = process.mainModule ? process.mainModule.filename : process.argv[1];
    _this.IP = getServerAddress('IPv4', '127.0.0.1');
    _this.IPv6 = getServerAddress('IPv6', '::1');
    if (process.env.VCAP_APPLICATION) {
        _this.vcap = JSON.parse(process.env.VCAP_APPLICATION);
        _this.applicationName = _this.applicationName || _this.vcap.application_name;
        _this.instanceString = _this.vcap.instance_id;
        _this.nodeAppRuntimeString = _this.vcap.application_id + 'nodeapplicationruntime';
    } else if (_this.isicp) {
        _this.applicationName = _this.applicationName || k8sutil.getNamespace() +
            k8sutil.getPodName() + path;

        _this.instanceString = k8sutil.getNamespace() + k8sutil.getContainerID() + path;
        _this.nodeAppRuntimeString = k8sutil.getNamespace() + k8sutil.getContainerID() +
            'nodeapplicationruntime';
        _this.serviceNames = k8sutil.getFullServiceName();
        _this.serviceIds = k8sutil.getServiceID();
    } else {
        _this.applicationName = _this.applicationName || process.argv[1];
        _this.instanceString = _this.IP + path + _this.applicationName;
        _this.nodeAppRuntimeString = _this.app_hostname + _this.applicationName + 'nodeapplicationruntime';
    }
    _this.nodeAppRuntimeMD5String = crypto.createHash('md5').update(_this.nodeAppRuntimeString)
        .digest('hex');

    _this.dcMD5String = crypto.createHash('md5').update(_this.instanceString + 'NodejsDC')
        .digest('hex');

    logger.debug('The plain text of node application runtime id: ', _this.nodeAppRuntimeMD5String);
    logger.debug('The plain text of provider id: ', _this.instanceString + 'NodejsDC');

    // Register DC:

};

JsonSender.prototype.registerDC = function registerDC() {
    var dcObj = {
        id: process.env.KNJ_PROVIDER_ID ? process.env.KNJ_PROVIDER_ID : this.dcMD5String,
        type: ['provider'],
        startedTime: this.startTime,
        properties: {
            tags: ['deployment:' + getDeployment()],
            name: this.applicationName,
            dataCollectorVersion: this.dcversion,
            version: this.dcversion,
            host: os.hostname(),
            providerType: 'NodejsDC'
        }
    };

    if (this.isicp) {
        dcObj.properties.namespace = k8sutil.getNamespace();
    }


    dcObj.references = [
        { direction: 'to', type: 'monitors', id: this.nodeAppRuntimeMD5String }
    ];
    for (let index = 0; index < this.serviceEndPointMD5Strings.length; index++) {
        const element = this.serviceEndPointMD5Strings[index];
        dcObj.references.push({ direction: 'to', type: 'monitors', id: element });
    }
    restClient.registerDC(dcObj, function(error, res) {
        if (error) { return; }
        if (res && ((res.statusCode >= 200 && res.statusCode < 300) || res.statusCode === 409)) {
            restClient.postDCConfiguration({
                properties: {
                    TRACE_LEVEL: {
                        type: 'Enum',
                        value: process.env.KNJ_LOG_LEVEL ?
                            process.env.KNJ_LOG_LEVEL.toUpperCase() : 'INFO',
                        valueList: ['DEBUG', 'INFO',
                            'WARNING', 'ERROR', 'OFF'
                        ]
                    },
                    SAMPLING_COUNT: {
                        type: 'Number',
                        value: process.env.KNJ_SAMPLING ? process.env.KNJ_SAMPLING : 1
                    },
                    MIN_CLOCK_TRACE: {
                        type: 'Number',
                        value: process.env.KNJ_MIN_CLOCK_TRACE ?
                            process.env.KNJ_MIN_CLOCK_TRACE : 0
                    },
                    MIN_CLOCK_STACK: {
                        type: 'Number',
                        value: process.env.KNJ_MIN_CLOCK_STACK ?
                            process.env.KNJ_MIN_CLOCK_STACK : 0
                    },
                    EVENTS_PER_FILE: {
                        type: 'Number',
                        value: process.env.EVENTS_PER_FILE ?
                            process.env.EVENTS_PER_FILE : 200
                    },
                    FILE_COMMIT_TIME: {
                        type: 'Number',
                        value: process.env.FILE_COMMIT_TIME ?
                            process.env.FILE_COMMIT_TIME : 60
                    }
                },
                capabilities: {
                    enableDataCollection: 'true',
                    enableTransactionTracking: dcObj.properties.transactionTrackingEnabled ? 'true' : 'false',
                    enableDiagnosticData: dcObj.properties.diagnosticsEnabled ? 'true' : 'false',
                    enableMethodTracing: dcObj.properties.methodTraceEnabled ? 'true' : 'false',
                    enableMetrics: 'true'
                }
            }, function(posterr, postres) {
                if (posterr) { return; }
                if (postres && ((postres.statusCode >= 200 && postres.statusCode < 300) ||
                        postres.statusCode === 409)) {
                    var getConfigurationInterval = setInterval(function() {
                        restClient.getConfiguration(function(geterr, getres) {
                            if (geterr) { return; }
                            if (getres && getres.headers && getres.headers['last-modified'] &&
                                getres.headers['last-modified'] !== global.KNJ_CONFIG_LASTMODIFIED) {
                                global.KNJ_CONFIG_LASTMODIFIED = getres.headers['last-modified'];
                                getres.on('data', function(d) {
                                    var configuration = d.toString();
                                    logger.debug('get configuration: ', configuration);
                                    try {
                                        var configurationJson = JSON.parse(configuration);
                                        dealwithConfigurationChange(configurationJson);
                                    } catch (e) {
                                        logger.error('Failed to parse configuration.', e);
                                    }
                                });
                            }
                        });
                    }, 60000);
                    getConfigurationInterval.unref();
                }
            });
        }
    });
};

function dealwithConfigurationChange(conf) {
    logger.debug('Configuration:', conf.configuration);
    var curr = dcConfig.getConfig();
    if (conf.configuration) {
        var updated = false;
        if (conf.configuration.capabilities.enableTransactionTracking !==
            process.env.KNJ_ENABLE_TT) {
            process.env.KNJ_ENABLE_TT = conf.configuration.capabilities.enableTransactionTracking;
            updated = true;
        }
        if (conf.configuration.capabilities.enableDiagnosticData !==
            process.env.KNJ_ENABLE_DEEPDIVE) {
            process.env.KNJ_ENABLE_DEEPDIVE = conf.configuration.capabilities.enableTransactionTracking;
            updated = true;
        }
        if (conf.configuration.capabilities.enableMethodTracing !==
            process.env.KNJ_ENABLE_METHODTRACE) {
            process.env.KNJ_ENABLE_METHODTRACE = conf.configuration.capabilities.enableTransactionTracking;
            updated = true;
        }
        if (conf.configuration.properties.SAMPLING_COUNT.value !==
            parseInt(process.env.KNJ_SAMPLING)) {
            process.env.KNJ_SAMPLING = conf.configuration.properties.SAMPLING_COUNT.value + '';
            updated = true;
        }
        if (conf.configuration.properties.MIN_CLOCK_TRACE.value !==
            parseInt(process.env.KNJ_MIN_CLOCK_TRACE)) {
            process.env.KNJ_MIN_CLOCK_TRACE = conf.configuration.properties.MIN_CLOCK_TRACE.value + '';
            updated = true;
        }
        if (conf.configuration.properties.MIN_CLOCK_STACK.value !==
            parseInt(process.env.KNJ_MIN_CLOCK_STACK)) {
            process.env.KNJ_MIN_CLOCK_STACK = conf.configuration.properties.MIN_CLOCK_STACK.value + '';
            updated = true;
        }
        if (conf.configuration.properties.EVENTS_PER_FILE.value !==
            parseInt(process.env.KNJ_EVENTS_PER_FILE)) {
            process.env.KNJ_EVENTS_PER_FILE = conf.configuration.properties.EVENTS_PER_FILE.value + '';
            updated = true;
        }
        if (conf.configuration.properties.FILE_COMMIT_TIME.value !==
            parseInt(process.env.KNJ_FILE_COMMIT_TIME)) {
            process.env.KNJ_FILE_COMMIT_TIME = conf.configuration.properties.FILE_COMMIT_TIME.value + '';
            updated = true;
        }
        if (updated) {
            logger.info('DC Configuration Changed', conf.configuration);
            dcConfig.update(curr);
        }
        if (process.env.KNJ_LOG_LEVEL !== conf.configuration.properties.TRACE_LEVEL.value) {
            logger.info('Loglevel Configuration Changed',
                conf.configuration.properties.TRACE_LEVEL.value);
            process.env.KNJ_LOG_LEVEL = conf.configuration.properties.TRACE_LEVEL.value;
            logger.setLevel(process.env.KNJ_LOG_LEVEL);
            restClient.updateLoglevel(process.env.KNJ_LOG_LEVEL);
        }
    }
}


JsonSender.prototype.init = function init(envType) {
    _this = this;
    var the_port;
    try {
        if (process.env.KNJ_CONFIG_FILE) {
            restClient.setConfiguration('./' + process.env.KNJ_CONFIG_FILE);
        } else {
            restClient.setConfiguration('./config.json');
        }
        this.register();
        _this.IP = getServerAddress('IPv4', '127.0.0.1');
        _this.IPv6 = getServerAddress('IPv6', '::1');

        var vcapApplication;
        if (process.env.VCAP_APPLICATION) {
            vcapApplication = JSON.parse(process.env.VCAP_APPLICATION);

            _this.app_data = {
                APP_NAME: this.applicationName || vcapApplication['application_name'],
                INSTANCE_ID: vcapApplication['instance_id'],
                INSTANCE_INDEX: vcapApplication['instance_index'],
                URI: vcapApplication['uris'],
                START_TIME: vcapApplication['started_at'],
                APP_PORT: vcapApplication['port']
            };
        } else {
            the_port = commonTools.getServerPort();
            the_port = the_port === 'unknown' ? 0 : the_port;

            if (!process.env.APPLICATION_NAME) {
                // find name in package.json
                if (process.mainModule.paths && process.mainModule.paths.length > 0) {
                    var name = generateAppNameByPackage();

                    if (!name) {
                        logger.debug('Failed to get name in package.json,' +
                            ' will generate applicationName and' +
                            ' APP_GUID by file position.');
                        this.generateAppNameAndGuidbyPath();
                    } else {
                        this.applicationName = name;
                    }
                } else {
                    this.generateAppNameAndGuidbyPath();
                }
            }

            _this.app_data = {
                APP_NAME: this.applicationName,
                INSTANCE_ID: '' + process.pid,
                INSTANCE_INDEX: 0,
                URI: [os.hostname() + ':' + the_port],
                START_TIME: (new Date()).toISOString(),
                APP_PORT: the_port
            };
        }
    } catch (e) {
        logger.error('JsonSender initialization error: ' + e);
        logger.error(e.stack);
    }

};

JsonSender.prototype.generateAppNameAndGuidbyPath = function generateAppNameAndGuidbyPath() {
    var the_path = process.env.PWD;
    var the_folder = the_path.replace(/\//g, '_');
    var arg_str = process.argv[1].replace(/\//g, '_');
    var appGuid = os.hostname() + '_' + the_folder + '_' + arg_str;
    var nodeAppNPMMD5 = crypto.createHash('md5');
    nodeAppNPMMD5.update(appGuid);
    appGuid = nodeAppNPMMD5.digest('hex');

    if (process.argv[1].indexOf(the_path) !== -1)
        this.applicationName = this.applicationName || process.argv[1];
    else
        this.applicationName = this.applicationName || the_path + '/' + process.argv[1];
};

function generateAppNameByPackage() {
    let name;
    for (const i in process.mainModule.paths) {
        if (process.mainModule.paths.hasOwnProperty(i)) {
            const packageFile = process.mainModule.paths[i].split('node_modules')[0] +
                '/' + 'package.json';
            try {
                const packageString = fs.readFileSync(packageFile);
                const packageJson = JSON.parse(packageString);
                if (packageJson.name) {
                    name = packageJson.name;
                    break;
                }
            } catch (e) {
                logger.debug('Could not found the ' + packageFile);
            }
        }
    }
    return name;
}

JsonSender.prototype.registerAppModel = function registerAppModel() {
    if (this.vcap && !global.RESOURCE_SVCEP_REGISTED) {
        global.RESOURCE_SVCEP_REGISTED = true;
        for (var index = 0; index < this.vcap.application_uris.length; index++) {
            var uri = this.vcap.application_uris[index];
            var interfaceMD5String = crypto.createHash('MD5').update(uri + ':' + this.vcap.port)
                .digest('hex');
            this.serviceEndPointMD5Strings.push(interfaceMD5String);
            var interfaceObj = {
                id: process.env.KNJ_SERVICEENDPOINTS_ID ? process.env.KNJ_SERVICEENDPOINTS_ID : interfaceMD5String,
                type: ['serviceEndpoint'],
                properties: {
                    uri: uri,
                    port: this.vcap.port,
                    name: this.vcap.name,
                    tags: ['deployment:' + getDeployment()]
                }
                // ,
                // references: [
                //     { direction: 'to', type: 'communicatesWith', id: this.nodeAppRuntimeMD5String },
                //     { direction: 'from', type: 'monitors', pid: this.dcMD5String }
                // ]
            };
            serviceEndPointResIDs.push(interfaceObj.id);
            restClient.registerResource(interfaceObj);
        }
        this.registerDC();
        this.registerAppRuntime();
    }
};
JsonSender.prototype.registerAppRuntime = function registerAppRuntime() {
    logger.debug('json-sender.js', 'registerAppRuntime', 'start');
    const runtimeObj = {
        id: process.env.KNJ_NODEAPPLICATIONRUNTIME_ID ? process.env.KNJ_NODEAPPLICATIONRUNTIME_ID : this.nodeAppRuntimeMD5String,
        type: ['nodeApplicationRuntime'],
        references: [],
        properties: {
            name: this.applicationName,
            tags: ['deployment:' + getDeployment()],
            VersionDependencies: {
                version: process.versions.node,
                http_parser: process.versions.http_parser,
                v8: process.versions.v8,
                ares: process.versions.ares,
                uv: process.versions.uv,
                zlib: process.versions.zlib,
                modules: process.versions.modules,
                openssl: process.versions.openssl
            }
        }

    };
    for (let index = 0; index < this.serviceEndPointMD5Strings.length; index++) {
        const element = this.serviceEndPointMD5Strings[index];
        runtimeObj.references.push({ direction: 'from', type: 'communicatesWith', id: element });
    }
    restClient.registerResource(runtimeObj, function(err, res) {
        if (err) { return; }
        if (res && ((res.statusCode >= 200 && res.statusCode < 300) || res.statusCode === 409)) {
            logger.debug('nodeApplicationRuntime is registered');
            global.nodeApplicationRuntimeIsRegistered = true;
        }
    });
};

JsonSender.prototype.registerAppModelOnPre = function registerAppModelOnPre(reqData) {
    if (this.vcap || this.isicp) {
        return;
    }
    // global.RESOURCE_SVCEP_REGISTED = true;

    var host = reqData.requestHeader.host;
    if (!host.toLowerCase().startsWith('http')) {
        host = 'http://' + host;
    }
    var uri = url.parse(host);
    if (hostPorts[uri.href]) {
        return;
    }
    hostPorts[uri.href] = true;
    var interfaceMD5 = crypto.createHash('MD5');
    interfaceMD5.update(uri.protocol + '//' + uri.host);
    this.interfaceMD5String = interfaceMD5.digest('hex');
    this.serviceEndPointMD5Strings.push(this.interfaceMD5String);

    var interfaceObj = {
        id: process.env.KNJ_SERVICEENDPOINTS_ID ? process.env.KNJ_SERVICEENDPOINTS_ID : this.interfaceMD5String,
        type: ['serviceEndpoint'],
        properties: {
            uri: uri.protocol + '//' + uri.hostname,
            port: uri.port === null ? 80 : uri.port,
            name: this.applicationName,
            tags: ['deployment:' + getDeployment()]
        }
        // ,
        // references: [
        //     { direction: 'to', type: 'communicatesWith', id: this.nodeAppRuntimeMD5String },
        //     { direction: 'from', type: 'monitors', pid: this.dcMD5String }
        // ]
    };

    serviceEndPointResIDs.push(interfaceObj.id);
    restClient.registerResource(interfaceObj);
    this.registerDC();
    this.registerAppRuntimeOnPre();
};

JsonSender.prototype.registerAppRuntimeOnPre = function registerAppRuntimeOnPre() {
    logger.debug('json-sender.js', 'registerAppRuntimeOnPre', 'start');
    const runtimeObj = {
        id: process.env.KNJ_NODEAPPLICATIONRUNTIME_ID ? process.env.KNJ_NODEAPPLICATIONRUNTIME_ID : this.nodeAppRuntimeMD5String,
        type: ['nodeApplicationRuntime'],
        references: [],
        properties: {
            name: this.applicationName,
            tags: ['deployment:' + getDeployment()],
            VersionDependencies: {
                version: process.versions.node,
                http_parser: process.versions.http_parser,
                v8: process.versions.v8,
                ares: process.versions.ares,
                uv: process.versions.uv,
                zlib: process.versions.zlib,
                modules: process.versions.modules,
                openssl: process.versions.openssl
            }
        }

    };
    for (let index = 0; index < this.serviceEndPointMD5Strings.length; index++) {
        const element = this.serviceEndPointMD5Strings[index];
        runtimeObj.references.push({ direction: 'from', type: 'communicatesWith', id: element });
    }
    restClient.registerResource(runtimeObj, function(err, res) {
        if (err) { return; }
        if (res && ((res.statusCode >= 200 && res.statusCode < 300) || res.statusCode === 409)) {
            logger.debug('nodeApplicationRuntime is registered');
            global.nodeApplicationRuntimeIsRegistered = true;
        }
    });
};
JsonSender.prototype.registerAppModelOnICP = function registerAppModelOnICP() {
    logger.debug('json-sender.js', 'registerAppModelOnICP', 'start');
    var svcArr = k8sutil.getServicesConn();
    for (var index = 0; index < svcArr.length; index++) {
        var svc = svcArr[index];
        this.serviceEndPointMD5Strings.push(svc.uid);
        serviceEndPointResIDs.push(svc.uid);
        var interfaceObj = {
            id: process.env.KNJ_SERVICEENDPOINTS_ID ? process.env.KNJ_SERVICEENDPOINTS_ID : svc.uid,
            type: ['serviceEndpoint'],
            properties: {
                name: this.applicationName,
                // mergeTokens: svc.mergeTokens.concat([svc.uid]),
                namespace: k8sutil.getNamespace(),
                connections: svc.connections,
                tags: ['deployment:' + getDeployment()]
            }
            // ,
            // references: [
            //     { direction: 'to', type: 'communicatesWith', id: this.nodeAppRuntimeMD5String },
            //     { direction: 'from', type: 'monitors', pid: this.dcMD5String }
            // ]
        };
        if (svc.connections.length > 0) {
            interfaceObj.properties.uri = svc.connections[0];
        }
        if (svc.nodePort.length > 0) {
            interfaceObj.properties.connections = interfaceObj.properties.connections.concat(
                commonTools.combineArr(k8sutil.getNodeIPs(), ':', svc.nodePort));
        }
        restClient.registerResource(interfaceObj);
    }

    this.registerDC();
    this.registerAppRuntimeOnICP();
    global.SERVICEENDPOINT_REGISTED = true;
};

JsonSender.prototype.registerAppRuntimeOnICP = function registerAppRuntimeOnICP() {
    logger.debug('json-sender.js', 'registerAppRuntimeOnICP', 'start');
    const containerId = k8sutil.getContainerID();
    const runtimeObj = {
        id: process.env.KNJ_NODEAPPLICATIONRUNTIME_ID ? process.env.KNJ_NODEAPPLICATIONRUNTIME_ID : this.nodeAppRuntimeMD5String,
        type: ['nodeApplicationRuntime'],
        references: [],
        properties: {
            name: this.applicationName + ':' + containerId.substr(0, 12),
            namespace: k8sutil.getNamespace(),
            mergeTokens: [
                k8sutil.getNodeName() + '.' + k8sutil.getNamespace() +
                '.' + k8sutil.getPodID() + '.' + k8sutil.getContainerName(),
                k8sutil.getNodeName() + '.' + k8sutil.getNamespace() +
                '.' + k8sutil.getPodID() + '.' + k8sutil.getContainerFullID(),
                k8sutil.getContainerID(),
                k8sutil.getPodID()
            ]
        },
        VersionDependencies: {
            version: process.versions.node,
            http_parser: process.versions.http_parser,
            v8: process.versions.v8,
            ares: process.versions.ares,
            uv: process.versions.uv,
            zlib: process.versions.zlib,
            modules: process.versions.modules,
            openssl: process.versions.openssl
        }

    };
    if (k8sutil.getContainerID()) {
        runtimeObj.properties.containerId = k8sutil.getContainerID();
    }
    if (k8sutil.getPodName()) {
        runtimeObj.properties.podName = k8sutil.getPodName();
    }
    for (let index = 0; index < this.serviceEndPointMD5Strings.length; index++) {
        const element = this.serviceEndPointMD5Strings[index];
        runtimeObj.references.push({ direction: 'from', type: 'communicatesWith', id: element });
    }
    restClient.registerResource(runtimeObj, function(err, res) {
        if (err) { return; }
        if (res && ((res.statusCode >= 200 && res.statusCode < 300) || res.statusCode === 409)) {
            logger.debug('nodeApplicationRuntime is registered');
            global.nodeApplicationRuntimeIsRegistered = true;
        }
    });
};


JsonSender.prototype.dynamicRegister = function dynamicRegister(env) {
    logger.debug('json-sender.js', 'dynamicRegister', this.registeredAll);
    if (this.registeredAll) {
        return;
    }
    if (this.isicp) {
        this.registerAppModelOnICP();
    } else if (this.vcap) {
        this.registerAppModel();
    }

    this.registeredAll = true;
};

JsonSender.prototype.setEnvironment = function setEnvironment(env) {
    logger.debug('json-sender.js', 'setEnvironment', env);
    this.isAppMetricInitialized = true;
    this.environment = env;
};

JsonSender.prototype.send = function send(data) {
    if (data == null || data.appInfo == null) {
        return;
    }
    // if (this.isAppMetricInitialized) {
    //     this.dynamicRegister(this.environment);
    // }
    this.dynamicRegister();
    if (global.nodeApplicationRuntimeIsRegistered &&
        !this.situationPosted) {
        restClient.postSituationConfiguration({ PRIVATESIT: predefined_situation });
        this.situationPosted = true;
    }
    var metricPayloads = [];
    var dimensions_content = {};
    if (this.isicp) {
        for (var i = 0, len = this.serviceNames.length; i < len; i++) {
            dimensions_content[this.serviceNames[i]] = 'serviceIds';
        }
        if (this.serviceNames.length <= 0) {
            this.serviceNames = k8sutil.getFullServiceName();
        }
    }

    // special code for feature ut end

    var reqSummPayload = this.genReqSumm(dimensions_content, data);
    metricPayloads.push(reqSummPayload);

    var reqsSummPayload =
        this.genRequestSummaries(dimensions_content, data);
    metricPayloads = metricPayloads.concat(reqsSummPayload);

    if (this.nodeAppRuntimeMD5String) {

        var enginePayloadMeta = {
            resourceID: process.env.KNJ_NODEAPPLICATIONRUNTIME_ID ? process.env.KNJ_NODEAPPLICATIONRUNTIME_ID : this.nodeAppRuntimeMD5String,
            timestamp: new Date().toISOString()
        };
        var gcPayload = this.genGCPayload(dimensions_content,
            data, enginePayloadMeta);
        metricPayloads.push(gcPayload);

        var elPayload = this.genELPayload(dimensions_content,
            data, enginePayloadMeta);
        metricPayloads = metricPayloads.concat(elPayload);

        var sysPayload = this.genSysInfo(dimensions_content,
            data, enginePayloadMeta);
        metricPayloads.push(sysPayload);
    }
    // Plus other parts for BI
    var payloadBISpecial = {
        BIOnly: true,
        APP_NAME: this.app_data.APP_NAME,
        INSTANCE_ID: this.app_data.INSTANCE_ID,
        INSTANCE_INDEX: this.app_data.INSTANCE_INDEX,
        URI: this.app_data.URI,
        START_TIME: this.app_data.START_TIME,
        APP_PORT: this.app_data.APP_PORT,
        PORT: data.appInfo.PORT,
        HTTP_REQ: data.httpReq,
        eventloop_time: data.El.eventloop_time,
        averageEventLoopLatency: data.El.eventloop_latencyAvg,
        minimumEventLoopLatency: data.El.eventloop_latencyMin,
        maximumEventLoopLatency: data.El.eventloop_latencyMax,
        averageEventLoopTickTime: data.El.loop_average,
        maximumEventLoopTickTime: data.El.loop_maximum,
        minimumEventLoopTickTime: data.El.loop_minimum,
        eventLoopTickCount: data.El.loop_count,
        REQCOUNT: data.appInfo.REQCOUNT,
        PID: data.appInfo.PID,
        APP_ENTRY: data.appInfo.APP_ENTRY,
        app_memAll: data.appInfo.app_memAll,
        app_uptime: data.appInfo.app_uptime
    };
    if (data.appInfo.TYPE) {
        payloadBISpecial.TYPE = data.appInfo.TYPE;
    }
    metricPayloads.push(payloadBISpecial);
    restClient.sendMetrics(metricPayloads);
    if (data.prof.length > 0) {
        this.sendMethodProfiling(data.prof, data.profMeta);
    }
    return;
};
JsonSender.prototype.genELPayload = function genELPayload(dimensions_content,
    data, enginePayloadMeta) {
    var elPayload = [];
    for (let index = 0; data.EL_Arr && index < data.EL_Arr.length; index++) {
        const eventloop = data.EL_Arr[index];
        enginePayloadMeta.timestamp = new Date(eventloop.eventloop_timestamp).toISOString();
        elPayload.push(commonTools.merge([
            enginePayloadMeta, {
                metrics: {
                    averageEventLoopLatency: eventloop.eventloop_latencyAvg,
                    minimumEventLoopLatency: eventloop.eventloop_latencyMin,
                    maximumEventLoopLatency: eventloop.eventloop_latencyMax
                }
            }, {
                tags: commonTools.merge([dimensions_content,
                    { _componentType: 'eventLoop' }
                ])
            }
        ]));
    }

    for (let index = 0; data.Loop_Arr && index < data.Loop_Arr.length; index++) {
        const loop = data.Loop_Arr[index];
        enginePayloadMeta.timestamp = new Date(loop.loop_timestamp).toISOString();
        elPayload.push(commonTools.merge([
            enginePayloadMeta, {
                metrics: {
                    averageEventLoopTickTime: loop.loop_average,
                    maximumEventLoopTickTime: loop.loop_maximum,
                    minimumEventLoopTickTime: loop.loop_minimum,
                    loopCpuUser: loop.loop_cpu_user,
                    loopCpuSystem: loop.loop_cpu_system,
                    eventLoopTickCount: loop.loop_count
                }
            }, {
                tags: commonTools.merge([dimensions_content,
                    { _componentType: 'loop' }
                ])
            }
        ]));
    }

    return elPayload;
};
JsonSender.prototype.genGCPayload = function genGCPayload(dimensions_content,
    data, enginePayloadMeta) {
    var gcPayload = commonTools.merge([
        enginePayloadMeta, {
            metrics: {
                gcDuration: data.GC.gc_duration,
                scavengeGcCount: data.GC.gc_sCount,
                markSweepGcCount: data.GC.gc_mCount,
                incrementalMarkingGcCount: data.GC.gc_iCount,
                processWeakCallbacksGcCount: data.GC.gc_wCount,
                usedHeap: data.GC.gc_heapUsed,
                heapSize: data.GC.gc_heapSize
            }
        }, {
            tags: commonTools.merge([dimensions_content,
                { _componentType: 'garbageCollector' }
            ])
        }
    ]);
    return gcPayload;
};
JsonSender.prototype.genReqSumm = function genReqSumm(dimensions_content, data) {
    var requestSummary = {
        resourceID: process.env.KNJ_NODEAPPLICATIONRUNTIME_ID ? process.env.KNJ_NODEAPPLICATIONRUNTIME_ID : this.nodeAppRuntimeMD5String,
        tags: commonTools.merge([dimensions_content,
            { _componentType: 'requestSummary' }
        ]),
        metrics: commonTools.merge([{
            requestRate: data.appInfo.REQRATE,
            requestErrorRate: data.appInfo.requestErrorRate,
            averageResponseTime: data.appInfo.RESP_TIME,
            slowestResponseTime: data.appInfo.MAX_RSPTIME
        }, data.appInfo2])
    };
    return requestSummary;
};

JsonSender.prototype.genRequestSummaries = function genRequestSummaries(dimensions_content, data) {
    var requestsSummaryPayload = [];
    for (var index = 0; data.httpReq && index < data.httpReq.length; index++) {
        var req = data.httpReq[index];
        requestsSummaryPayload.push({
            resourceID: process.env.KNJ_NODEAPPLICATIONRUNTIME_ID ? process.env.KNJ_NODEAPPLICATIONRUNTIME_ID : this.nodeAppRuntimeMD5String,
            timestamp: new Date().toISOString(),
            tags: commonTools.merge([dimensions_content,
                {
                    applicationName: this.applicationName,
                    requestName: req['URL'],
                    requestMethod: req['METHOD'],
                    _componentType: 'requestsSummary'
                }
            ]),
            metrics: {
                averageServiceResponseTime: req['REQ_RESP_TIME'],
                throughput: req['HIT_COUNT'],
                errorRate: req['ERROR_RATE']
            }

        });
    }
    return requestsSummaryPayload;

};

JsonSender.prototype.genSysInfo = function genSysInfo(dimensions_content, data, enginePayloadMeta) {

    var sysInfo = commonTools.merge([
        enginePayloadMeta, {
            metrics: {
                sysCpuPercentage: data.computeInfo.os_sysCpuPercentage,
                sysMemoryAll: data.computeInfo.os_sysMemAll,
                sysMemoryUsed: data.computeInfo.os_sysMemUsed,
                sysMemoryFree: data.computeInfo.os_sysMemFree,
                cpuPercentage: data.appInfo.CPU_P,
                memoryRssSize: data.appInfo.MEM_RSS,
                memoryTotalSize: data.appInfo.app_memAll,
                virtualMemory: data.appInfo.virtualMemory,
                upTime: data.appInfo.UPTIME
            }
        }, {
            tags: commonTools.merge([dimensions_content,
                { _componentType: 'sysInfo' }
            ])
        }
    ]);
    return sysInfo;
};

JsonSender.prototype.getDataType = function getDataType() {
    return 'json';
};

JsonSender.prototype.sendAAR = function(req_inst) {
    logger.debug('json-sender.js', 'sendAAR');
    if (!(commonTools.testTrue(process.env.KNJ_ENABLE_TT)) &&
        process.env.KNJ_ENVTYPE === 'Cloudnative') {
        // send AAR from http request at resource level
        var interaction_info = {};
        if (req_inst.header && req_inst.requestHeader) {
            interaction_info =
                aarTools.extractInfoFromHeader(req_inst.header, req_inst.requestHeader);
        }
        interaction_info.method = req_inst.method;
        interaction_info.appName = req_inst.url;
        interaction_info.url = interaction_info.fullurl ||
            commonTools.getFullURL(req_inst.url, this.IP, commonTools.getServerPort(),
                interaction_info.protocol);

        var payload_json = {
            metrics: {
                status: req_inst.statusCode < 400 ? 'Good' : 'Failed',
                responseTime: req_inst.duration / 1000
            },
            properties: {
                // threadID: '0',
                documentType: '/AAR/Middleware/NODEJS',
                softwareServerType: 'http://open-services.net/ns/crtv#NodeJS',
                softwareModuleName: this.applicationName,
                resourceID: process.env.KNJ_NODEAPPLICATIONRUNTIME_ID ? process.env.KNJ_NODEAPPLICATIONRUNTIME_ID : this.nodeAppRuntimeMD5String,
                processID: process.pid,
                diagnosticsEnabled: commonTools.testTrue(process.env.KNJ_ENABLE_DEEPDIVE),
                applicationName: this.applicationName,
                serverName: this.app_hostname,
                serverAddress: this.IP,
                requestName: req_inst.url,
                componentName: this.isicp ? 'Node.JS Application' : 'Bluemix Node.JS Application',
                transactionName: req_inst.url,
                documentVersion: '2.0', // why?
                startTime: (new Date(req_inst.time)).toISOString(),
                finishTime: (new Date(req_inst.time + req_inst.duration)).toISOString(),
                documentID: uuid.v1()
            },
            interactions: []
        };
        if (process.env.HYBRID_BMAPPID && process.env.HYBRID_BMAPPID !== 'undefined') {
            payload_json.properties.originID = global.KNJ_BAM_ORIGINID;
        }
        if (this.isicp && this.serviceIds.length > 0) {
            payload_json.properties.serviceIds = this.serviceIds;
        } else if (this.isicp) {
            this.serviceIds = k8sutil.getServiceID();
        }
        restClient.sendAAR(payload_json, function(err) {
            if (err) {
                logger.error(err.message);
            }
        }, global.KNJ_AAR_BATCH_ENABLED);
    }

};

JsonSender.prototype.sendAARTT = function(data) {
    logger.debug('json-sender.js', 'sendAARTT');
    var payload_json = aarTools.composeAARTT(data, commonTools.getServerPort());

    restClient.sendAAR(payload_json, function(err) {
        if (err) {
            logger.error(err.message);
        }
    }, global.KNJ_AAR_BATCH_ENABLED);
};

JsonSender.prototype.sendADR = function(data) {
    logger.debug('json-sender.js', 'sendADR');
    var payload_json = {
        properties: {
            startTime: data.time,
            finishTime: Math.floor(data.time + data.duration),
            documentType: 'ADR/Middleware/NODEJS',
            contentType: 'methodTrace',
            documentID: uuid.v1(),
            reqType: data.type.toUpperCase(),
            methodEntries: commonTools.testTrue(process.env.KNJ_ENABLE_METHODTRACE) ?
                'true' : 'false',
            reqName: data.name
        },
        statistics: {
            summary: {
                responseTime: data.duration / 1000
            }
        }
    };

    payload_json.statistics.traceData = adrTools.composeTraceData([], data.request, 1);

    restClient.sendADR(payload_json, function(err) {
        if (err) {
            logger.error(err.message);
        }
    });
};

JsonSender.prototype.sendMethodProfiling = function(data, meta) {
    var payload_json = {
        properties: {
            startTime: meta.startTime,
            finishTime: meta.finishTime,
            documentType: 'ADR/Middleware/NODEJS',
            contentType: 'methodProfiling',
            documentID: uuid.v1()
        },
        statistics: {
            summary: {}
        }
    };
    var traceData = [];
    for (var i in data) {
        if (data.hasOwnProperty(i)) {
            traceData.push({
                count: data[i].profiling_count,
                name: data[i].profiling_name,
                line: data[i].profiling_line,
                file: data[i].profiling_file
            });
        }
    }
    payload_json.statistics.summary.profilingSampleCount = meta.count;
    payload_json.statistics.traceData = traceData;
    restClient.sendADR(payload_json, function(err) {
        if (err) {
            logger.error(err.message);
        }
    });
};
exports.jsonSender = new JsonSender();
