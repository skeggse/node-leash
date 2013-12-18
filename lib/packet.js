// binary format
// 0x00: packet id
// 0x01-0x04: extended packet id, if packet id is 0xff
// 0x05-0x08: length of packet, if packet contains variable-length components
// 0x09-?: static-length payload
// ?-?: static-length dynamic size payload
// ?-end: dynamic-length payload

var staticLookup = {
  0x00: 1,
  0x01: 2,
  0x02: 4,
  0x03: 4,
  0x04: 8,
  0x05: 4, // plus actual content
  0x06: 4  // plus actual content
};

var nameLookup = {
  0x01: "Int16",
  0x02: "Int32",
  0x03: "Float",
  0x04: "Double",
  0x05: "toString('utf8', ",
  0x06: "slice("
};

var INT_ARRAY_TYPE = typeof Uint32Array === 'undefined' ? "Array" : "Uint32Array";

var ENCODE_SPECIAL = (function() {
  var buf = new Buffer(4);
  try {
    buf.writeFloatBE(Infinity, 0);
  } catch (err) {
    return err.name === 'AssertionError';
  }
  return false;
})();

// private method, creates the encode function
var encoder = function() {
  var i, j, body, offset = this.header.length, temp;
  // only directly create buffer if fixed
  if (this.isStatic)
    body = "var data = new Buffer(" + this.staticSize + ");\n";
  else {
    body = "var data, size = " + this.staticSize + ", offset, ";
    body += "sizes = new " + INT_ARRAY_TYPE + "(" + this.dynamicFields + ");\n";
    // find buffer size
    for (i = this.staticFields, j = 0; i < this.params.length; i++, j++) {
      var name = "object." + this.params[i][0], type = this.params[i][1];
      body += "size += sizes[" + j + "] = ";
      if (type === 0x05)
        body += "Buffer.byteLength(" + name + ", 'utf8')";
      else if (type === 0x06)
        body += name + ".length";
      body += ";\n";
    }
    // construct buffer
    body += "data = new Buffer(size);\n";
  }
  // insert header
  for (i = 0; i < this.header.length; i++)
    body += "data[" + i + "] = " + this.header[i] + ";\n";
  if (!this.isStatic) {
    // add packet length
    body += "data.writeUInt32BE(size, " + offset + ");\n";
    offset += 4;
  }
  // handle static fields
  for (i = 0; i < this.staticFields; i++) {
    var name = "object." + this.params[i][0], type = this.params[i][1];
    if (type === 0x00)
      body += "data[" + (offset++) + "] = " + name + ";\n";
    else {
      var part = "data.write" + nameLookup[type] + "BE(" + name + ", " + offset;
      if (ENCODE_SPECIAL && (type === 0x03 || type === 0x04)) {
        body += "if (" + name + " === Infinity || " + name + " === -Infinity || isNaN(" + name + "))\n";
        body += part + ", true);\nelse\n";
      }
      body += part + ");\n";
      offset += staticLookup[type];
    }
  }
  var dynamicBody = "";
  // handle dynamic fields
  for (j = 0; i < this.params.length; i++, j++) {
    var name = "object." + this.params[i][0], type = this.params[i][1];
    body += "data.writeUInt32BE(sizes[" + j + "], " + offset + ");\n";
    offset += 4;
    temp = "offset " + (j === 0 ? '=' : '+=') + " sizes[" + j + "]";
    var off = j === 0 ? "" : " + offset";
    if (type === 0x05) {
      dynamicBody += "data.write(" + name + ", " + this.staticSize + off + ", " + this.staticSize + " + (" + temp + "), 'utf8');\n";
    } else if (type === 0x06) {
      dynamicBody += name + ".copy(data, " + this.staticSize + off + ");\n";
      if (i < this.params.length - 1) // don't need this if it's the last one
        dynamicBody += temp + ";\n";
    }
  }
  body += dynamicBody + "return data;";
  this.encode = new Function("object", body);
};

// private method, creates the decode function
var decoder = function() {
  var i, j, offset = this.header.length, body;
  if (this.isStatic)
    body = "var object = {};\n"
  else {
    body = "var object = {}, offset;\n"
    // length is just for packet routing and reconstitution
    offset += 4;
  }
  for (i = 0; i < this.staticFields; i++) {
    var name = this.params[i][0], type = this.params[i][1];
    body += "object." + name + " = data";
    if (type === 0x00)
      body += "[" + (offset++) + "]";
    else {
      body += ".read" + nameLookup[type] + "BE(" + offset + ")";
      offset += staticLookup[type];
    }
    body += ";\n";
  }
  var dynamicBody = "";
  for (j = 0; i < this.params.length; i++, j++) {
    var name = this.params[i][0], type = this.params[i][1];
    var size = "data.readUInt32BE(" + offset + ")";
    offset += 4;
    dynamicBody += "object." + name + " = data." + nameLookup[type] + this.staticSize;
    dynamicBody += (j === 0 ? ", " : " + offset, ") + this.staticSize + " + ";
    dynamicBody += "(offset " + (j === 0 ? '= ' : '+= ') + size + "));\n";
  }
  body += dynamicBody + "return object;";
  this.decode = new Function("data", body);
};

/**
 * @constructor
 */
var Packet = function Packet(id, name, params, options) {
  this.name = name;
  this.id = id;
  this.params = params;
  this.options = options || {};
  this.isStatic = true;
  this.isExtended = id > 0xFF;
  this.staticSize = this.isExtended ? 5 : 1; // packet id
  this.staticFields = 0;
  for (var i = 0; i < params.length; i++) {
    var size = staticLookup[params[i][1]];
    this.staticSize += size;
    if (params[i][1] < 5)
      this.staticFields++;
    else
      this.isStatic = false;
  }
  if (!this.isStatic)
    this.staticSize += 4;
  this.dynamicFields = params.length - this.staticFields;
  this.header = new Buffer(this.isExtended ? 5 : 1);
  this.header[0] = this.isExtended ? 0xFF : id;
  if (this.isExtended)
    this.header.writeUInt32BE(id, 1);
};

// lazy-compiles encoder
Packet.prototype.encode =
Packet.prototype._encode = function(object) {
  encoder.call(this);
  return this.encode(object);
};

Packet.prototype.decode =
Packet.prototype._decode = function(data) {
  decoder.call(this);
  return this.decode(data);
};

Packet.prototype.compile = function() {
  encoder.call(this);
  decoder.call(this);
};

module.exports = Packet;
