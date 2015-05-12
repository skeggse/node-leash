var should = require('should');
var Leash = require('..');
var crypto = require('crypto');

describe('Leash', function() {
  var leash;

  beforeEach(function() {
    leash = new Leash();
  });

  describe('#encode', function() {
    beforeEach(function() {
      leash.define(0, 'event-0', {prop1: 3, prop2: 6});
      leash.define(1, 'event-1', {prop3: 0, prop4: 1, prop5: 2, prop6: 4, prop7: 5});
      leash.define(0x7F, 'all', {prop3: 0, prop4: 1, prop5: 2, prop1: 3, prop6: 4, prop7: 5, prop2: 6});

      leash.compile();
    });

    it('should call back', function(done) {
      leash.encode('event-0', {prop1: 0.8, prop2: crypto.randomBytes(9)}, function() {
        done();
      });
    });

    it('should call back without error', function(done) {
      leash.encode('event-0', {prop1: 0.8, prop2: crypto.randomBytes(9)}, done);
    });

    it('should call back with buffer', function(done) {
      leash.encode('event-0', {prop1: 0.8, prop2: crypto.randomBytes(9)}, function(err, data) {
        if (err)
          return done(err);
        data.should.be.an.instanceOf(Buffer);
        done();
      });
    });

    it('should fail with NaN', function(done) {
      leash.encode('event-0', {prop1: NaN, prop2: crypto.randomBytes(9)}, function(err, data) {
        err.should.be.an.instanceOf(Error);
        done();
      });
    });

    it('should fail with Infinity', function(done) {
      leash.encode('event-0', {prop1: Infinity, prop2: crypto.randomBytes(9)}, function(err, data) {
        err.should.be.an.instanceOf(Error);
        done();
      });
    });

    it('should fail with -Infinity', function(done) {
      leash.encode('event-0', {prop1: -Infinity, prop2: crypto.randomBytes(9)}, function(err, data) {
        err.should.be.an.instanceOf(Error);
        done();
      });
    });
  });

  describe('#decode', function() {
    beforeEach(function() {
      leash.define(0, 'event-0', {prop1: 3, prop2: 6});
      leash.define(1, 'event-1', {prop3: 0, prop4: 1, prop5: 2, prop6: 4, prop7: 5});
      leash.define(0x7F, 'all', {prop3: 0, prop4: 1, prop5: 2, prop1: 3, prop6: 4, prop7: 5, prop2: 6});

      leash.compile();
    });

    it('should call back', function(done) {
      leash.encode('event-0', {prop1: 0.8, prop2: crypto.randomBytes(9)}, function(err, data) {
        if (err)
          return done(err);
        leash.decode(data, function() {
          done();
        });
      });
    });

    it('should call back without error', function(done) {
      leash.encode('event-0', {prop1: 0.8, prop2: crypto.randomBytes(9)}, function(err, data) {
        if (err)
          return done(err);
        leash.decode(data, done);
      });
    });

    it('should call back with name and object', function(done) {
      var bytes = crypto.randomBytes(9);
      leash.encode('event-0', {prop1: 0.8, prop2: bytes}, function(err, data) {
        if (err)
          return done(err);
        leash.decode(data, function(err, name, object) {
          if (err)
            return done(err);
          name.should.equal('event-0');
          should.exist(object);
          object.should.be.a('object');
          done();
        });
      });
    });
  });

  describe('#reconstruct', function() {
    var objects = {};

    objects.ping = {id: (Math.random() * 1024) | 0};
    objects.chunk = {id: (Math.random() * 1024) | 0, data: crypto.randomBytes(17)};
    objects.message = {id: (Math.random() * 1024) | 0, message: "QUANTUM LEAP"};
    objects.initialize = {
      id: (Math.random() * 1024) | 0,
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      items: (Math.random() * 16 + 4) | 0,
      chunk: crypto.randomBytes(1024),
      type: crypto.randomBytes(1)[0],
      name: "human-007",
      something: Math.random()
    };

    beforeEach(function() {
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
        name: Leash.STRING,
        something: Leash.FLOAT
      });
    });

    it('should reconstruct a ping packet', function(done) {
      leash.reconstruct('ping', objects.ping, function(err, name, object) {
        if (err)
          return done(err);
        name.should.equal('ping');
        should.exist(object);
        object.should.be.a('object').and.have.keys('id');
        object.id.should.equal(objects.ping.id);
        done();
      });
    });

    it('should reconstruct a chunk packet', function(done) {
      leash.reconstruct('chunk', objects.chunk, function(err, name, object) {
        if (err)
          return done(err);
        name.should.equal('chunk');
        should.exist(object);
        object.should.be.a('object').and.have.keys('id', 'data');
        object.id.should.equal(objects.chunk.id);
        object.data.should.be.an.instanceof(Buffer).and.eql(objects.chunk.data);
        done();
      });
    });

    it('should reconstruct a message packet', function(done) {
      leash.reconstruct('message', objects.message, function(err, name, object) {
        if (err)
          return done(err);
        name.should.equal('message');
        should.exist(object);
        object.should.be.a('object').and.have.keys('id', 'message');
        object.id.should.equal(objects.message.id);
        object.message.should.equal(objects.message.message);
        done();
      });
    });

    it('should reconstruct an initialize packet', function(done) {
      leash.reconstruct('initialize', objects.initialize, function(err, name, object) {
        if (err)
          return done(err);
        name.should.equal('initialize');
        should.exist(object);
        object.should.be.a('object').and.have.keys('id', 'x', 'y', 'z', 'items', 'chunk', 'type', 'name', 'something');
        object.id.should.equal(objects.initialize.id, 'id');
        object.x.should.equal(objects.initialize.x, 'x');
        object.y.should.equal(objects.initialize.y, 'y');
        object.z.should.equal(objects.initialize.z, 'z');
        object.items.should.equal(objects.initialize.items, 'items');
        object.chunk.should.eql(objects.initialize.chunk, 'chunk');
        object.type.should.equal(objects.initialize.type, 'type');
        object.name.should.equal(objects.initialize.name, 'name');
        object.something.should.approximate(objects.initialize.something);
        done();
      });
    });
  });
});
