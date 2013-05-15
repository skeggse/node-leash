node-leash
==========

A lightweight streaming parser and serializer for binary data in [node](http://nodejs.org).

`node-leash` attempts to simplify the maintenance of bidirectional protocols across binary streams by exposing a Duplex binary stream in the form of a "leash" that you can add events to.  Preliminary benchmarks show that this is up to twice as fast to encode and decode than JSON, and compresses to approximately one fourth the size, as it eliminates the info on the transfer of the structure of the data.

Supported data includes Numbers, Strings, and Buffers.  `node-leash` currently only facilitates the transfer of a single Object, no Arrays or simpler data--though specifying only one property on the object effectively transfers only one value.

```js
var Leash = require('node-leash');

var leash = new Leash();
leash.define(0, 'ping', {id: Leash.INT});
leash.define(1, 'chunk', {id: Leash.INT, data: Leash.BUFFER});
leash.define(2, 'message', {id: Leash.INT, message: Leash.STRING});
leash.define(3, 'initialize', {
  id: Leash.INT,
  x: Leash.DOUBLE,
  y: Leash.DOUBLE,
  z: Leash.DOUBLE,
  items: Leash.INT,
  chunk: Leash.BUFFER,
  type: Leash.BYTE,
  name: Leash.STRING
});

leash.send('ping', {id: 0x10});
leash.send('chunk', {id: 0x40, data: new Buffer('456786545678765a', 'hex')});
leash.send('message', {id: 0x80, message: "Hello, world!\n"});
leash.send('initialize', {
  id: 0x50,
  x: 14.5,
  y: 17.8,
  z: 9000,
  items: 418,
  chunk: new Buffer('3457876543457898357892357893782a', 'hex'),
  type: 0x5a,
  name: "Human 007"
});
```

## Installation

`node-leash` is packaged with the wonderful [npm](http://npmjs.org), making for easy installation and deployment.  npm is packaged with most distributions of node.

    $ npm install node-leash

Alternatively, you can acquire from source:

    $ git clone git://github.com/skeggse/node-leash.git

## Usage

### Data Types

`node-leash` currently supports 8, 16 and 32 bit big-endian integers (8-bit is unsigned), floats, doubles, utf-8 strings, and raw buffers.

### Streaming

`node-leash` is an extension of [Stream](http://nodejs.org/api/stream.html) for Node.js v0.10, and as such can be used with other streams via `pipe`.  Most importantly, `node-leash` can be used with the `net` module, providing automatic serialization and parsing of events across a network connection.  Additionally, `node-leash` makes use of the `readable-stream` module, which provides backwards-compatibility for Node.js v0.8

Check out examples for a complete example.

### TODO

- Add some form of JSON serialization, to handle transfer of objects?
- Add RPC!
- Improve index allocation to enhance protocol backwards compatibility
- Figure out support for [engine.io](https://github.com/LearnBoost/engine.io)
  - engine.io does not support binary data, only utf-8 strings.

### Notes

- Relies on [a pull request](https://github.com/visionmedia/should.js/pull/112) to should.js for `Object.should.approximate` for testing.

## License

### MIT License

> Copyright &copy; 2013 Eli Skeggs
> 
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
> 
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
> 
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
