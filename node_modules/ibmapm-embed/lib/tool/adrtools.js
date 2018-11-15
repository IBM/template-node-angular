// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: ibmapm
// This file is licensed under the Apache License 2.0.
// License text available at https://opensource.org/licenses/Apache-2.0
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

function composeTraceData(traceData, request, level) {
    var trace = {
        startTime: request.timer.startTimeMillis,
        finishTime: Math.floor(request.timer.startTimeMillis + request.timer.timeDelta),
        seq: level,
        reqUid: request.id,
        reqType: request.type ? request.type.toUpperCase() : 'Method',
        reqName: request.name,
        responseTime: Math.floor(request.timer.timeDelta),
        st: request.stack,
        reqContext: []
    };

    if (request.timer.cpuTimeDelta >= 0) {
        trace.cpuTime = request.timer.cpuTimeDelta;
    }

    if (request.context && (dbTypes.indexOf(trace.reqType) < 0 || global.SECURITY_OFF)) {
        for (var key in request.context) {
            if ((key !== 'requestHeader') || global.SECURITY_OFF) {
                trace.reqContext.push({
                    key: key,
                    value: request.context[key]
                });
            }
        }
    }

    traceData.push(trace);

    if (request.children && request.children instanceof Array) {
        for (var i = 0; i < request.children.length; i++) {
            composeTraceData(traceData, request.children[i], level + 1);
        }
    }

    return traceData;
}

exports.composeTraceData = composeTraceData;
