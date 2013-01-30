var net = require('net');
var protocol = require('./tcp-protocol');

// create the TCP socket, connecting to localhost on port 3000
var conn = net.connect(3000, 'localhost');

// pipe all data from the connection through the protocol
// this causes protocol to emit events such as 'ping'
conn.pipe(protocol);

// pipe all serialized data from the protocol stream to the connection
protocol.pipe(conn);

// listen for a ping event from the server
protocol.on('ping', function(obj) {
  console.log("Got server ping", obj.id);

  // immediately send the corresponding packet back to the server
  protocol.send('ping', {id: obj.id});
  
  // and we're done!
  process.exit();
});
