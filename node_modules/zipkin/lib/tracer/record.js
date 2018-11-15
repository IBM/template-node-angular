"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Record = function () {
  function Record(_ref) {
    var traceId = _ref.traceId,
        timestamp = _ref.timestamp,
        annotation = _ref.annotation;

    _classCallCheck(this, Record);

    this.traceId = traceId;
    this.timestamp = timestamp;
    this.annotation = annotation;
  }

  _createClass(Record, [{
    key: "toString",
    value: function toString() {
      return "Record(traceId=" + this.traceId.toString() + ", annotation=" + this.annotation.toString() + ")";
    }
  }]);

  return Record;
}();

module.exports = Record;