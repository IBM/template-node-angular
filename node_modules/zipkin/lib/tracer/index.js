'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('../option'),
    None = _require.None,
    Some = _require.Some,
    fromNullable = _require.fromNullable;

var _require2 = require('./sampler'),
    Sampler = _require2.Sampler,
    alwaysSample = _require2.alwaysSample;

var Annotation = require('../annotation');
var Record = require('./record');
var TraceId = require('./TraceId');
var randomTraceId = require('./randomTraceId');

var _require3 = require('../time'),
    now = _require3.now,
    hrtime = _require3.hrtime;

function requiredArg(name) {
  throw new Error('Tracer: Missing required argument ' + name + '.');
}

var Tracer = function () {
  function Tracer(_ref) {
    var _ref$ctxImpl = _ref.ctxImpl,
        ctxImpl = _ref$ctxImpl === undefined ? requiredArg('ctxImpl') : _ref$ctxImpl,
        _ref$recorder = _ref.recorder,
        recorder = _ref$recorder === undefined ? requiredArg('recorder') : _ref$recorder,
        _ref$sampler = _ref.sampler,
        sampler = _ref$sampler === undefined ? new Sampler(alwaysSample) : _ref$sampler,
        _ref$traceId128Bit = _ref.traceId128Bit,
        traceId128Bit = _ref$traceId128Bit === undefined ? false : _ref$traceId128Bit;

    _classCallCheck(this, Tracer);

    this.recorder = recorder;
    this.sampler = sampler;
    this.traceId128Bit = traceId128Bit;
    this._ctxImpl = ctxImpl;
    this._defaultTraceId = this.createRootId();
    this._startTimestamp = now();
    this._startTick = hrtime();
  }

  _createClass(Tracer, [{
    key: 'scoped',
    value: function scoped(callback) {
      return this._ctxImpl.scoped(callback);
    }
  }, {
    key: 'createRootId',
    value: function createRootId() {
      var rootSpanId = randomTraceId();
      var traceId = this.traceId128Bit ? new Some(randomTraceId() + rootSpanId) : None;
      var id = new TraceId({
        traceId: traceId,
        parentId: None,
        spanId: rootSpanId,
        sampled: None,
        flags: 0
      });
      id._sampled = this.sampler.shouldSample(id);
      return id;
    }
  }, {
    key: 'createChildId',
    value: function createChildId() {
      var currentId = fromNullable(this._ctxImpl.getContext());

      var childId = new TraceId({
        traceId: currentId.map(function (id) {
          return id.traceId;
        }),
        parentId: currentId.map(function (id) {
          return id.spanId;
        }),
        spanId: randomTraceId(),
        sampled: currentId.flatMap(function (id) {
          return id.sampled;
        }),
        flags: currentId.map(function (id) {
          return id.flags;
        }).getOrElse(0)
      });
      if (childId.sampled.present === false) {
        childId._sampled = this.sampler.shouldSample(childId);
      }
      return childId;
    }
  }, {
    key: 'letChildId',
    value: function letChildId(callable) {
      var _this = this;

      return this.scoped(function () {
        var traceId = _this.createChildId();
        _this.setId(traceId);
        return callable(traceId);
      });
    }
  }, {
    key: 'setId',
    value: function setId(traceId) {
      this._ctxImpl.setContext(traceId);
    }
  }, {
    key: 'recordAnnotation',
    value: function recordAnnotation(annotation) {
      this.recorder.record(new Record({
        traceId: this.id,
        timestamp: now(this._startTimestamp, this._startTick),
        annotation: annotation
      }));
    }
  }, {
    key: 'recordMessage',
    value: function recordMessage(message) {
      this.recordAnnotation(new Annotation.Message(message));
    }
  }, {
    key: 'recordServiceName',
    value: function recordServiceName(serviceName) {
      this.recordAnnotation(new Annotation.ServiceName(serviceName));
    }
  }, {
    key: 'recordRpc',
    value: function recordRpc(name) {
      this.recordAnnotation(new Annotation.Rpc(name));
    }
  }, {
    key: 'recordClientAddr',
    value: function recordClientAddr(ia) {
      this.recordAnnotation(new Annotation.ClientAddr(ia));
    }
  }, {
    key: 'recordServerAddr',
    value: function recordServerAddr(ia) {
      this.recordAnnotation(new Annotation.ServerAddr(ia));
    }
  }, {
    key: 'recordLocalAddr',
    value: function recordLocalAddr(ia) {
      this.recordAnnotation(new Annotation.LocalAddr(ia));
    }
  }, {
    key: 'recordBinary',
    value: function recordBinary(key, value) {
      this.recordAnnotation(new Annotation.BinaryAnnotation(key, value));
    }
  }, {
    key: 'writeIdToConsole',
    value: function writeIdToConsole(message) {
      /* eslint-disable no-console */
      console.log(message + ': ' + this.id.toString());
    }
  }, {
    key: 'id',
    get: function get() {
      return this._ctxImpl.getContext() || this._defaultTraceId;
    }
  }]);

  return Tracer;
}();

module.exports = Tracer;