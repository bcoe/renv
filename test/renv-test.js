var should = require('chai').should(),
    expect = require('chai').expect,
    fs = require('fs'),
    REnv = require('../');

describe('Renv', function() {
  var renv = new REnv(),
    renv2 = new REnv({
      application: 'app2'
    })

  beforeEach(function(done) {
    renv.deleteEnvironment(function(err) {
      return done();
    })
  });

  describe('set', function() {
    it('sets environment variable for environment', function(done) {
      renv.set('FOO', 'bar', function(err, value) {
        value.node.key.should.equal('/app/development/FOO');
        value.node.value.should.equal('bar');
        return done();
      });
    });

    it('updates environment variable if called twice', function(done) {
      renv.set('FOO', 'bar')
        .then(function() {
          return renv.set('FOO', 'foo');
        })
        .then(function() {
          renv.get('FOO', function(err, value) {
            value.should.equal('foo');
            return done();
          });
        }).done();
    });

    it('can set an array of key value pairs', function(done) {
      renv.set(['FOO', 'bar', 'BAR', 'apple'], function() {
        renv.getEnvironment(function(err, environment) {
          environment.FOO.should.equal('bar');
          environment.BAR.should.equal('apple');
          return done();
        });
      });
    });

    it('can handle key value pairs separated by =', function(done) {
      renv.set(['FOO', 'blarg', 'BAR=snuh'], function() {
        renv.getEnvironment(function(err, environment) {
          environment.FOO.should.equal('blarg');
          environment.BAR.should.equal('snuh');
          return done();
        });
      });
    });

    it('can handle keys with object notation', function(done) {
      renv.set('FOO.bar.monkey', 'blerg', function() {
        renv.getEnvironment(function(err, environment) {
          environment.FOO.bar.monkey.should.equal('blerg');
          return done();
        });
      });
    });

    it('can handle keys in an array having object notation', function(done) {
      renv.set(['FOO.bar', 'apple', 'BAR.foo=snuh'], function() {
        renv.getEnvironment(function(err, environment) {
          environment.FOO.bar.should.equal('apple');
          environment.BAR.foo.should.equal('snuh');
          return done();
        });
      });
    });
  });

  describe('get', function() {
    it('returns null if the key is missing', function(done) {
      renv.get('FOO', function(err, value) {
        expect(value).to.equal(null);
        return done();
      });
    });

    it('returns value if it is set', function(done) {
      renv.set('FOO', 'bar')
        .then(function() {
          return renv.get('FOO');
        })
        .then(function(value) {
          value.should.equal('bar');
          return done();
        }).done();
    });
  });

  describe('getEnvironment', function() {
    it('returns an empty object if environment has no keys set', function(done) {
      renv.getEnvironment(function(err, environment) {
        environment.should.deep.equal({});
        return done();
      });
    });

    it('returns object representing all keys and values in environment', function(done) {
      renv.set('FOO', 'bar')
        .then(function() {
          return renv.set('BAR', 'foo');
        })
        .then(function() {
          return renv.getEnvironment(function(err, environment) {
            environment.should.deep.equal({
              FOO: 'bar',
              BAR: 'foo'
            });
            return done();
          });
        }).done();
    });

    it('can be used to fetch all environments', function(done) {
      renv.set('FOO', 'bar')
        .then(function() {
          return renv2.set('FOO', 'snuh');
        })
        .then(function() {
          return renv.getEnvironment('/')
        })
        .then(function(environment) {
          environment.app.development.FOO.should.equal('bar');
          environment.app2.development.FOO.should.equal('snuh');
          return done();
        });
    });
  });

  describe('del', function() {
    it('deletes a key', function(done) {
      renv.set('FOO', 'bar')
        .then(function() {
          return renv.del('FOO');
        })
        .then(function(value) {
          return renv.get('FOO')
        })
        .then(function(value) {
          expect(value).to.equal(null);
          return done();
        }).done();
    });

    it('if key does not exist, returns an error', function(done) {
      renv.del('FOO', function(err, result) {
        err.message.should.equal('Key not found');
        return done();
      });
    });

    it('allows an object to be deleted', function(done) {
      renv.setObject({FOO: {BAR: 'foo'}})
        .then(function() {
          return renv.del('FOO');
        })
        .then(function() {
          return renv.getEnvironment();
        })
        .then(function(environment) {
          environment.should.deep.equal({});
          return done();
        }).done();
    });

    it('allows an array of keys to be deleted', function(done) {
      renv.setObject({FOO: '33', BAR: '88'})
        .then(function() {
          return renv.del(['FOO', 'BAR']);
        })
        .then(function() {
          return renv.getEnvironment();
        })
        .then(function(environment) {
          environment.should.deep.equal({});
          return done();
        }).done();
    });

    it('allows a key to be deleted based on dot notation', function(done) {
      renv.setObject({FOO: {BAR: '33', SNUH: 'apple'}})
        .then(function() {
          return renv.del('FOO.SNUH');
        })
        .then(function() {
          return renv.getEnvironment();
        })
        .then(function(environment) {
          environment.should.deep.equal({
            FOO: {BAR: '33'}
          });
          return done();
        }).done();
    });
  });

  describe('setObject', function() {
    it('sets all keys and values in an object', function(done) {
      var obj = {
        foo: {
          bar: 'hello',
          value: 'http://example.com',
          nested: 'more'
        },
        bar: {
          test: '33'
        }
      }

      renv.setObject(obj)
        .then(function() {
          return renv.getEnvironment();
        })
        .then(function(environment) {
          environment.should.deep.equal(obj);
          return done();
        }).done();
    });

    it('encodes and decodes arrays', function(done) {
      var obj = {
        bar: {
          test: ['33', 'http://example.com']
        }
      }

      renv.setObject(obj)
        .then(function() {
          return renv.getEnvironment();
        })
        .then(function(environment) {
          environment.should.deep.equal(obj);
          return done();
        }).done();
    });

    it('handles encoding large real-world JSON file', function(done) {
      var obj = require('./fixtures/service');

      renv.setObject(obj, function(err) {
        renv.getEnvironment(function(err, environment) {
          environment.should.deep.equal(obj);
          return done();
        });
      });
    });

    it('allows a key to be set to an object', function(done) {
      var obj = require('./fixtures/service');

      renv.setObject(obj, 'foo')
        .then(function() {
          return renv.getEnvironment();
        })
        .then(function(environment) {
          environment.foo.should.deep.equal(obj);
          return done();
        }).done();
    });

    it('allows an inner key to be set with dot notation', function(done) {
      var obj = require('./fixtures/service');

      renv.setObject(obj, 'foo.bar')
        .then(function() {
          return renv.getEnvironment();
        })
        .then(function(environment) {
          environment.foo.bar.should.deep.equal(obj);
          return done();
        }).done();
    });
  });
});
