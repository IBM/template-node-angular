// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0
process.env.KNJ_LOG_TO_CONSOLE = true;
process.env.KNJ_LOG_LEVEL = 'all';
process.env.KNJ_CONFIG_FILE = 'lib/test/test-config.json';
process.env.KNJ_RESTCLIENT_MAX_RETRY = 0;
var assert = require('chai').assert;
var restClient = require('../../ibmapm-restclient/lib/restclient/httpsender.js');
var uuid = require('uuid');
var cryptoutil = require('../../ibmapm-restclient/lib/plugins/cryptoutil');
var HttpsProxyAgent = require('https-proxy-agent');
var jsonSender = require('../json-sender').jsonSender;
var metricManager = require('../metric-manager.js').metricManager;
var jso = require('../jso');
var plugin = require('../plugin.js').monitoringPlugin;

function testTrue(v) {
    return (v && ['false', 'False', 'FALSE', ''].indexOf(v) < 0);
}

var metricPayload = {

    resourceID: '7f1ca33361539d310445f08bba75ccd8',
    tags: {
        _componentType: 'noderuntime'
    },
    timestamp: '2017-09-06T03:21:22.686Z',
    metrics: {
        gcDuration: 28,
        scavengeGcCount: 5,
        markSweepGcCount: 3,
        usedHeap: 1,
        heapSize: 3
    }

};
var dcRegPayload = {
    id: '5c8980b95a4aa364721f25ebb5b107b9',
    type: ['provider'],
    startedTime: '2017-08-24T03:57:05.733Z',
    properties: {
        name: 'NodeJSDC',
        version: '0.10.0.1',
        monitoringLevel: 'L1',
        diagnosticsEnabled: 'true',
        methodTracingEnabled: undefined
    }
};
var res1RegPayload = {
    id: '08b65bd8f7b0e77f3ce6951b4a23cc89',
    type: ['applicationInstance'],
    properties: {
        startedTime: '2017-08-24T03:57:05.733Z',
        name: 'nodedc:0',
        instance_index: 0,
        instance_id: '17f42f65-47c5-48a2-713d-790c'
    },
    references: [{
        direction: 'to',
        type: 'runsOn',
        id: '153f281ddc8c3a3084fc7e594e943bec'
    },
    {
        direction: 'to',
        type: 'federates',
        id: '2e1f72c3-81f1-41a9-a8c0-1233cc712937'
    },
    {
        direction: 'to',
        type: 'implements',
        id: '66e449b131498a39e9bbae3e13574972'
    },
    {
        direction: 'to',
        type: 'dependsOn',
        id: 'a6afa13b9dbc7c6046f08fba235bd714'
    }
    ]
};
var res2RegPayload = {
    id: '66e449b131498a39e9bbae3e13574972',
    type: ['serviceEndpoint'],
    properties: { uri: 'nodedc.stage1.mybluemix.net:8080', name: 'nodedc' }
};


var aarPayload = {
    properties: {
        documentType: '/AAR/Middleware/NODEJS',
        softwareServerType: 'http://open-services.net/ns/crtv#NodeJS',
        softwareModuleName: 'abc',
        resourceID: '5c8980b95a4aa364721f25ebb5b107b9',
        processID: process.pid,
        diagnosticsEnabled: testTrue(process.env.KNJ_ENABLE_DEEPDIVE),
        applicationName: 'abc',
        serverName: 'hostname',
        serverAddress: '9.98.38.144',
        requestName: '/a/b/c',
        documentVersion: '2.0', // why?
        startTime: (new Date()).toISOString(),
        finishTime: (new Date()).toISOString(),
        documentID: uuid.v1()
    },
    metrics: {
        status: 'Good',
        responseTime: 100
    }
};

var request = {
    time: (new Date()).getTime(),
    type: 'http',
    duration: 20,
    request: {
        context: {
            statusCode: 200
        },
        timer: {
            startTimeMillis: (new Date()).getTime(),
            timeDelta: 20,
            cpuTimeDelta: 10
        }
    }

};

before(function() {
    global.KNJ_BAM_APPLICATION_TOPIC = 'applications';
    global.KNJ_BAM_ORIGINID = 'defaultProvider';
    plugin.init('Cloudnative');
    restClient.setConfiguration('./test/test-config.json', null);
});

before(function() {
    var proxyAgent = new HttpsProxyAgent('http://9.181.138.247:8085');
    assert.isNotNull(proxyAgent);
});

before(function() {
    jsonSender.init('CloudOE');
    jsonSender.init('Cloudnative');
});

before(function() {
    metricManager.start('CloudOE');
    metricManager.start('Cloudnative');
    metricManager.getMetric();
    jso.open();
});
describe('Configuration', function() {

    describe('#getConfiguration()', function() {

        it('configuration items should be correct', function() {
            assert.equal('6defb2b3-4e44-463b-9731-09c64e7fdb67', restClient
                .getConfiguration().tenantID);
            assert.equal('metric', restClient.getConfiguration().metrics);
            assert.equal('aar/middleware', restClient.getConfiguration().AAR);
            assert.equal('adr/middleware', restClient.getConfiguration().ADR);
        });
    });

});

describe('Register items', function() {
    describe('#registerDC and resource', function() {
        it('register a single dc', function(done) {
            restClient.registerDC(dcRegPayload, null);
            done();
        });
        it('register a single resource', function(done) {
            restClient.registerResource(res1RegPayload, null);
            done();
        });
        it('register another single resource', function(done) {
            restClient.registerResource(res2RegPayload, null);
            done();
        });
    });
});

describe('SendMetric', function() {
    it('sendmetric should be done', function(done) {
        restClient.sendMetrics(metricPayload, null);
        done();
    });
});
process.env.KNJ_AAR_BATCH_COUNT = 1;
describe('SendAAR', function() {
    it('SendAAR should be done', function(done) {
        restClient.sendAAR(aarPayload, null);
        done();
    });

    it('SendAARTT should be done', function(done) {
        jsonSender.sendAARTT(request);
        done();
    });


    it('SendADR should be done', function(done) {
        jsonSender.sendADR(request);
        done();
    });
});

describe('cryptoutil', function() {
    it('cryptoutil should be done', function() {
        cryptoutil.initkey('7b38e401-2403-428c-8b13-1fcb546e3ece');
        var unobf = cryptoutil.unobfuscate('tFMSNp0v3Jct2yQqc5/RKn/2vq/StZzZoM7FGW+ZEyFGFAl' +
            'K1QAeLMuUrFZ9hOPlLC5q02mHLNnFjD78ai7WW+I08JFjtXHDmL3oDPmkepo=');
        var obf = cryptoutil.obfuscate('kttru5o4so2addjgt4jlslkadg1sdbnj' +
            'epv99qgdsdhfskaldaaufi5q48e4ndse');
        assert.equal(unobf, 'kttru5o4so2addjgt4jlslkadg1sdbnjepv99qgdsdhfskaldaaufi5q48e4ndse');
        assert.equal(obf, 'tFMSNp0v3Jct2yQqc5/RKn/2vq/StZzZoM7FGW+ZEyFGFAlK1QAeLMuUrFZ9hOP' +
            'lLC5q02mHLNnFjD78ai7WW+I08JFjtXHDmL3oDPmkepo=');
    });

});
