var _ = require('lodash'),
  Etcd = require('node-etcd'),
  Promise = require('bluebird'),
  traverse = require('traverse'),
  quack = require('quack-array');

function REnv(opts) {
  _.extend(this, {
    application: 'app',
    environment: 'development',
    etcd: {
      hosts: ['127.0.0.1:4001'],
      ssloptions: {}
    }
  }, opts);

  if (!this.client) this.client = this.createClient();
}

// create the etcd client.
REnv.prototype.createClient = function() {
  return new Etcd(
    this.etcd.hosts,
    Object.keys(this.etcd.ssloptions).length ? this.etcd.ssloptions : undefined
  );
};

// set a key in the environment.
REnv.prototype.set = function(key, value, cb) {
  var _this = this;

  if (typeof value === 'function') [cb, value] = [value, cb];

  if (Array.isArray(key)) {
    key = this._expandEquals(key);

    return Promise.all(
      _.chunk(key, 2).map(pair => {
        return this.set(pair[0], pair[1])
      })
    ).nodeify(cb);
  } else if (typeof key === 'object') {
    return this.setObject(key).nodeify(cb);
  } else if (~key.indexOf('.')) {
    var obj = {};
    traverse(obj).set(key.split('.'), value);
    return this.set(obj).nodeify(cb);
  } else {
    key = this._buildKey() + key;

    return new Promise(function(resolve, reject) {
      _this.client.set(key, value, function(err, result) {
        if (err) reject(err);
        else resolve(result);
      });
    }).nodeify(cb);
  }
};

// treat arguments seperated by equal sign as
// two arguments.
REnv.prototype._expandEquals = function(arr) {
  var result = [];
  arr.forEach(value => {result.push.apply(result, ('' + value).split('='))});
  return result;
};

REnv.prototype.mkdir = function(dir, cb) {
  var _this = this,
    dir = this._buildKey() + dir;

  return new Promise(function(resolve, reject) {
    _this.client.mkdir(dir, function(err, result) {
      if (err && err.errorCode === 102) return resolve(); // already exists.
      else if (err) reject(err);
      else resolve(result);
    });
  }).nodeify(cb);
};

REnv.prototype._buildKey = function() {
  return '/' + this.application + '/' + this.environment + '/';
};

// fetch a single key.
REnv.prototype.get = function(key, cb) {
  var _this = this,
    key = this._buildKey() + key;

  return new Promise(function(resolve, reject) {
    _this.client.get(key, function(err, result) {
      if (err && err.errorCode === 100) resolve(null);
      else if (err) reject(err);
      else resolve(result.node.value);
    });
  }).nodeify(cb);
};

// return all key value pairs in enviornment.
REnv.prototype.getEnvironment = function(key, cb) {
  if (typeof key === 'function') [cb, key] = [key, cb];

  var _this = this,
    environment = {},
    key = key || this._buildKey(),
    node = null,
    nodes = [];

  return new Promise(function(resolve, reject) {
    _this.client.get(key, {recursive: true}, function(err, result) {
      if (err && err.errorCode === 100) resolve({});
      else if (err) reject(err);
      else {
        if (!result.node.nodes) return resolve({});

        result.node.nodes.forEach(node => {nodes.push(node)});

        // recursively walk the nodes, and
        // rebuild an object.
        while (nodes.length) {
          node = nodes.pop();
          if (node.dir && node.nodes) {
            node.nodes.forEach(node => {nodes.push(node)});
          } else {
            if (node.dir) node.value = {};
            traverse(environment).set(node.key.replace(key, '').split('/'), node.value);
          }
        }

        return resolve(quack.deep(environment));
      }
    });
  }).nodeify(cb);
};

REnv.prototype.setObject = REnv.prototype.setEnvironment = function(obj, cb) {
  var paths = traverse(obj).paths();

  return Promise.each(paths, path => {
    var key = path.join('/'),
      value = traverse(obj).get(path);

    if (typeof value === 'object') {
      return this.mkdir(key, '');
    } else {
      return this.set(key, value);
    }
  }).nodeify(cb);
};

REnv.prototype.del = function(key, cb) {
  if (Array.isArray(key)) {
    return Promise.all(
      _.map(key, k => {return this.del(k);})
    );
  } else {
    return this._del(key, {recursive: true})
      .nodeify(cb);
  }
};

// delete all keys in the environment.
REnv.prototype.deleteEnvironment = function(cb) {
  return this._del('', {recursive: true}).nodeify(cb);
};

// helper used by delete and delete environment.
REnv.prototype._del = function(key, opts) {
  var _this = this,
    path = this._buildKey() + key;

  return new Promise(function(resolve, reject) {
    _this.client.delete(path, opts, function(err, result) {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

module.exports = REnv;
