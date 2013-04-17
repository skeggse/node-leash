// protocol.js is a shared resource for both client.js and server.js,
// registering the events in a central location

var Protocol = require('../leash');

// creates a Protocol object
var protocol = module.exports = new Protocol();

// registers the test event as packet 0x00
// the test event has every available datatype
protocol.event('test', {
  a: Protocol.BYTE,
  b: Protocol.SHORT,
  c: Protocol.INT,
  d: Protocol.FLOAT,
  e: Protocol.DOUBLE,
  f: Protocol.STR,
  g: Protocol.BUF
});

// this is automatically called, but if you want to precompute...
protocol.compile();
