// I don't know what I was thinking.
// Actually, I do.  I just don't know why I thought it would work.
// I thought I could somehow write a pure-javascript implementation of
//   an integer-indexed Map and make it somehow faster than native maps.
// Well, I thought wrong.
// So this file is sorta useless.


// tiny linked list
// TODO: sort the linked lists for increased performance
var locate = function(cell, key) {
  while (cell.next) {
    if (cell.key === key)
      return cell;
    cell = cell.next;
  }
  return cell;
};

// binary search, where it is or where it should go
// cribbed from underscore.js, but a little lighter-weight
var sortedIndex = function(array, value) {
  var low = 0, high = array.length;
  while (low < high) {
    var mid = (low + high) >>> 1;
    if (array[mid] < value)
      low = mid + 1;
    else
      high = mid;
  }
  return low;
};

// array for insertion/replacement
// key and value as target
// map as read-only for options
var setValue = function(array, key, value, map) {
  var hash = key % array.length;
  if (array[hash]) {
    var cell = locate(array[hash], key);
    if (cell.key === key) {
      var old = cell.value;
      cell.value = value;
      return old;
    }
    cell.next = new Item(key, value);
  } else
    array[hash] = new Item(key, value);
  return map._null;
};

var Item = function Item(key, value) {
  this.key = key;
  this.value = value;
  this.next = null;
};

// integer map
var IntegerMap = function IntegerMap(options) {
  if (!(this instanceof IntegerMap))
    return new IntegerMap(options);
  // array storage for integer map
  this._data = new Array(options.size || 64);
  // internal length
  this._length = 0;
  // factor
  this._factor = options.maxLoadFactor || options.max_load_factor || 0.75;
  if (this._factor <= 0)
    throw new Error('maxLoadFactor out of bounds');
  // null value equivalent
  this._null = options.nullValue || undefined;
  // maintain a sorted set of keys
  this._track = options.sort || options.sortKeys || false;
  if (this._track) {
    this._keys = []; // Float64Array instead?
    this._trustKeys = options.trust || options.trustKeys || false;
  }
};

IntegerMap.prototype.__defineGetter__('length', function() {
  return this._length;
});

IntegerMap.prototype.put =
IntegerMap.prototype.set = function(key, value) {
  if (typeof key !== 'number' || (key | 0) !== key)
    throw new TypeError('key must be a number');
  if ((this._length + 1) / this._data.length > this._factor)
    this.rehash(this._data.length * 2);
  var old = setValue(this._data, key, value, this);
  if (old === this._null) {
    this._length++;
    if (this._track)
      this._keys.splice(sortedIndex(this._keys, key), 0, key);
  }
  return old;
};

IntegerMap.prototype.get = function(key) {
  if (typeof key !== 'number' || (key | 0) !== key)
    throw new TypeError('key must be a number');
  var hash = key % this._data.length;
  if (this._data[hash]) {
    var cell = locate(this._data[hash], key);
    if (cell.key === key)
      return cell.value;
  }
  return this._null;
};

IntegerMap.prototype.has = function(key) {
  if (typeof key !== 'number' || (key | 0) !== key)
    throw new TypeError('key must be a number');
  var hash = key % this._data.length;
  return !!(this._data[hash] && locate(this._data[hash], key).key === key);
};

IntegerMap.prototype.remove = function(key) {
  if (typeof key !== 'number' || (key | 0) !== key)
    throw new TypeError('key must be a number');
  var hash = key % this._data.length;
  if (this._data[hash]) {
    var cell = this._data[hash], prev;
    // hunt
    while (cell.next && cell.key !== key) {
      prev = cell;
      cell = cell.next;
    }
    // and destroy
    if (cell.key === key) {
      if (prev)
        prev.next = cell.next;
      else
        this._data[hash] = cell.next;
      if (this._track)
        this._keys.splice(sortedIndex(this._keys, key), 1);
      return cell.value;
    }
  }
  return this._null;
};

IntegerMap.prototype.clear = function() {
  this._data = new Array(this._data.length);
  this._length = 0;
  if (this._track)
    this._keys = [];
};

IntegerMap.prototype.isEmpty = function() {
  return this._length === 0;
};

IntegerMap.prototype.count =
IntegerMap.prototype.size = function() {
  return this._length;
};

IntegerMap.prototype.keys = function() {
  if (this._track) {
    // cheaper
    if (this._trustKeys)
      return this._keys;
    return this._keys.slice();
  }
  var keys = new Array(this._length), numKeys = 0;
  for (var i = 0; i < this._data.length; i++) {
    var cell = this._data[i];
    while (cell) {
      keys[numKeys++] = cell.key;
      cell = cell.next;
    }
  }
  return keys;
};

IntegerMap.prototype.rehash = function(n) {
  //if ((this._length + 1) / this._data.length > this._factor)
  if (n < this._data.length && this._length / n <= this._factor)
  // ideal
  var actual = this._length / this._data.length;
  var ideal = this._length / this._factor;
  if (actual < ideal || (n >= ideal && n !== actual)) {
    var data = new Array(Math.max(ideal, n));
    for (var i = 0; i < this._data.length; i++) {
      var cell = this._data[i];
      while (cell) {
        // TODO: reuse Item object
        setValue(data, cell.key, cell.value, this);
        cell = cell.next;
      }
    }
    return true;
  }
  return false;
};

IntegerMap.prototype.reserve = function(n) {
  // is this right? seems too trivial.
  return this.rehash(Math.ceil(n / this._factor));
};

IntegerMap.prototype.max_load_factor =
IntegerMap.prototype.maxLoadFactor = function(n) {
  if (n <= 0)
    throw new Error('maxLoadFactor out of bounds');
  this._factor = n;
};

module.exports = IntegerMap;
