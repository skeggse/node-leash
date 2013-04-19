// run this to benchmark both leash and the built-in json utilities
var colors = require('colors');
var Leash = require('..');
var randomBytes = require('crypto').randomBytes;

var random = function(min, max) {
  min = min || 0;
  max = max || 0xFF;
  return (randomBytes(1)[0] / 0x100 * (max - min + 1) + min) | 0;
};

random.string = function(length) {
  length = length || random(4, 9);
  var name = "";
  for (var i = 0; i < length; i++)
    name += String.fromCharCode(random(97, 122));
  return name;
};

random.strings = function(count) {
  var names = new Array(count);
  while (count)
    names[count--] = random.string();
  return names;
};

random.event = function(properties) {
  properties = properties || random(2, 7);
  var event = {};
  for (var i = 0; i < properties; i++)
    event[random.string()] = random(0, 6);
  return event;
};

random.events = function(leash, count) {
  while (count--)
    leash.event(random.string(), random.event());
};

random.type = function(id) {
  switch (id) {
  case Leash.BYTE:   return random();
  case Leash.SHORT:  return randomBytes(2).readInt16BE(0);
  case Leash.INT:    return randomBytes(4).readInt32BE(0);
  case Leash.FLOAT:  return randomBytes(4).readFloatBE(0);
  case Leash.DOUBLE: return randomBytes(8).readDoubleBE(0);
  case Leash.STR:    return random.string(random(8, 32));
  case Leash.BUF:    return randomBytes(random(8, 32));
  default:
    throw new TypeError('unknown id');
  }
};

random.object = function(leash) {
  if (leash) {
    var id = random(0, leash.events.length - 1);
    var event = leash.events[id], object = {};
    for (var i = 1; i < event.length; i++)
      object[event[i][0]] = random.type(event[i][1]);
    return [event[0], object];
  }
  var object = random.event();
  for (var key in object)
    object[key] = random.type(object[key]);
  return object;
};

random.leash = function(typecheck, special) {
  var leash = new Leash({
    typecheck: typecheck,
    special: special || true // required for NaN, Infinity, -Infinity
  });
  random.events(leash, random(1, 0xFF) + 1);
  return leash;
};

var noop = function() {};

var testLeash = function(leash) {
  var event = random.object(leash);
  leash.serialize(event[0], event[1], function(err, obj) {
    leash.parse(obj, noop);
  });
};

var THRESHOLD = 500;

// benchmark a function
var bench = function(name, func) {
  var start = Date.now(), duration;
  var times = 10;

  while (times--)
    func();

  duration = Date.now() - start;
  console.log(name.red + ' completed'.green.bold + ' in ' + duration + 'ms');
};

bench('leash (precompiled)', function() {
  var leash = random.leash();
  leash.compile();
  for (var count = 1000; count--; ) {
    testLeash(leash);
  }
});

bench('leash (precompiled, typecheck)', function() {
  var leash = random.leash(true);
  leash.compile();
  for (var count = 1000; count--; ) {
    testLeash(leash);
  }
});

/*bench('leash (no-compilation)', function() {
  for (var count = 1000; count--; ) {
    var leash = random.leash();
    leash.compile();
    testLeash(leash);
  }
});*/

bench('json (built-in)', function() {
  for (var count = 1000; count--; ) {
    var data = JSON.parse(JSON.stringify(random.object()));
  }
});
