// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0

var fs = require('fs');
var Metric = require('./metric');
var metricSender = require('./metric-sender').metricSender;
var socketSender = require('./socket-sender').socketSender;
var jsonSender = require('./json-sender').jsonSender;
var log4js = require('log4js');
var logger = log4js.getLogger('knj_log');
var commonTools = require('./tool/common');
var Config = require('./config');

function MetricManager() {
    // this interval is half of data collection interval
    this.interval = 30;

    this.timer = undefined;
    this.wake_up = 0;
    this.getMetric();
    this.watchingFile = false;
}

MetricManager.prototype.readConfig = function readConfig() {
    // refresh config from file
    if (this.metric.port || this.envType === 'CloudOE' || this.envType === 'Cloudnative') {
        var confFile = __dirname +
            (this.metric.port ?
                ('/../plugin_' + this.metric.port + '_conf.json') : '/../plugin_conf.json');
        var config;
        logger.debug(confFile);
        try {
            var confString = fs.readFileSync(confFile, 'utf8');
            config = JSON.parse(confString);
            logger.debug('plugin_config:', config);
        } catch (e) {
            if (e.code === 'ENOENT' && e.path) {
                logger.info('File is not generated yet: ' + e.path);
                logger.info('Configuration file will be genrated in one minute.');
                logger.info('Otherwise, please check if agent is started');
            } else {
                logger.error('config error: ' + e);
            }
            config = undefined;
        }
        // trigger an update of the config
        Config.update(config);

        this.metric.config = config;

        var self = this;
        if (config) {
            fs.watchFile(confFile, { persistent: false, interval: self.interval },
                function(pre, curr) {
                    var configTmp;
                    try {
                        var confString = fs.readFileSync(confFile, 'utf8');
                        configTmp = JSON.parse(confString);
                        logger.debug('plugin_config:', configTmp);
                    } catch (e) {
                        logger.error('config error: ' + e);
                        configTmp = undefined;
                    }
                    Config.update(configTmp);
                    self.metric.config = Config.getConfig();
                });
            this.watchingFile = true;
        }

    } else {
        logger.error('MetricManager::readConfig(): did not get port, skip this time.');
        return;
    }
};

MetricManager.prototype.start = function(envType) {
    this.envType = envType;
    var self = this;

    if (envType === 'CloudOE' || envType === 'Cloudnative') {
        // don't need to wait for plugin_xxx_conf.json
        if (!self.watchingFile) {
            self.readConfig();
        }
        jsonSender.init(envType);
        // initial metrics dispatch to minimize time-to-value in CloudOE
        self.metric.collectRunTimeInfo(function sendData() {
            metricSender.send(self.metric, jsonSender);
            self.metric.reset();
        });
    }

    this.timer = setInterval(function doThings() {
        if (!commonTools.testTrue(process.env.ITCAM_DC_ENABLED)) {
            return;
        }
        if (self.metric && self.wake_up % 2 >>> 0 === 0) { // collect data
            self.metric.collectRunTimeInfo();
            if (envType === 'SaaS') {
                socketSender.getSocketPort();
                if (!self.watchingFile) {
                    self.readConfig();
                }
            }
        } else {
            metricSender.send(self.metric,
                (self.envType === 'CloudOE' ||
                    self.envType === 'Cloudnative') ? jsonSender : socketSender);
            self.metric.reset();
        }

        self.wake_up++;

    }, this.interval * 1000);

    this.timer.unref();
};

MetricManager.prototype.stop = function() {
    if (this.timer) {
        clearInterval(this.timer);
    }
};

MetricManager.prototype.getMetric = function() {
    if (!this.metric) {
        this.createMetric();
    }
    return this.metric;
};

MetricManager.prototype.createMetric = function() {
    this.metric = new Metric(this.interval);
};

exports.metricManager = new MetricManager();
