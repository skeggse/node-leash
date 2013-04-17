var net = require('net');
var crypto = require('crypto');
var protocol = require('./tcp-protocol');
var _ = require('underscore');

var log = console.log.bind(console);

// create the TCP server, passing a connection listener
var server = net.createServer(function(conn) {
  protocol.on('data', console.log.bind(console, 'protocol-out'));
  conn.on('data', console.log.bind(console, 'protocol-in'));

  // hook up the protocol object like before
  conn.pipe(protocol).pipe(conn);

  // create a random set of data
  var sourceData = crypto.randomBytes(19 + 16);
  var sourceObject = {
    a: sourceData[0],
    b: sourceData.readInt16BE(1),
    c: sourceData.readInt32BE(3),
    d: sourceData.readFloatBE(7),
    e: sourceData.readDoubleBE(11),
    f: sourceData.toString('hex', 19, 28),
    g: sourceData.slice(28)
  };

  log("src", sourceObject);

  // ping the client with the given integer
  protocol.send('test', sourceObject);

  // wait for the client's reply
  protocol.on('test', function(obj) {
    if (obj.a === sourceObject.a && obj.b === sourceObject.b &&
      obj.c === sourceObject.c && obj.d === sourceObject.d &&
      obj.e === sourceObject.e && obj.f === sourceObject.f &&
      obj.g.toString() === sourceObject.g.toString())
      log("Client response OK");
    else {
      log("Client response NOT OK");
      log(obj);
    }
    
    // and we're done!
    process.exit();
  });
});

// bind the server to port 3000
server.listen(3000);
