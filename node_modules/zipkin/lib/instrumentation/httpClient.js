'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Annotation = require('../annotation');
var Request = require('../request');

function requiredArg(name) {
  throw new Error('HttpClientInstrumentation: Missing required argument ' + name + '.');
}

var HttpClientInstrumentation = function () {
  function HttpClientInstrumentation(_ref) {
    var _ref$tracer = _ref.tracer,
        tracer = _ref$tracer === undefined ? requiredArg('tracer') : _ref$tracer,
        _ref$serviceName = _ref.serviceName,
        serviceName = _ref$serviceName === undefined ? requiredArg('serviceName') : _ref$serviceName,
        remoteServiceName = _ref.remoteServiceName;

    _classCallCheck(this, HttpClientInstrumentation);

    this.tracer = tracer;
    this.serviceName = serviceName;
    this.remoteServiceName = remoteServiceName;
  }

  _createClass(HttpClientInstrumentation, [{
    key: 'recordRequest',
    value: function recordRequest(request, url, method) {
      this.tracer.setId(this.tracer.createChildId());
      var traceId = this.tracer.id;

      this.tracer.recordServiceName(this.serviceName);
      this.tracer.recordRpc(method.toUpperCase());
      this.tracer.recordBinary('http.url', url);
      this.tracer.recordAnnotation(new Annotation.ClientSend());
      if (this.remoteServiceName) {
        // TODO: can we get the host and port of the http connection?
        this.tracer.recordAnnotation(new Annotation.ServerAddr({
          serviceName: this.remoteServiceName
        }));
      }

      return Request.addZipkinHeaders(request, traceId);
    }
  }, {
    key: 'recordResponse',
    value: function recordResponse(traceId, statusCode) {
      this.tracer.setId(traceId);
      this.tracer.recordBinary('http.status_code', statusCode.toString());
      this.tracer.recordAnnotation(new Annotation.ClientRecv());
    }
  }, {
    key: 'recordError',
    value: function recordError(traceId, error) {
      this.tracer.setId(traceId);
      this.tracer.recordBinary('error', error.toString());
      this.tracer.recordAnnotation(new Annotation.ClientRecv());
    }
  }]);

  return HttpClientInstrumentation;
}();

module.exports = HttpClientInstrumentation;