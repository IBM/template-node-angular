'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('../option'),
    Some = _require.Some;
// Determines whether or not a traceId should be sampled.
// If no sample decision is already made (by a debug flag, or
// the "sampled" property is set), it will use evaluator,
// which is a function traceId => Boolean, and returns true if
// the traceId should be sampled (stored in Zipkin).


var Sampler = function () {
  function Sampler(evaluator) {
    _classCallCheck(this, Sampler);

    this.evaluator = evaluator;
  }

  _createClass(Sampler, [{
    key: 'shouldSample',
    value: function shouldSample(traceId) {
      var _this = this;

      var result = traceId.sampled.getOrElse(function () {
        return _this.evaluator(traceId);
      });
      return new Some(result);
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'Sampler(' + this.evaluator.toString() + ')';
    }
  }]);

  return Sampler;
}();

function neverSample(traceId) {
  // eslint-disable-line no-unused-vars
  return false;
}
neverSample.toString = function () {
  return 'never sample';
};

function alwaysSample(traceId) {
  // eslint-disable-line no-unused-vars
  return true;
}
alwaysSample.toString = function () {
  return 'always sample';
};

function makeCountingEvaluator(sampleRate) {
  if (sampleRate <= 0) {
    return neverSample;
  } else if (sampleRate >= 1) {
    return alwaysSample;
  } else {
    var counter = 0;
    var limit = parseInt(1 / sampleRate);
    var counting = function counting(traceId) {
      // eslint-disable-line no-unused-vars
      counter = counter % limit;
      var shouldSample = counter === 0;
      counter++;
      return shouldSample;
    };
    counting.toString = function () {
      return 'countingSampler: sampleRate=' + sampleRate;
    };
    return counting;
  }
}

var CountingSampler = function (_Sampler) {
  _inherits(CountingSampler, _Sampler);

  function CountingSampler() {
    var sampleRate = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

    _classCallCheck(this, CountingSampler);

    return _possibleConstructorReturn(this, (CountingSampler.__proto__ || Object.getPrototypeOf(CountingSampler)).call(this, makeCountingEvaluator(sampleRate < 1 ? sampleRate : 1)));
  }

  return CountingSampler;
}(Sampler);

module.exports = { Sampler: Sampler, CountingSampler: CountingSampler, neverSample: neverSample, alwaysSample: alwaysSample };