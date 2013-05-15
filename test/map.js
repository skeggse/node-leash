var should = require('should');
var _ = require('underscore');
var IntegerMap = require('../map');

var NIL = {};

describe('IntegerMap', function() {
  var map;

  beforeEach(function() {
    map = new IntegerMap({
      nullValue: NIL
    });
  });

  it('should start empty', function() {
    map.isEmpty().should.be.true;
    map.length.should.equal(0);
    map.size().should.equal(0);
  });

  describe('#set', function() {
    it('should throw for non-integer keys', function() {
      (function() {
        map.set(false, true);
      }).should.throw();
      (function() {
        map.set(0.4, true);
      }).should.throw();
    });

    it('should return null when inserting', function() {
      map.set(145, 'test').should.equal(NIL);
    });

    it('should return old value when replacing', function() {
      map.set(876, 'test').should.equal(NIL);
      map.length.should.equal(1);
      map.set(876, 'sometimes').should.equal('test');
      map.length.should.equal(1);
    });

    it('should properly change length', function() {
      map.set(124, 'test');
      map.set(456, 'never');
      map.set(456 + 64, 'map');
      map.length.should.equal(3);
      map.set(456, 'always');
      map.length.should.equal(3);
    });
  });

  describe('#get', function() {
    it('should throw for non-integer keys', function() {
      (function() {
        map.get(false);
      }).should.throw();
      (function() {
        map.get(0.4);
      }).should.throw();
    });

    it('should return null for unset keys', function() {
      map.get(145).should.equal(NIL);
    });

    it('should return null for removed keys', function() {
      map.set(234, 'test');
      map.remove(234, 'test');
      map.get(234).should.equal(NIL);
    });

    it('should return the correct value', function() {
      map.set(234, 'maybe');
      map.get(234).should.equal('maybe');
    });

    it('should return the correct replaced value', function() {
      map.set(234, 'test');
      map.set(234, 'hello');
      map.get(234).should.equal('hello');
    });
  });

  describe('#has', function() {
    it('should throw for non-integer keys', function() {
      (function() {
        map.has(false);
      }).should.throw();
      (function() {
        map.has(0.4);
      }).should.throw();
    });

    it('should return the appropriate value', function() {
      should.strictEqual(map.has(768), false);
      map.set(768, null);
      map.set(769, false);
      map.set(770, true);
      map.set(771, 'true');
      map.set(772, {});
      map.remove(769);
      should.strictEqual(map.has(768), true);
      should.strictEqual(map.has(769), false);
      should.strictEqual(map.has(770), true);
      should.strictEqual(map.has(771), true);
      should.strictEqual(map.has(772), true);
    });
  });

  describe('#remove', function() {
    it('should throw for non-integer keys', function() {
      (function() {
        map.remove(false);
      }).should.throw();
      (function() {
        map.remove(0.4);
      }).should.throw();
    });

    it('should return null for unset keys', function() {
      map.remove(124).should.equal(NIL);
    });

    it('should return the previous value', function() {
      map.set(124, 'leash');
      map.remove(124).should.equal('leash');
    });

    it('should remove the correct value', function() {
      map.set(37, 'test');
      map.set(37 + 64, 'save me!');
      map.remove(37).should.equal('test');
      map.set(37, 'hello');
      map.remove(37).should.equal('hello');
      map.remove(37 + 128).should.equal(NIL);
      map.get(37 + 64).should.equal('save me!');
    });
  });

  describe('#clear', function() {
    it('should clear the map', function() {
      map.set(321, 'clear');
      map.clear();
      map.length.should.equal(0);
      map.isEmpty().should.be.true;
      map.get(321).should.equal(NIL);
    });
  });

  describe('#keys', function() {
    var keys;

    beforeEach(function() {
      // create some random keys
      keys = new Array(24);
      for (var i = 0; i < 24; i++)
        keys[i] = (Math.random() * 100 + 100) | 0;
      keys.sort();
      keys = _.unique(keys, true);
      // hack to track keys
      map._track = true;
      map.clear();
    });

    it('should return all set keys', function() {
      for (var i = 0; i < keys.length; i++)
        map.set(keys[i], Math.random());
      map.keys().should.eql(keys);
    });

    it('should not return unset keys', function() {
      for (var i = 0; i < keys.length; i++)
        map.set(keys[i], Math.random());
      map.remove(keys[2]);  keys.splice(2, 1);
      map.remove(keys[4]);  keys.splice(4, 1);
      map.remove(keys[8]);  keys.splice(8, 1);
      map.keys().should.eql(keys);
    });
  });

  // TODO: check rehash/reserve

  // wishful thinking
  /*describe('timing operations', function() {
    it('should be faster than Object for retrieval', function() {
      var object = {};
      map.reserve(100000);
      for (var i = 248577; i < 348577; i++) {
        map.set(i, 'HI THERE' + i);
        object[i] = 'Hi THERE' + i;
      }
      var so, eo, sm, em, v;
      so = Date.now();
      for (var i = 248577; i < 348577; i++) {
        v = object[i];
      }
      sm = (eo = Date.now());
      for (var i = 248577; i < 348577; i++) {
        v = map._data[i % map._data.length];
      }
      em = Date.now();
      var objectTime = eo - so, mapTime = em - sm;
      console.log(mapTime, objectTime);
      // dang
      mapTime.should.be.below(objectTime);
    });
  });*/

  describe('bulk operations', function() {
    it('should survive a thousand keys', function() {
      map.reserve(1000);
      for (var i = 24857; i < 25857; i++)
        map.set(i, 'HI THERE' + i);
      map.length.should.equal(1000);
      map.isEmpty().should.be.false;
      for (var i = 24857; i < 25857; i++)
        map.get(i).should.equal('HI THERE' + i);
    });

    it('should survive ten thousand keys', function() {
      map.reserve(10000);
      for (var i = 248577; i < 258577; i++)
        map.set(i, 'HI THERE' + i);
      map.length.should.equal(10000);
      map.isEmpty().should.be.false;
      for (var i = 248577; i < 258577; i++)
        map.get(i).should.equal('HI THERE' + i);
    });

    /*it('should survive a hundred thousand keys', function() {
      map.reserve(100000);
      for (var i = 248577; i < 348577; i++)
        map.set(i, 'HI THERE' + i);
      map.length.should.equal(100000);
      map.isEmpty().should.be.false;
      for (var i = 248577; i < 348577; i++)
        map.get(i).should.equal('HI THERE' + i);
    });*/
  });
});
