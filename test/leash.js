var expect = require('expect.js');
var crypto = require('crypto');

var Leash = require('..');

var util = require('util');
var Assertion = expect.Assertion;

/**
 * Assert within value +- delta (inclusive).
 *
 * @param {Number} value
 * @param {Number} delta
 * @api public
 */

Assertion.prototype.approximate =
Assertion.prototype.approximately = function (value, delta) {
  this.assert(
      Math.abs(this.obj - value) <= delta
    , function(){ return 'expected ' + util.inspect(this.obj) + ' to be approximately ' + value + ' +- ' + delta }
    , function(){ return 'expected ' + util.inspect(this.obj) + ' to not be approximately ' + value + " +- " + delta });
  return this;
};

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
        expect(data).to.be.a(Buffer);
        done();
      });
    });

    it('should support NaN', function(done) {
      leash.encode('event-0', {prop1: NaN, prop2: crypto.randomBytes(9)}, function(err, data) {
        if (err)
          return done(err);
        expect(data).to.be.a(Buffer);
        done();
      });
    });

    it('should support Infinity', function(done) {
      leash.encode('event-0', {prop1: Infinity, prop2: crypto.randomBytes(9)}, function(err, data) {
        if (err)
          return done(err);
        expect(data).to.be.a(Buffer);
        done();
      });
    });

    it('should support -Infinity', function(done) {
      leash.encode('event-0', {prop1: -Infinity, prop2: crypto.randomBytes(9)}, function(err, data) {
        if (err)
          return done(err);
        expect(data).to.be.a(Buffer);
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
          expect(name).to.equal('event-0');
          expect(object).to.be.an('object');
          done();
        });
      });
    });
  });

  describe('reconstruct', function() {
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
        expect(name).to.equal('ping');
        expect(object).to.be.an('object');
        expect(object).to.only.have.property('id', objects.ping.id);
        done();
      });
    });

    it('should reconstruct a chunk packet', function(done) {
      leash.reconstruct('chunk', objects.chunk, function(err, name, object) {
        if (err)
          return done(err);
        expect(name).to.equal('chunk');
        expect(object).to.be.an('object');
        expect(object).to.only.have.keys('id', 'data');
        expect(object.id).to.equal(objects.chunk.id);
        expect(object.data).to.eql(objects.chunk.data);
        done();
      });
    });

    it('should reconstruct a message packet', function(done) {
      leash.reconstruct('message', objects.message, function(err, name, object) {
        if (err)
          return done(err);
        expect(name).to.equal('message');
        expect(object).to.be.an('object');
        expect(object).to.only.have.keys('id', 'message');
        expect(object.id).to.equal(objects.message.id);
        expect(object.message).to.equal(objects.message.message);
        done();
      });
    });

    it('should reconstruct an initialize packet', function(done) {
      leash.reconstruct('initialize', objects.initialize, function(err, name, object) {
        if (err)
          return done(err);
        expect(name).to.equal('initialize');
        expect(object).to.be.an('object');
        expect(object).to.only.have.keys('id', 'x', 'y', 'z', 'items', 'chunk', 'type', 'name', 'something');
        expect(object.id).to.equal(objects.initialize.id);
        expect(object.x).to.equal(objects.initialize.x);
        expect(object.y).to.equal(objects.initialize.y);
        expect(object.z).to.equal(objects.initialize.z);
        expect(object.items).to.equal(objects.initialize.items);
        expect(object.chunk).to.eql(objects.initialize.chunk);
        expect(object.type).to.equal(objects.initialize.type);
        expect(object.name).to.equal(objects.initialize.name);
        expect(object.something).to.approximate(objects.initialize.something, 1E-6);
        done();
      });
    });
  });
});
