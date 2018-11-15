'use strict';

var Tracer = require('./');
var ExplicitContext = require('../explicit-context');

module.exports = function createNoopTracer() {
  var recorder = {
    record: function record() {}
  };
  var ctxImpl = new ExplicitContext();
  return new Tracer({ recorder: recorder, ctxImpl: ctxImpl });
};