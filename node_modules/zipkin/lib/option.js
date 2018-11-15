'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var None = {
  get type() {
    return 'None';
  },
  map: function map() {
    return None;
  },
  ifPresent: function ifPresent() {},
  flatMap: function flatMap() {
    return None;
  },
  getOrElse: function getOrElse(f) {
    if (f instanceof Function) {
      return f();
    } else {
      return f;
    }
  },
  equals: function equals(other) {
    return other.type === 'None';
  },
  toString: function toString() {
    return 'None';
  },

  get present() {
    return false;
  }
};

var Some = function () {
  function Some(value) {
    _classCallCheck(this, Some);

    this.value = value;
  }

  _createClass(Some, [{
    key: 'map',
    value: function map(f) {
      return new Some(f(this.value));
    }
  }, {
    key: 'ifPresent',
    value: function ifPresent(f) {
      return this.map(f);
    }
  }, {
    key: 'flatMap',
    value: function flatMap(f) {
      return this.map(f).getOrElse(None);
    }
  }, {
    key: 'getOrElse',
    value: function getOrElse() {
      return this.value;
    }
  }, {
    key: 'equals',
    value: function equals(other) {
      return other instanceof Some && other.value === this.value;
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'Some(' + this.value.toString() + ')';
    }
  }, {
    key: 'present',
    get: function get() {
      return true;
    }
  }, {
    key: 'type',
    get: function get() {
      return 'Some';
    }
  }]);

  return Some;
}();

// Used to validate input arguments


function isOptional(data) {
  return data != null && (data instanceof Some || data === None || data.type === 'Some' || data.type === 'None');
}

function verifyIsOptional(data) {
  if (data == null) {
    throw new Error('Error: data is not Optional - it\'s null');
  }
  if (isOptional(data)) {
    if (isOptional(data.value)) {
      throw new Error('Error: data (' + data.value.toString() + ') is wrapped in Option twice');
    }
  } else {
    throw new Error('Error: data (' + data + ') is not an Option!');
  }
}

function fromNullable(nullable) {
  if (nullable != null) {
    return new Some(nullable);
  } else {
    return None;
  }
}

module.exports.Some = Some;
module.exports.None = None;
module.exports.verifyIsOptional = verifyIsOptional;
module.exports.fromNullable = fromNullable;