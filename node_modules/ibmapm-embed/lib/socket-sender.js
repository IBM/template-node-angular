// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0

var net = require('net');
var fs = require('fs');
var log4js = require('log4js');
var logger = log4js.getLogger('knj_log');

var portFile = '/knj_cps.properties';
var PORT_PREFIX = 'CP_PORT';

function SocketSender() {
    this.propertiesFolder = undefined;
    this.socketPort = undefined;
}

SocketSender.prototype.getSocketPort = function getSocketPort() {

    if (process.env.TMP) {
        this.propertiesFolder = process.env.TMP;
    } else {
        this.propertiesFolder = '/tmp';
    }

    try {
        var content = fs.readFileSync(this.propertiesFolder + portFile);
        var lines = content.toString().split('\n');
        var lineContainPort;
        for (var lineNum = 0; lineNum < lines.length; lineNum++) {
            var line = lines[lineNum];
            if (line.indexOf(PORT_PREFIX) !== -1) {
                lineContainPort = line;
                break;
            }
        }
        var port = lineContainPort.split('=')[1];
        this.socketPort = port;
        logger.debug('port number: ' + port);
    } catch (err) {
        this.socketPort = undefined;
        logger.error('got error in SocketSender::getSocketPort(): ' + err);
        return;
    }
};

SocketSender.prototype.send = function(data, callback) {

    if (data === undefined) {
        return;
    }
    var self = this;
    if (self.socketPort === undefined) {
        return;
    }

    var client = net.connect(self.socketPort,
        function() {
            client.write(data, function() {
                client.end();
                callback();
            });
        });

    client.on('error', function(e) {
        callback(e);
    });
};

SocketSender.prototype.getDataType = function getDataType() {
    return 'xml';
};

exports.socketSender = new SocketSender();
