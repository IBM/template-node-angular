'use strict';

// === Generate a random 64-bit number in fixed-length hex format
function randomTraceId() {
  var digits = '0123456789abcdef';
  var n = '';
  for (var i = 0; i < 16; i++) {
    var rand = Math.floor(Math.random() * 16);
    n += digits[rand];
  }
  return n;
}

module.exports = randomTraceId;