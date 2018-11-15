'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Header = require('../httpHeaders');

var _require = require('../option'),
    Some = _require.Some,
    None = _require.None;

var TraceId = require('../tracer/TraceId');
var Annotation = require('../annotation');

function stringToBoolean(str) {
  return str === '1';
}

function stringToIntOption(str) {
  try {
    return new Some(parseInt(str));
  } catch (err) {
    return None;
  }
}

function containsRequiredHeaders(readHeader) {
  return readHeader(Header.TraceId) !== None && readHeader(Header.SpanId) !== None;
}

function requiredArg(name) {
  throw new Error('HttpServerInstrumentation: Missing required argument ' + name + '.');
}

var HttpServerInstrumentation = function () {
  function HttpServerInstrumentation(_ref) {
    var _ref$tracer = _ref.tracer,
        tracer = _ref$tracer === undefined ? requiredArg('tracer') : _ref$tracer,
        _ref$serviceName = _ref.serviceName,
        serviceName = _ref$serviceName === undefined ? requiredArg('serviceName') : _ref$serviceName,
        _ref$port = _ref.port,
        port = _ref$port === undefined ? requiredArg('port') : _ref$port;

    _classCallCheck(this, HttpServerInstrumentation);

    this.tracer = tracer;
    this.serviceName = serviceName;
    this.port = port;
  }

  _createClass(HttpServerInstrumentation, [{
    key: '_createIdFromHeaders',
    value: function _createIdFromHeaders(readHeader) {
      if (containsRequiredHeaders(readHeader)) {
        var spanId = readHeader(Header.SpanId);
        return spanId.map(function (sid) {
          var traceId = readHeader(Header.TraceId);
          var parentSpanId = readHeader(Header.ParentSpanId);
          var sampled = readHeader(Header.Sampled);
          var flags = readHeader(Header.Flags).flatMap(stringToIntOption).getOrElse(0);
          return new TraceId({
            traceId: traceId,
            parentId: parentSpanId,
            spanId: sid,
            sampled: sampled.map(stringToBoolean),
            flags: flags
          });
        });
      } else {
        if (readHeader(Header.Flags) !== None) {
          var currentId = this.tracer.id;
          var idWithFlags = new TraceId({
            traceId: currentId.traceId,
            parentId: currentId.parentId,
            spanId: currentId.spanId,
            sampled: currentId.sampled,
            flags: readHeader(Header.Flags)
          });
          return new Some(idWithFlags);
        } else {
          return new Some(this.tracer.createRootId());
        }
      }
    }
  }, {
    key: 'recordRequest',
    value: function recordRequest(method, requestUrl, readHeader) {
      var _this = this;

      this._createIdFromHeaders(readHeader).ifPresent(function (id) {
        return _this.tracer.setId(id);
      });
      var id = this.tracer.id;

      this.tracer.recordServiceName(this.serviceName);
      this.tracer.recordRpc(method.toUpperCase());
      this.tracer.recordBinary('http.url', requestUrl);
      this.tracer.recordAnnotation(new Annotation.ServerRecv());
      this.tracer.recordAnnotation(new Annotation.LocalAddr({ port: this.port }));

      if (id.flags !== 0 && id.flags != null) {
        this.tracer.recordBinary(Header.Flags, id.flags.toString());
      }
      return id;
    }
  }, {
    key: 'recordResponse',
    value: function recordResponse(id, statusCode, error) {
      this.tracer.setId(id);
      this.tracer.recordBinary('http.status_code', statusCode.toString());
      if (error) {
        this.tracer.recordBinary('error', error.toString());
      }
      this.tracer.recordAnnotation(new Annotation.ServerSend());
    }
  }]);

  return HttpServerInstrumentation;
}();

module.exports = HttpServerInstrumentation;