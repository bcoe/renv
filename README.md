# renv

[![Build Status](https://travis-ci.org/bcoe/renv.png)](https://travis-ci.org/bcoe/renv)
[![Coverage Status](https://coveralls.io/repos/bcoe/renv/badge.svg?branch=)](https://coveralls.io/r/bcoe/renv?branch=)


A dead simple command line interface for managing remote configuration. Powered by[etcd](https://github.com/coreos/etcd), inspired by [heroku](https://devcenter.heroku.com/articles/config-vars).

renv gives you:

* a heroku-inspired interface (`config:set`, `config:unset`).
* tools for managing your environment using JSON configuration files (`config:import`).

## Core Concepts

### config paths

renv prefixes the configuration it stores with `/:application/:environment`, where:

* `application`: is the application that you wish to store configuration for.
  (it tries to grab this out of a package.json).
* `environment`: is the environment to store the configuration for, e.g.,
  `development`, `production`, `test`.

this is opinionated, but it works dang it!

### how JSON is represented

rather than serializing JSON to a single key, renv uses directories in
`etcd` to store a representation of the imported JSON file.

This is cool because:

* you can listen for changes on individual keys.
* you can modify keys atomically.

## The API

### `config`

List all configuration for a given `application`, and `environment`.

Use `--output json`, to dump the configuration to disk:

`renv config --environment production --output json > service.json`.

### `config:set`

Set a single configuration variable:

`renv config:set URL=http://www.example.com`

Set multiple configuration variables:

`renv config:set URL=http://www.example.com TIMEOUT=5000`

Creating or updating an object:

`renv config:set OBJ.x 33 OBJ.y 99`

Creating or updating an array:

`renv config:set ARR.0 33 ARR.1 99`

### `config:unset`

Delete a single configuration variable:

`renv config:unset OBJ`

Delete multiple configuration variables:

`renv config:unset OBJ ARR`

### `config:import`

Import a JSON file and create keys and directories recursively.

`renv config:import ./test/fixtures/service.json`

### `config:nuke`

nuke all configuration for the current `application` and `environment`

__Danger, Will Robinson.__

`renv config:nuke`

### `config:dump`

Dump configuration for all applications and environments:

`renv config:dump`
