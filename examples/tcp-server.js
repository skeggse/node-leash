var net = require('net');
var crypto = require('crypto');
var protocol = require('./tcp-protocol');

// create the TCP server, passing a connection listener
var server = net.createServer(function(conn) {
  // hook up the protocol object like before
  conn.pipe(protocol);
  protocol.pipe(conn);

  // generate a cryptographically secure random 32-bit integer
  var id = crypto.randomBytes(4).readInt32BE(0);

  // ping the client with the given integer
  protocol.send('ping', {id: id});

  // wait for the client's reply
  protocol.on('ping', function(obj) {
    if (obj.id === id)
      console.log("Got client response", obj.id);
    else
      console.log("Client sent unknown ping packet");
    
    // and we're done!
    process.exit();
  });
});

// bind the server to port 3000
server.listen(3000);
