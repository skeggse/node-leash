var _ = require('underscore');

var sDefaults = {
  typecheck: true,
  special: false
};

// compiles a serializer
exports.serializer = function(events, options) {
  if (events.length > 256)
    throw new Error("too many events");
  options = _.defaults(options, sDefaults);
  var body = "var data, size, offset, totalOffset = 0, sizes = {};\n";
  body += "try {\n";
  for (var i = 0; i < events.length; i++) {
    var params = events[i];
    body += (i > 0 ? " else " : "") + "if (event === '" + params[0] + "') {\n";
    var size = 1, sizeGetters = "";
    for (var j = 1; j < params.length; j++) {
      var name = params[j][0], type = params[j][1];
      if (options.typecheck) {
        body += "if (";
        if (type < 6)
          body += "typeof obj." + name + " !== '" + (type === 5 ? 'string' : 'number') + "'";
        else if (type === 6)
          body += "!Buffer.isBuffer(obj." + name + ")";
        body += ")\n";
        body += "return callback(new TypeError('";
        if (type < 5)
          body += "number";
        else if (type < 6)
          body += "string";
        else
          body += "buffer";
        body += " required for " + name + "'));\n";
      }
      if (type < 3)
        size += Math.pow(2, type);
      else if (type < 5)
        size += Math.pow(2, type - 1);
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
    body += "data[0] = " + i + ";\n";
    var offset = 1;
    for (var j = 1; j < params.length; j++) {
      var name = params[j][0], type = params[j][1], tail;
      if (type === 0)
        body += "data[" + (offset++) + "] = obj." + name + ";\n";
      else if (type < 5) {
        body += "data.write";
        // tail because offset
        tail = "BE(obj." + name + ", " + offset;
        if (type < 3) {
          body += "Int" + type * 16;
          offset += Math.pow(2, type);
        } else if (type === 3) {
          body += "Float";
          offset += 4;
        } else if (type === 4) {
          body += "Double";
          offset += 8;
        }
        body += tail;
        if (options.special)
          body += ", true";
        body += ");\n";
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
  body += "return callback(new Error('unknown event: ' + event));\n";
  body += "}\n";
  body += "} catch (e) {\n";
  body += "console.log(event, obj, data);\n";
  body += "throw e;\n";
  body += "}\n";
  body += "return callback(null, data);";
  return new Function("event", "obj", "callback", body);
};

// compiles a parser
// assumes you'll store it this.parse, so it can handle extra data
exports.parser = function(events) {
  if (events.length > 256)
    throw new Error("too many events");
  var body = "var id = data[0], event, obj = {}, offset, totalOffset = 0;\n";
  for (var i = 0; i < events.length; i++) {
    var params = events[i];
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
        offset += Math.pow(2, type);
        break;
      case 3:
        getter = "data.readFloatBE(" + offset + ")";
        offset += 4;
        break;
      case 4:
        getter = "data.readDoubleBE(" + offset + ")";
        offset += 8;
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
  body += "return callback(new Error('unknown packet: ' + data[0]));\n";
  body += "}\n";
  // extra data
  body += "if (totalOffset < data.length) {\n";
  body += "this.parse(data.slice(totalOffset), callback);\n";
  body += "}\n";
  body += "return callback(null, event, obj);";
  return new Function("data", "callback", body);
};

if (require.main === module)
  exports.serializer([['test', ['name', 3]]]);
