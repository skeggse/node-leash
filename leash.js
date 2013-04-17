var crc = require('buffer-crc32');
var Duplex = require('readable-stream').Duplex;
var inherits = require('util').inherits;

var compiler = require('./compiler');

var emit = Duplex.prototype.emit;

var TYPES = {};
TYPES.BYTE    = 0;
TYPES.SHORT   = 1;
TYPES.INT     = 2;
TYPES.INTEGER = 2;
TYPES.FLOAT   = 3;
TYPES.DOUBLE  = 4;
TYPES.NUMBER  = 4; // Number is a double internally
TYPES.STR     = 5;
TYPES.STRING  = 5;
TYPES.BUF     = 6;
TYPES.BUFFER  = 6;

// a duplex stream for passing events
// holds the structure of the events
var Protocol = function Protocol() {
  Duplex.call(this);

  this.events = [];
  this._signature = null;
};

inherits(Protocol, Duplex);

Object.keys(TYPES).forEach(function(key) {
  Protocol.prototype[key] = Protocol[key] = TYPES[key];
});

Protocol.prototype._parse = function() {
  this.parse = compiler.parser(this.events);
  return this.parse.apply(this, arguments);
};

Protocol.prototype._serialize = function() {
  this.serialize = compiler.serializer(this.events);
  return this.serialize.apply(this, arguments);
};

// generates a unique signature for this protocol
Protocol.prototype.signature = function(encoding) {
  if (typeof this._signature === "number")
    return this._signature;
  return this._signature = crc.signed(JSON.stringify(this.events));
};

var nameRegex = /^[0-9a-z\-_]+$/i;
var paramRegex = /^[a-z_][0-9a-z_]*$/i;
var reserved = {
  close: true,
  data: true,
  drain: true,
  end: true,
  error: true,
  pipe: true,
  newListener: true
};

// creates an identical protocol, using the compiled functions if applicable
Protocol.prototype.clone = function() {
  var protocol = new Protocol();
  protocol.events = this.events.slice();
  protocol._signature = this._signature;
  return protocol;
};

// adds an event
// parameters is an object with a name-type mapping (string->number)
// the parameters are reordered according to the ascii value, deprioritizing buffers and strings
Protocol.prototype.event = function(name, parameters) {
  // currently only supports up to 256 events
  if (this.events.length >= 256)
    throw new Error("too many events");
  if (!nameRegex.test(name))
    throw new Error("event name contains invalid characters");
  if (reserved[name])
    throw new Error("event name is reserved");
  // create a list of events, in alphabetical order
  var keys = Object.keys(parameters);
  keys.sort();
  // prioritize primitives for efficiency
  var evt = [name], extra = [];
  for (var i = 0; i < keys.length; i++) {
    if (!paramRegex.test(keys[i]))
      throw new Error("param name contains invalid characters");
    var type = parameters[keys[i]];
    if (type < 5)
      evt.push([keys[i], type]);
    else
      extra.push([keys[i], type]);
  }
  this._signature = null;
  this.events.push(evt.concat(extra));
};

Protocol.prototype.compile = function() {
  this.parse = compiler.parser(this.events);
  this.serialize = compiler.serializer(this.events);
};

// ohhh-kay...
Protocol.prototype._read = function(size) {
  console.log("_read", size);
};

// parse data from source stream
Protocol.prototype._write = function(chunk, encoding, callback) {
  console.log("_write", chunk.length);
  this.parse(chunk, this._event.bind(this, callback));
  return true;
};

// called by the parser when a parse is completed
Protocol.prototype._event = function(callback, err, event, obj) {
  err || emit.call(this, event, obj);
  callback(err);
};

// sends data to the source stream
Protocol.prototype.send = function(event, obj) {
  var data = this.serialize(event, obj, this._packet.bind(this));
};

Protocol.prototype._packet = function(err, data) {
  this.push(data);
};

module.exports = Protocol;
Protocol.Protocol = Protocol;
