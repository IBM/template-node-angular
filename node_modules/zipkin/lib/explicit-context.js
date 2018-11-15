"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

module.exports = function () {
  function ExplicitContext() {
    _classCallCheck(this, ExplicitContext);

    this.currentCtx = null;
  }

  _createClass(ExplicitContext, [{
    key: "setContext",
    value: function setContext(ctx) {
      this.currentCtx = ctx;
    }
  }, {
    key: "getContext",
    value: function getContext() {
      return this.currentCtx;
    }
  }, {
    key: "scoped",
    value: function scoped(callable) {
      var prevCtx = this.currentCtx;
      var result = callable();
      this.currentCtx = prevCtx;
      return result;
    }
  }, {
    key: "letContext",
    value: function letContext(ctx, callable) {
      var _this = this;

      return this.scoped(function () {
        _this.setContext(ctx);
        return callable();
      });
    }
  }]);

  return ExplicitContext;
}();