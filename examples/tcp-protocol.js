// protocol.js is a shared resource for both client.js and server.js,
// registering the events in a central location

var Protocol = require('../protocol');

// creates a Protocol object
var protocol = module.exports = new Protocol();

// registers the ping event as packet 0x00
// the ping event has a singular integer id
protocol.event('ping', {id: protocol.INT});

// this is automatically called, but if you want to precompute...
protocol.compile();
