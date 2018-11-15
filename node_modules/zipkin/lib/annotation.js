'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var InetAddress = require('./InetAddress');

var SimpleAnnotation = function () {
  function SimpleAnnotation() {
    _classCallCheck(this, SimpleAnnotation);
  }

  _createClass(SimpleAnnotation, [{
    key: 'toString',
    value: function toString() {
      return this.annotationType + '()';
    }
  }]);

  return SimpleAnnotation;
}();

var ClientSend = function (_SimpleAnnotation) {
  _inherits(ClientSend, _SimpleAnnotation);

  function ClientSend() {
    _classCallCheck(this, ClientSend);

    return _possibleConstructorReturn(this, (ClientSend.__proto__ || Object.getPrototypeOf(ClientSend)).apply(this, arguments));
  }

  return ClientSend;
}(SimpleAnnotation);

var ClientRecv = function (_SimpleAnnotation2) {
  _inherits(ClientRecv, _SimpleAnnotation2);

  function ClientRecv() {
    _classCallCheck(this, ClientRecv);

    return _possibleConstructorReturn(this, (ClientRecv.__proto__ || Object.getPrototypeOf(ClientRecv)).apply(this, arguments));
  }

  return ClientRecv;
}(SimpleAnnotation);

var ServerSend = function (_SimpleAnnotation3) {
  _inherits(ServerSend, _SimpleAnnotation3);

  function ServerSend() {
    _classCallCheck(this, ServerSend);

    return _possibleConstructorReturn(this, (ServerSend.__proto__ || Object.getPrototypeOf(ServerSend)).apply(this, arguments));
  }

  return ServerSend;
}(SimpleAnnotation);

var ServerRecv = function (_SimpleAnnotation4) {
  _inherits(ServerRecv, _SimpleAnnotation4);

  function ServerRecv() {
    _classCallCheck(this, ServerRecv);

    return _possibleConstructorReturn(this, (ServerRecv.__proto__ || Object.getPrototypeOf(ServerRecv)).apply(this, arguments));
  }

  return ServerRecv;
}(SimpleAnnotation);

function Message(message) {
  this.message = message;
}
Message.prototype.toString = function () {
  return 'Message("' + this.message + '")';
};

function ServiceName(serviceName) {
  this.serviceName = serviceName;
}
ServiceName.prototype.toString = function () {
  return 'ServiceName("' + this.serviceName + '")';
};

function Rpc(name) {
  this.name = name;
}
Rpc.prototype.toString = function () {
  return 'Rpc("' + this.name + '")';
};

function ClientAddr(_ref) {
  var host = _ref.host,
      port = _ref.port;

  this.host = host;
  this.port = port;
}
ClientAddr.prototype.toString = function () {
  return 'ClientAddr(host="' + this.host + '", port=' + this.port + ')';
};

function ServerAddr(_ref2) {
  var serviceName = _ref2.serviceName,
      host = _ref2.host,
      port = _ref2.port;

  this.serviceName = serviceName;
  this.host = host || undefined;
  this.port = port || 0;
}
ServerAddr.prototype.toString = function () {
  return 'ServerAddr(serviceName="' + this.serviceName + '", host="' + this.host + '", port=' + this.port + ')';
};

function LocalAddr(_ref3) {
  var host = _ref3.host,
      port = _ref3.port;

  this.host = host || InetAddress.getLocalAddress();
  this.port = port || 0;
}
LocalAddr.prototype.toString = function () {
  return 'LocalAddr(host="' + this.host.toString() + '", port=' + this.port + ')';
};

function BinaryAnnotation(key, value) {
  this.key = key;
  this.value = value;
}
BinaryAnnotation.prototype.toString = function () {
  return 'BinaryAnnotation(' + this.key + '="' + this.value + '")';
};

var annotation = {
  ClientSend: ClientSend,
  ClientRecv: ClientRecv,
  ServerSend: ServerSend,
  ServerRecv: ServerRecv,
  Message: Message,
  ServiceName: ServiceName,
  Rpc: Rpc,
  ClientAddr: ClientAddr,
  ServerAddr: ServerAddr,
  LocalAddr: LocalAddr,
  BinaryAnnotation: BinaryAnnotation
};

Object.keys(annotation).forEach(function (key) {
  annotation[key].prototype.annotationType = key;
});

module.exports = annotation;