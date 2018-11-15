'use strict';

var HttpHeaders = require('./httpHeaders');

function appendZipkinHeaders(req, traceId) {
  var headers = req.headers || {};
  headers[HttpHeaders.TraceId] = traceId.traceId;
  headers[HttpHeaders.SpanId] = traceId.spanId;

  traceId._parentId.ifPresent(function (psid) {
    headers[HttpHeaders.ParentSpanId] = psid;
  });
  traceId.sampled.ifPresent(function (sampled) {
    headers[HttpHeaders.Sampled] = sampled ? '1' : '0';
  });

  return headers;
}

function addZipkinHeaders(req, traceId) {
  var headers = appendZipkinHeaders(req, traceId);
  return Object.assign({}, req, { headers: headers });
}

module.exports = {
  addZipkinHeaders: addZipkinHeaders
};