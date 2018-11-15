// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0

var result = {};
var properties = {};
var metrics = {};
var interactions = [];


function wraper(payload, option){
    initialize(payload, option);
    return JSON.stringify(result);
}

function initialize(payload, option){
    addProperties(option);
    addMetrics(payload);
    addInteractions();
    result['properties'] = properties;
    result['metrics'] = metrics;
    result['interactions'] = interactions;
}

function addProperties(option){
    properties['callerID'] = 'NodeJSDC';
    properties['documentID'] = 'dfe_data';
    properties['documentType'] = '/RAW/Diagnostic/REQUEST';
    properties['documentVersion'] = '1.0';
    properties['finishTime'] = option.start;
    properties['startTime'] = option.end;
    properties['method'] = 'POST';
    properties['originID'] = '1a2s3d4f5g';
    properties['tenantID'] = 'Not Implemented';
    properties['sourceIPAddress'] = option.ipaddr;
    properties['fileSuffix'] = '.jso.gz';
    properties['fileName'] = 'dfe_data';
    properties['runtimeDirName'] = process.env.VCAP_APPLICATION ?
        JSON.parse(process.env.VCAP_APPLICATION).instance_id : '';
    properties['ipaddr'] = option.ipaddr;
    properties['datatype'] = 'request';
}

function addMetrics(payload){
    metrics['diagpayload'] = new Buffer(payload).toString('base64');

}

function addInteractions(){
    // no interactions by now
}
exports.wraper = wraper;
