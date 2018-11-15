'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var InetAddress = function () {
  function InetAddress(addr) {
    _classCallCheck(this, InetAddress);

    this.addr = addr;
  }

  // returns undefined if this isn't an IPv4 string


  _createClass(InetAddress, [{
    key: 'ipv4',
    value: function ipv4() {
      // coercing to int forces validation here
      var ipv4Int = this.toInt();
      if (ipv4Int && ipv4Int !== 0) {
        return this.addr;
      }
      return undefined;
    }
  }, {
    key: 'toInt',
    value: function toInt() {
      // e.g. 10.57.50.83
      // should become
      // 171520595
      var parts = this.addr.split('.');

      // The jshint tool always complains about using bitwise operators,
      // but in this case it's actually intentional, so we disable the warning:
      // jshint bitwise: false
      return parts[0] << 24 | parts[1] << 16 | parts[2] << 8 | parts[3];
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'InetAddress(' + this.addr + ')';
    }
  }]);

  return InetAddress;
}();

// In non-node environments we fallback to 127.0.0.1


InetAddress.getLocalAddress = function getLocalAddress() {
  var isNode = (typeof process === 'undefined' ? 'undefined' : _typeof(process)) === 'object' && typeof process.on === 'function';
  if (!isNode) {
    return new InetAddress('127.0.0.1');
  }

  // eslint-disable-next-line global-require
  var networkAddress = require.call(null, 'network-address');
  return new InetAddress(networkAddress.ipv4());
};

module.exports = InetAddress;