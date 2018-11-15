'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* eslint-disable no-console */
var globalFetch = typeof window !== 'undefined' && window.fetch || typeof global !== 'undefined' && global.fetch;

// eslint-disable-next-line global-require
var fetch = globalFetch || require.call(null, 'node-fetch');

var _require = require('zipkin'),
    JSON_V1 = _require.jsonEncoder.JSON_V1;

var HttpLogger = function () {
  function HttpLogger(_ref) {
    var _this = this;

    var endpoint = _ref.endpoint,
        _ref$httpInterval = _ref.httpInterval,
        httpInterval = _ref$httpInterval === undefined ? 1000 : _ref$httpInterval,
        _ref$jsonEncoder = _ref.jsonEncoder,
        jsonEncoder = _ref$jsonEncoder === undefined ? JSON_V1 : _ref$jsonEncoder;

    _classCallCheck(this, HttpLogger);

    this.endpoint = endpoint;
    this.queue = [];
    this.jsonEncoder = jsonEncoder;

    var timer = setInterval(function () {
      _this.processQueue();
    }, httpInterval);
    if (timer.unref) {
      // unref might not be available in browsers
      timer.unref(); // Allows Node to terminate instead of blocking on timer
    }
  }

  _createClass(HttpLogger, [{
    key: 'logSpan',
    value: function logSpan(span) {
      this.queue.push(this.jsonEncoder.encode(span));
    }
  }, {
    key: 'processQueue',
    value: function processQueue() {
      if (this.queue.length > 0) {
        var postBody = '[' + this.queue.join(',') + ']';
        fetch(this.endpoint, {
          method: 'POST',
          body: postBody,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        }).then(function (response) {
          if (response.status !== 202) {
            console.error('Unexpected response while sending Zipkin data, status:' + (response.status + ', body: ' + postBody));
          }
        }).catch(function (error) {
          console.error('Error sending Zipkin data', error);
        });
        this.queue.length = 0;
      }
    }
  }]);

  return HttpLogger;
}();

module.exports = HttpLogger;