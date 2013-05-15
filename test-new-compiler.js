var Packet = require('./packet');

var object = {test: 14, test1: 256, test2: 72800, test3: 2378.4, test4: 4578324.2344,
  test5: "ON TOP OF THE WORLD BITCH", test6: new Buffer('9884531343', 'hex')};

var p = new Packet(0x00, 'combined', [['test', 0], ['test1', 1], ['test2', 2], ['test3', 3], ['test4', 4],
  ['test5', 5], ['test6', 6]]);

var data = p.encode(object);
console.log(data.toString('hex'));
console.log(p.decode(data));

var p = new Packet(0x01, 'static', [['test', 0], ['test1', 1], ['test2', 2], ['test3', 3], ['test4', 4]]);

var data = p.encode(object);
console.log(data.toString('hex'));
console.log(p.decode(data));

var p = new Packet(0xFFF, 'dynamic', [['test5', 5], ['test6', 6]]);

var data = p.encode(object);
console.log(data.toString('hex'));
console.log(p.decode(data));
