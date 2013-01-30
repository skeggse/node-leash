var crc = require('buffer-crc32');
var Stream = require('stream');
var inherits = require('util').inherits;

var emit = Stream.prototype.emit;

// a complex interface for generating socket handlers with big-endian binary data
// currently works with up to 256 events
// uses object-buffer conversion

var Protocol = function Protocol() {
  this.events = [];
  this._version = null;
};
inherits(Protocol, Stream);

Protocol.prototype.BYTE = 0;
Protocol.prototype.SHORT = 1;
Protocol.prototype.INT = Protocol.prototype.INTEGER = 2;
Protocol.prototype.FLOAT = 3;
Protocol.prototype.DOUBLE = 4;
Protocol.prototype.STR = Protocol.prototype.STRING = 5;
Protocol.prototype.BUF = Protocol.prototype.BUFFER = 6;

Protocol.prototype.readable = true;
Protocol.prototype.writable = true;

// returns a unique (though not sequential) representation of the protocol
Protocol.prototype.version = function(encoding) {
  if (typeof this._version === "number")
    return this._version;
  return this._version = crc.signed(JSON.stringify(this.events));
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

// adds an event
// parameters is an object with a name-type mapping (string->number)
// the parameters are reordered according to the ascii value, deprioritizing buffers and strings
Protocol.prototype.event = function(name, parameters) {
  this._version = null;
  this.parse = this._parse;
  this.serialize = this._serialize;
  if (this.events.length >= 256)
    throw new Error("too many events");
  if (!nameRegex.test(name))
    throw new Error("name contains invalid characters");
  if (reserved[name])
    throw new Error("that name is reserved");
  var keys = [];
  for (var key in parameters)
    keys.push(key);
  keys.sort();
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
  this.events.push(evt.concat(extra));
};

Protocol.prototype.compile = function() {
  this.compileParser();
  this.compileSerializer();
};

Protocol.prototype._parse = function() {
  this.compileParser();
  return this.parse.apply(this, arguments);
};

Protocol.prototype._serialize = function() {
  this.compileSerializer();
  return this.serialize.apply(this, arguments);
};

Protocol.prototype.compileParser = function() {
  // typechecking!
  if (this.events.length > 256)
    throw new Error("too many events");
  var body = "var id = data[0], obj = {}, event, offset, totalOffset = 0;\n";
  for (var i = 0; i < this.events.length; i++) {
    var params = this.events[i];
    body += (i > 0 ? " else " : "") + "if (id === " + i + ") {\n";
    body += "event = '" + params[0] + "';\n";
    var offset = 1;
    for (var j = 1; j < params.length; j++) {
      var type = params[j][1], getter;
      switch (type) {
      case 0:
        getter = "data[" + (offset++) + "]";
        break;
      case 1:
      case 2:
        getter = "data.readInt" + (type * 16) + "BE(" + offset + ")";
        offset += type * 2;
        break;
      case 3:
        getter = "data.readFloatBE(" + offset + ")";
        offset += 2;
        break;
      case 4:
        getter = "data.readDoubleBE(" + offset + ")";
        offset += 4;
        break;
      case 5:
      case 6:
        // actually size, not offset, but whatever
        body += "offset = data.readInt32BE(" + offset + " + totalOffset);\n";
        offset += 4;
        getter = "data." + (type === 5 ? 'toString(\'utf8\', ' : 'slice(') + offset + " + totalOffset, " + offset + " + (totalOffset += offset)" + ")";
        break;
      default:
        throw new Error("unknown type: " + type);
      }
      body += "obj." + params[j][0] + " = " + getter + ";\n";
    }
    body += "totalOffset += " + offset + ";\n";
    body += "}";
  }
  body += " else {\n";
  //body += "console.log(data);\n";
  body += "throw new Error('unknown packet: ' + data[0]);\n";
  body += "}\n";
  body += "if (totalOffset < data.length) {\n";
  body += "this.parse(data.slice(totalOffset));\n";
  //body += "console.log('extra data', data.slice(totalOffset));\n";
  body += "}\n";
  body += "return this.emit(event, obj);";
  //console.log(body);
  this.parse = new Function("data", body);
};

Protocol.prototype.compileSerializer = function(typecheck) {
  if (this.events.length > 256)
    throw new Error("too many events");
  if (typecheck !== false)
    typecheck = true;
  var body = "var data, size, offset, totalOffset = 0, sizes = {};\n";
  for (var i = 0; i < this.events.length; i++) {
    var params = this.events[i];
    body += (i > 0 ? " else " : "") + "if (event === '" + params[0] + "') {\n";
    var size = 1, sizeGetters = "";
    for (var j = 1; j < params.length; j++) {
      var name = params[j][0], type = params[j][1];
      if (typecheck) {
        body += "if (";
        if (type < 6)
          body += "typeof obj." + name + " !== '" + (type === 5 ? 'string' : 'number') + "'";
        else if (type === 6)
          body += "!Buffer.isBuffer(obj." + name + ")";
        body += ")\n";
        body += "throw new TypeError('";
        if (type < 5)
          body += "number";
        else if (type < 6)
          body += "string";
        else
          body += "buffer";
        body += " required for " + name + "');\n";
      }
      if (type < 3)
        size += Math.pow(2, type);
      else if (type < 5)
        size += Math.pow(2, type - 2);
      else if (type === 5) {
        size += 4;
        sizeGetters += "size += sizes[" + j + "] = Buffer.byteLength(obj." + name + ");\n";
      } else if (type === 6) {
        size += 4;
        sizeGetters += "size += obj." + name + ".length;\n";
      } else
        throw new Error("unknown type: " + type);
    }
    if (sizeGetters.length > 0) {
      body += "size = " + size + ";\n" + sizeGetters;
      body += "data = new Buffer(size);\n";
    } else
      body += "data = new Buffer(" + size + ");\n";
    // add id
    body += "data[0] = " + i + ";";
    var offset = 1;
    for (var j = 1; j < params.length; j++) {
      var name = params[j][0], type = params[j][1], tail;
      if (type === 0)
        body += "data[" + (offset++) + "] = obj." + name + ";\n";
      else if (type < 5) {
        body += "data.write";
        // tail because offset
        tail = "BE(obj." + name + ", " + offset + ");\n";
        if (type < 3) {
          body += "Int" + type * 16;
          offset += type * 2;
        } else if (type === 3) {
          body += "Float";
          offset += 2;
        } else if (type === 4) {
          body += "Double";
          offset += 4;
        }
        body += tail;
      } else if (type === 5) {
        body += "data.writeInt32BE(sizes[" + j + "], " + offset + " + totalOffset);\n";
        offset += 4;
        body += "data.write(obj." + name + ", " + offset + " + totalOffset, " + offset + " + (totalOffset += sizes[" + j + "]), 'utf8');\n";
      } else if (type === 6) {
        body += "data.writeInt32BE(obj." + name + ".length, " + offset + " + totalOffset);\n";
        offset += 4;
        body += "obj." + name + ".copy(data, " + offset + " + totalOffset);\n";
        body += "totalOffset += obj." + name + ".length\n";
      } else
        throw new Error('unknown type: ' + type);
    }
    body += "}";
  }
  body += " else {\n";
  body += "throw new Error('unknown packet: ' + event);\n";
  body += "}\n";
  body += "return this.emit('data', data);";
  //console.log(body);
  this.serialize = new Function("event", "obj", body);
};

// data for parsing, can be used with pipe
Protocol.prototype.write = function(buffer) {
  this.parse(buffer, emit.bind(this));
  return true;
};

Protocol.prototype.end = function(buffer) {
  if (buffer)
    this.write(buffer);
  this.readable = false;
  this.writable = false;
  this.emit('end');
};

// data for serializing
Protocol.prototype.send = function(event, obj) {
  this.serialize.apply(this, arguments);
};

module.exports = Protocol;
