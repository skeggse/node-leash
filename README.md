node-leash
==========

A lightweight streaming parser and serializer for binary data in [node](http://nodejs.org).

```
var Protocol = require('protocol');

var protocol = new Protocol();
protocol.event('ping', {id: protocol.INT});
protocol.event('chunk', {id: protocol.INT, data: protocol.BUFFER});
protocol.event('message', {id: protocol.INT, message: protocol.STRING});
protocol.event('initialize', {id: protocol.INT, x: protocol.DOUBLE, y: protocol.DOUBLE, z: protocol.DOUBLE, items: protocol.INT, chunk: protocol.BUFFER, type: protocol.BYTE, name: protocol.STRING});

protocol.send('ping', {id: 0x10});
protocol.send('chunk', {id: 0x40, data: new Buffer('456786545678765a', 'hex')});
protocol.send('message', {id: 0x80, message: "Hello, world!\n"});
protocol.send('initialize', {id: 0x50, x: 14.5, y: 17.8, z: 9000, items: 418, chunk: new Buffer('3457876543457898357892357893782a', 'hex'), type: 0x5a, name: "Human 007"});
```

## Installation

`node-leash` is packaged with the wonderful [npm](http://npmjs.org), making for easy installation and deployment.  npm is packaged with most distributions of node.

    $ npm install node-leash

Alternatively, you can "build" from source, although you won't be doing much building:

    $ git clone git://github.com/skeggse/node-leash.git

## Usage

### Data Types

`node-leash` currently supports 8, 16 and 32 bit big-endian integers, floats, doubles, utf-8 strings, and raw buffers.

### Streaming

`node-leash` is an extension of [Stream](http://nodejs.org/api/stream.html), and as such can be used with other streams via `pipe`.  Most importantly, `node-leash` can be used with the `net` module, providing automatic serialization and parsing of events across a network connection.

Check out examples/tcp-*.js for a complete example.

## About

`node-leash` was created as a helper library for the upcoming `node-bulldog`, a robust khashmir-based DHT implementation for node.

### TODO

- Add unittests!
- Enhance ReadableStream implementation!
- Add some form of JSON serialization, to handle transfer of objects?
- Add RPC!

## License

### LGPL 2.1 License

> Copyright &copy; 2012 Eli Skeggs
> 
> This library is free software; you can redistribute it and/or
> modify it under the terms of the GNU Lesser General Public
> License as published by the Free Software Foundation; either
> version 2.1 of the License, or (at your option) any later version.
> 
> This library is distributed in the hope that it will be useful,
> but WITHOUT ANY WARRANTY; without even the implied warranty of
> MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
> Lesser General Public License for more details.
> 
> You should have received a copy of the GNU Lesser General Public
> License along with this library; if not, see
> http://www.gnu.org/licenses/lgpl-2.1.html
