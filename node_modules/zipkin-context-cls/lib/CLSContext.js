'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('continuation-local-storage'),
    createNamespace = _require.createNamespace,
    getNamespace = _require.getNamespace;

module.exports = function () {
  function CLSContext() {
    var namespace = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'zipkin';

    _classCallCheck(this, CLSContext);

    this._session = getNamespace(namespace) || createNamespace(namespace);
    var defaultContext = this._session.createContext();
    this._session.enter(defaultContext);
  }

  _createClass(CLSContext, [{
    key: 'setContext',
    value: function setContext(ctx) {
      this._session.set('zipkin', ctx);
    }
  }, {
    key: 'getContext',
    value: function getContext() {
      var currentCtx = this._session.get('zipkin');
      if (currentCtx != null) {
        return currentCtx;
      } else {
        return null; // explicitly return null (not undefined)
      }
    }
  }, {
    key: 'scoped',
    value: function scoped(callable) {
      var result = void 0;
      this._session.run(function () {
        result = callable();
      });
      return result;
    }
  }, {
    key: 'letContext',
    value: function letContext(ctx, callable) {
      var _this = this;

      return this.scoped(function () {
        _this.setContext(ctx);
        return callable();
      });
    }
  }]);

  return CLSContext;
}();