'use strict';
// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0
var k8sutil = require('ibmapm-restclient').getK8stool();
var crypto = require('crypto');
var isbase64 = false;
var log4js = require('log4js');
var logger = log4js.getLogger('knj_log');
exports.testTrue = function(v) {
    if (v && ['false', 'False', 'FALSE', ''].indexOf(v) < 0) {
        return true;
    } else {
        return false;
    }
};

exports.transferTimezoneToString = function(zone) {
    var result = '';
    if (zone > 0) {
        result += '-';
    } else {
        result += '+';
    }
    var pureZone = Math.abs(zone);
    var intZone = Math.floor(pureZone);
    if (intZone >= 10) {
        result += (intZone + ':');
    } else {
        result += ('0' + intZone + ':');
    }
    if (pureZone - intZone) {
        result += '30';
    } else {
        result += '00';
    }
    return result;
};

exports.getFullURL = function(url, ip, port, protocol) {
    var result = '';
    if (!url) {
        return result;
    }
    if (url.indexOf('http') === 0) {
        result = url;
    } else if (protocol && protocol.indexOf('HTTPS') === 0) {
        result += ('https://' + ip + (port ? ':' + port : '') + url);
    } else {
        result += ('http://' + ip + (port ? ':' + port : '') + url);
    }

    return result;
};

exports.merge = function(jsonArray) {
    var jsonMerged = {};
    for (var x = 0; jsonArray && x < jsonArray.length; x++) {
        var json = jsonArray[x];
        var jsonKeys = Object.keys(json);
        for (var i = 0; jsonKeys && i < jsonKeys.length; i++) {
            var key = jsonKeys[i];
            jsonMerged[key] = json[key];
        }
    }
    return jsonMerged;
};

exports.appIDDecBluemix = function(postData) {
    var MAX_NAME_LENGTH = 9;
    var MAX_MSN_LENGTH = 25;
    var appGuid = postData.APP_GUID;
    var pref;
    if (process.env.VCAP_APPLICATION) {
        // The app is running on bluemix.
        pref = postData.APP_NAME;
    }
    if (k8sutil.isICP()) {
        pref = postData.APP_NAME + '_' + k8sutil.getNamespace() + '_' + k8sutil.getPodName();
        appGuid = crypto.createHash('md5').update(pref);
    }
    if (pref && pref.length > MAX_NAME_LENGTH) {
        pref = pref.substr(0, MAX_NAME_LENGTH);
    }
    appGuid = pref + '_' + appGuid;
    if (appGuid > MAX_MSN_LENGTH) {
        appGuid = appGuid.substr(0, MAX_MSN_LENGTH);
    }
    postData.APP_GUID = appGuid;
    return postData;
};

exports.combineArr = function(arr1, sep, arr2) {
    var ret = [];
    for (var index = 0; index < arr1.length; index++) {
        var element = arr1[index];
        for (var index1 = 0; index1 < arr2.length; index1++) {
            var element1 = arr2[index1];
            ret.push(element + sep + element1);
        }
    }
    return ret;
};

