//var crc = require('buffer-crc32');
var Duplex = require('readable-stream').Duplex;
var util = require('util');

var Packet = require('./packet');

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
var Leash = function Leash(options) {
  Duplex.call(this);

  this.options = options || {};

  // regular events [0x00-0xFF)
  this.packets = new Array(0xFF);
  // other events
  this.extendedPackets = {};

  // named events
  this.namedPackets = {};
};

util.inherits(Leash, Duplex);

Object.keys(TYPES).forEach(function(key) {
  Leash.prototype[key] = Leash[key] = TYPES[key];
});

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

// adds an event
// parameters is an object with a name-type mapping (string->number)
// the parameters are lexographically ordered, deprioritizing buffers and strings
Leash.prototype.event =
Leash.prototype.define = function(id, name, parameters) {
  if (typeof id !== 'number' || id < 0 || (id | 0) !== id)
    throw new Error("event id must be a positive integer");
  if (!nameRegex.test(name))
    throw new Error("event name contains special characters");
  if (reserved[name])
    throw new Error("event name is reserved");
  if ((id < 0xFF && this.packets[id]) || (id >= 0xFF && this.extendedPackets[id]))
    throw new Error("event id already defined");
  if (this.namedPackets[name])
    throw new Error("event name already defined");
  // create a list of events, in lexographic order
  var keys = Object.keys(parameters);
  keys.sort();
  // prioritize primitives for efficiency
  var evt = [], extra = [];
  for (var i = 0; i < keys.length; i++) {
    if (!paramRegex.test(keys[i]))
      throw new Error("param name contains invalid characters");
    var type = parameters[keys[i]];
    if (type < 5)
      evt.push([keys[i], type]);
    else
      extra.push([keys[i], type]);
  }
  var packet = new Packet(id, name, evt.concat(extra), this.options);
  if (id < 0xFF)
    this.packets[id] = packet;
  else
    this.extendedPackets[id] = packet;
  this.namedPackets[name] = packet;
};

Leash.prototype.compile = function() {
  for (var name in this.namedPackets)
    this.namedPackets[name].compile();
};

Leash.prototype.serialize =
Leash.prototype.encode = function(eventName, object, callback) {
  var packet = this.namedPackets[eventName];
  if (!packet)
    throw new Error('no matching event');
  process.nextTick(function() {
    var data;
    try {
      data = packet.encode(object);
    } catch (e) {
      return callback(e);
    }
    callback(null, data);
  });
};

Leash.prototype.deserialize =
Leash.prototype.parse =
Leash.prototype.decode = function(data, callback) {
  var packet = data[0] === 0xFF ? this.extendedPackets[data.readUInt32BE(1)] : this.packets[data[0]];
  if (!packet)
    throw new Error('no matching event');
  process.nextTick(function() {
    var obj;
    try {
      obj = packet.decode(data);
    } catch (e) {
      return callback(e);
    }
    callback(null, packet.name, obj);
  });
};

// for testing, encodes and decodes the object
Leash.prototype.reconstruct = function(event, object, callback) {
  var self = this;
  this.encode(event, object, function(err, data) {
    if (err)
      return callback(err);
    self.decode(data, callback);
  });
};

// ohhh-kay...
Leash.prototype._read = function(size) {
  // console.log("_read", size);
};

// parse data from source stream
Leash.prototype._write = function(chunk, encoding, callback) {
  // console.log("_write", chunk.length);
  this.decode(chunk, this._event.bind(this, callback));
  return true;
};

// called by the parser when a parse is completed
Leash.prototype._event = function(callback, err, event, obj) {
  err || emit.call(this, event, obj);
  callback(err);
};

// sends data to the source stream
Leash.prototype.send = function(event, obj) {
  var data = this.encode(event, obj, this._packet.bind(this));
};

Leash.prototype._packet = function(err, data) {
  this.push(data);
};

module.exports = Leash;
Leash.Leash = Leash;
