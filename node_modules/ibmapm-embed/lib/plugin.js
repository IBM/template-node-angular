// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0

var metricManager = require('./metric-manager.js').metricManager;
var config = require('./config.js');
var commonTools = require('./tool/common');
// initialize configuration - begin
var cfg = config.init();
var requestConfig = {
    minClockTrace: cfg.deepDive.minClockTrace,
    minCpuTrace: cfg.deepDive.minCpuTrace,
    minCpuStack: cfg.deepDive.minCpuStack,
    minClockStack: cfg.deepDive.minClockStack
};
// initialize configuration - end

var requestManager = require('./request-manager.js').requestManager;
var healthcenter = global.Appmetrics || require('appmetrics');

var MonitoringPlugin = function() {
    // MonitoringPlugin class
};

MonitoringPlugin.prototype.init = function(envType) {
    process.env.KNJ_ENVTYPE = envType;

    metricManager.start(envType);

    if (commonTools.testTrue(process.env.KNJ_ENABLE_PROFILING)) {
        // enable profiling based on user's environment variables
        healthcenter.enable('profiling');
    }

    if (envType === 'SaaS') { // for Saas/onPremise
        if (commonTools.testTrue(process.env.KNJ_ENABLE_DEEPDIVE)) {
            process.env.KNJ_ENABLE_DEEPDIVE = true;
            healthcenter.enable('requests', requestConfig);
            if (commonTools.testTrue(process.env.KNJ_ENABLE_METHODTRACE)) {
                process.env.KNJ_ENABLE_METHODTRACE = true;
                healthcenter.enable('trace');
            }
        }
        if (typeof (cfg.deepDive.filters) !== 'undefined') {
            healthcenter.setConfig('http', cfg.filters);
        }
        if (process.env.KNJ_ENABLE_DEEPDIVE) {
            requestManager.start(envType);
        }
    } else { // for Bluemix & Cloudnative
        if (process.env.APM_BM_SECURE_GATEWAY || process.env.APM_BM_GATEWAY_URL ||
            process.env.MONITORING_SERVER_TYPE === 'BI') { // Bluemix
            process.env.KNJ_ENABLE_DEEPDIVE = true;
            healthcenter.enable('requests', requestConfig);
            // healthcenter.enable('trace');
            if (!commonTools.testTrue(process.env.KNJ_DISABLE_METHODTRACE)) {
                process.env.KNJ_ENABLE_METHODTRACE = true;
                healthcenter.enable('trace');
            }
            requestManager.start(envType);
            if (commonTools.testTrue(process.env.KNJ_ENABLE_TT)) {
                process.env.KNJ_ENABLE_TT = true;
            }
        } else {
            if (commonTools.testTrue(process.env.KNJ_ENABLE_METHODTRACE)) {
                process.env.KNJ_ENABLE_DEEPDIVE = true;
                process.env.KNJ_ENABLE_METHODTRACE = true;
                healthcenter.enable('requests', requestConfig);
                healthcenter.enable('trace');
                requestManager.start(envType);
                if (commonTools.testTrue(process.env.KNJ_ENABLE_TT)) {
                    process.env.KNJ_ENABLE_TT = true;
                }
            } else if (commonTools.testTrue(process.env.KNJ_ENABLE_DEEPDIVE)) {
                process.env.KNJ_ENABLE_DEEPDIVE = true;
                healthcenter.enable('requests', requestConfig);
                requestManager.start(envType);
                if (commonTools.testTrue(process.env.KNJ_ENABLE_TT)) {
                    process.env.KNJ_ENABLE_TT = true;
                }
            } else if (commonTools.testTrue(process.env.KNJ_ENABLE_TT)) {
                process.env.KNJ_ENABLE_TT = true;
                // TODO, need a more detailed enable level, DB only
                healthcenter.enable('requests', requestConfig);
                healthcenter.enable('trace');
                requestManager.start(envType);
            }
        }
    }
    config.update(cfg);
};

exports.monitoringPlugin = new MonitoringPlugin();