exports.appGuidDec = function(appGuid, appName) {
    logger.debug('common.js', 'appGuidDec', appGuid, appName);
    var MAX_NAME_LENGTH = 19;
    var MAX_MSN_LENGTH = 25;
    var retappGuid = appGuid;
    var pref;
    if (process.env.VCAP_APPLICATION) {
        // The app is running on bluemix.
        pref = appName;
    }
    if (k8sutil.isICP()) {
        pref = appName + '_' + k8sutil.getNamespace() + '_' + k8sutil.getPodName();
        retappGuid = crypto.createHash('md5').update(pref).digest('hex');
    }
    if (pref && pref.length > MAX_NAME_LENGTH) {
        pref = pref.substr(0, MAX_NAME_LENGTH);
    }
    retappGuid = pref + '_' + retappGuid;
    if (retappGuid.length > MAX_MSN_LENGTH) {
        retappGuid = retappGuid.substr(0, MAX_MSN_LENGTH);
    }
    return retappGuid;
};
exports.enableTrace = function(appmetrics) {
    if ((process.env.MONITORING_SERVER_TYPE === 'BI' &&
            !this.testTrue(process.env.KNJ_DISABLE_METHODTRACE)) ||
        (this.testTrue(process.env.KNJ_ENABLE_TT) ||
            this.testTrue(process.env.KNJ_ENABLE_METHODTRACE) ||
            this.testTrue(process.env.KNJ_ENABLE_DEEPDIVE))) {
        appmetrics.enable('trace');
    }
};
exports.envDecrator = function() {
    // Sometimes we need to change the name of some environment variables to consistant all of DC.
    // But we also need have downward compatible, so will keep the old environment variables.
    // User maybe set the env as secret in the K8S.
    // But there is no good method to detect if the value is base64 format.
    if (!process.env.ITCAM_DC_ENABLED) {
        process.env.ITCAM_DC_ENABLED = true;
    }
    logger.debug(process.env);
    if (process.env.KNJ_AAR_BATCH_ENABLED &&
        process.env.KNJ_AAR_BATCH_ENABLED.toLowerCase() === 'true') {
        global.KNJ_AAR_BATCH_ENABLED = true;
    } else {
        global.KNJ_AAR_BATCH_ENABLED = false;
    }
    if (process.env.APM_BM_GATEWAY_URL) {
        process.env.IBM_APM_SERVER_URL = process.env.APM_BM_GATEWAY_URL;
    }
    if (process.env.IBM_APM_SERVER_URL) {
        isbase64 = isBase64Url(process.env.IBM_APM_SERVER_URL);
        process.env.IBM_APM_SERVER_URL = isbase64 ?
            new Buffer(process.env.IBM_APM_SERVER_URL, 'base64').toString() :
            process.env.IBM_APM_SERVER_URL;

        process.env.APM_BM_GATEWAY_URL = process.env.IBM_APM_SERVER_URL;
    }
    if (process.env.IBM_APM_KEYFILE) {
        process.env.APM_KEYFILE = isbase64 ?
            new Buffer(process.env.IBM_APM_KEYFILE, 'base64').toString() :
            process.env.IBM_APM_KEYFILE;
    }
    if (process.env.IBM_APM_KEYFILE_URL) {
        process.env.APM_KEYFILE_URL = isbase64 ?
            new Buffer(process.env.IBM_APM_KEYFILE_URL, 'base64').toString() :
            process.env.IBM_APM_KEYFILE_URL;
    }
    if (process.env.IBM_APM_KEYFILE_PASSWORD) {
        process.env.APM_KEYFILE_PSWD = isbase64 ?
            new Buffer(process.env.IBM_APM_KEYFILE_PASSWORD, 'base64').toString() :
            process.env.IBM_APM_KEYFILE_PASSWORD;

    }
    if (process.env.IBM_APM_SERVER_INGRESS_URL) {
        isbase64 = isBase64Url(process.env.IBM_APM_SERVER_INGRESS_URL);
        process.env.IBAM_INGRESS_URL = isbase64 ?
            new Buffer(process.env.IBM_APM_SERVER_INGRESS_URL, 'base64').toString() :
            process.env.IBM_APM_SERVER_INGRESS_URL;
    }

    if (k8sutil.isICP() && !process.env.IBAM_INGRESS_URL && k8sutil.getIngressUrl()) {
        process.env.IBAM_INGRESS_URL = k8sutil.getIngressUrl();
    }

    if (process.env.IBM_APM_ACCESS_TOKEN) {
        process.env.IBAM_TOKEN = isbase64 ?
            new Buffer(process.env.IBM_APM_ACCESS_TOKEN, 'base64').toString() :
            process.env.IBM_APM_ACCESS_TOKEN;
    }

    if (process.env.APM_TENANT_ID) {
        process.env.IBAM_TENANT_ID = process.env.APM_TENANT_ID;
    }
};

function isBase64Url(httpurl) {
    if (!isURL(httpurl)) {
        return true;
    }
    return false;
}

function isURL(turl) {
    // The regex will hang, when handle a base64 string.
    // var strRegex = '^((https|http|ftp|rtsp|mms)?://)' +
    //     '?(([0-9a-z_!~*\'().&=+$%-]+: )?[0-9a-z_!~*\'().&=+$%-]+@)?' +
    //     '(([0-9]{1,3}.){3}[0-9]{1,3}' +
    //     '|' +
    //     '([0-9a-z_!~*\'()-]+.)*' +
    //     '([0-9a-z][0-9a-z-]{0,61})?[0-9a-z].' +
    //     '[a-z]{2,6})' +
    //     '(:[0-9]{1,4})?' +
    //     '((/?)|' +
    //     '(/[0-9a-z_!~*\'().;?:@&=+$,%#-]+)+/?)$';
    // var ret = new RegExp(strRegex);
    // if (ret.test(turl.toLowerCase())) {
    //     return true;
    // } else {
    //     return false;
    // }
    return turl.toLowerCase().startsWith('http');
}

exports.getServerPort = function() {
    const handles = global.process._getActiveHandles();
    let port = process.env.PORT || process.env.VCAP_APP_PORT ||
        process.env.VMC_APP_PORT || 'unknown';
    handles.forEach(function(handle) {
        if (handle.hasOwnProperty('_connectionKey')) {
            const connkey = handle._connectionKey;
            const conns = connkey.split(':');
            port = conns[conns.length - 1];
        }
    });
    return port;
};

exports.tlsFix8 = function(options) {
    var nodever = process.version;
    if (options.protocol === 'https:' && nodever.startsWith('v8.')) {
        logger.debug('Current node version is ', nodever,
            ', the options.ecdhCurve should be set to auto.');
        options.ecdhCurve = 'auto';

    }
};
