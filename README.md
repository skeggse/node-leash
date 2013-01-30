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

    $ npm install node-leash

## Usage

### Data Types

`node-leash` currently supports 8, 16 and 32 bit big-endian integers, floats, doubles, utf-8 strings, and raw buffers.
