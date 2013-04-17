var net = require('net');
var protocol = require('./tcp-protocol');
var Readable = require('readable-stream');

// create the TCP socket, connecting to localhost on port 3000
var conn = net.connect(3000, 'localhost');

protocol.on('data', console.log.bind(console, 'protocol-out'));
conn.on('data', console.log.bind(console, 'protocol-in'));

// pipe all data from the connection through the protocol
// this causes protocol to emit events such as 'ping'
conn.pipe(protocol);

// pipe all serialized data from the protocol stream to the connection
protocol.pipe(conn);

// the above two steps could be combined into conn.pipe(protocol).pipe(conn);

// listen for a ping event from the server
protocol.on('test', function(obj) {
  console.log("Got server test", obj);

  // immediately send the corresponding packet back to the server
  protocol.send('test', obj);
  
  // and we're done!
  process.exit();
});
