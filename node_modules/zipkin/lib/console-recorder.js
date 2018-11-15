'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ConsoleRecorder = function () {
  /* eslint-disable no-console */
  function ConsoleRecorder() {
    var logger = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : console.log;

    _classCallCheck(this, ConsoleRecorder);

    this.logger = logger;
  }

  _createClass(ConsoleRecorder, [{
    key: 'record',
    value: function record(rec) {
      var id = rec.traceId;
      this.logger('Record at (spanId=' + id.spanId + ', parentId=' + id.parentId + ',' + (' traceId=' + id.traceId + '): ' + rec.annotation.toString()));
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'consoleTracer';
    }
  }]);

  return ConsoleRecorder;
}();

module.exports = ConsoleRecorder;