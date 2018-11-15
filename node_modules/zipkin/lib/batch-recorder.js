'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('./time'),
    now = _require.now,
    hrtime = _require.hrtime;

var _require2 = require('./model'),
    Span = _require2.Span,
    Endpoint = _require2.Endpoint;

function PartialSpan(traceId) {
  this.traceId = traceId;
  this.startTimestamp = now();
  this.startTick = hrtime();
  this.delegate = new Span(traceId);
  this.localEndpoint = new Endpoint({});
}
PartialSpan.prototype.finish = function finish() {
  if (this.endTimestamp) {
    return;
  }
  this.endTimestamp = now(this.startTimestamp, this.startTick);
};

var BatchRecorder = function () {
  function BatchRecorder(_ref) {
    var _this = this;

    var logger = _ref.logger,
        _ref$timeout = _ref.timeout,
        timeout = _ref$timeout === undefined ? 60 * 1000000 : _ref$timeout;

    _classCallCheck(this, BatchRecorder);

    this.logger = logger;
    this.timeout = timeout;
    this.partialSpans = new Map();

    // read through the partials spans regularly
    // and collect any timed-out ones
    var timer = setInterval(function () {
      _this.partialSpans.forEach(function (span, id) {
        if (_this._timedOut(span)) {
          _this._writeSpan(id);
        }
      });
    }, 1000);
    if (timer.unref) {
      // unref might not be available in browsers
      timer.unref(); // Allows Node to terminate instead of blocking on timer
    }
  }

  _createClass(BatchRecorder, [{
    key: '_writeSpan',
    value: function _writeSpan(id) {
      var span = this.partialSpans.get(id);
      // ready for garbage collection
      this.partialSpans.delete(id);

      var spanToWrite = span.delegate;
      spanToWrite.setLocalEndpoint(span.localEndpoint);
      if (span.endTimestamp) {
        spanToWrite.setTimestamp(span.startTimestamp);
        spanToWrite.setDuration(span.endTimestamp - span.startTimestamp);
      }
      this.logger.logSpan(spanToWrite);
    }
  }, {
    key: '_updateSpanMap',
    value: function _updateSpanMap(id, updater) {
      var span = void 0;
      if (this.partialSpans.has(id)) {
        span = this.partialSpans.get(id);
      } else {
        span = new PartialSpan(id);
      }
      updater(span);
      if (span.endTimestamp) {
        this._writeSpan(id);
      } else {
        this.partialSpans.set(id, span);
      }
    }
  }, {
    key: '_timedOut',
    value: function _timedOut(span) {
      return span.startTimestamp + this.timeout < now();
    }
  }, {
    key: 'record',
    value: function record(rec) {
      var id = rec.traceId;

      this._updateSpanMap(id, function (span) {
        switch (rec.annotation.annotationType) {
          case 'ClientSend':
            span.delegate.setKind('CLIENT');
            break;
          case 'ClientRecv':
            span.finish();
            span.delegate.setKind('CLIENT');
            break;
          case 'ServerSend':
            span.finish();
            span.delegate.setKind('SERVER');
            break;
          case 'ServerRecv':
            // TODO: only set this to false when we know we in an existing trace
            span.delegate.setShared(id.parentId !== id.spanId);
            span.delegate.setKind('CLIENT');
            break;
          case 'Message':
            span.delegate.addAnnotation(rec.timestamp, rec.annotation.message);
            break;
          case 'Rpc':
            span.delegate.setName(rec.annotation.name);
            break;
          case 'ServiceName':
            span.localEndpoint.setServiceName(rec.annotation.serviceName);
            break;
          case 'BinaryAnnotation':
            span.delegate.putTag(rec.annotation.key, rec.annotation.value);
            break;
          case 'LocalAddr':
            span.localEndpoint.setIpv4(rec.annotation.host && rec.annotation.host.ipv4());
            span.localEndpoint.setPort(rec.annotation.port);
            break;
          case 'ServerAddr':
            span.delegate.setKind('CLIENT');
            span.delegate.setRemoteEndpoint(new Endpoint({
              serviceName: rec.annotation.serviceName,
              ipv4: rec.annotation.host && rec.annotation.host.ipv4(),
              port: rec.annotation.port
            }));
            break;
          default:
            break;
        }
      });
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'BatchRecorder()';
    }
  }]);

  return BatchRecorder;
}();

module.exports = BatchRecorder;