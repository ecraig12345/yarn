'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _asyncToGenerator2;

function _load_asyncToGenerator() {
  return _asyncToGenerator2 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));
}

var _config;

function _load_config() {
  return _config = _interopRequireDefault(require('./config.js'));
}

var _executeLifecycleScript;

function _load_executeLifecycleScript() {
  return _executeLifecycleScript = _interopRequireDefault(require('./util/execute-lifecycle-script.js'));
}

var _crypto;

function _load_crypto() {
  return _crypto = _interopRequireWildcard(require('./util/crypto.js'));
}

var _fs;

function _load_fs() {
  return _fs = _interopRequireWildcard(require('./util/fs.js'));
}

var _packageNameUtils;

function _load_packageNameUtils() {
  return _packageNameUtils = require('./util/package-name-utils.js');
}

var _pack;

function _load_pack() {
  return _pack = require('./cli/commands/pack.js');
}

var _semver;

function _load_semver() {
  return _semver = _interopRequireDefault(require('semver'));
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const fs = require('fs');
const invariant = require('invariant');
const path = require('path');

const INSTALL_STAGES = ['preinstall', 'install', 'postinstall'];

class PackageInstallScripts {
  constructor(config, resolver, force) {
    this.verboseScripts = config.verboseScripts;
    this.installed = 0;
    this.installablePkgs = 0;
    this.resolver = resolver;
    this.reporter = config.reporter;
    this.config = config;
    this.force = force;
    this.artifacts = {};
    this.timings = [];
  }

  setForce(force) {
    this.force = force;
  }

  setArtifacts(artifacts) {
    this.artifacts = artifacts;
  }

  getArtifacts() {
    return this.artifacts;
  }

  getInstallCommands(pkg) {
    const scripts = pkg.scripts;
    if (scripts) {
      const cmds = [];
      for (var _iterator = INSTALL_STAGES, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref;

        if (_isArray) {
          if (_i >= _iterator.length) break;
          _ref = _iterator[_i++];
        } else {
          _i = _iterator.next();
          if (_i.done) break;
          _ref = _i.value;
        }

        const stage = _ref;

        const cmd = scripts[stage];
        if (cmd) {
          cmds.push([stage, cmd]);
        }
      }
      return cmds;
    } else {
      return [];
    }
  }

  walk(loc) {
    var _this = this;

    return (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* () {
      const files = yield (_fs || _load_fs()).walk(loc, null, new Set(_this.config.registryFolders));
      const mtimes = new Map();
      for (var _iterator2 = files, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
        var _ref2;

        if (_isArray2) {
          if (_i2 >= _iterator2.length) break;
          _ref2 = _iterator2[_i2++];
        } else {
          _i2 = _iterator2.next();
          if (_i2.done) break;
          _ref2 = _i2.value;
        }

        const file = _ref2;

        mtimes.set(file.relative, file.mtime);
      }
      return mtimes;
    })();
  }

  saveBuildArtifacts(loc, pkg, beforeFiles, spinner) {
    var _this2 = this;

    return (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* () {
      const afterFiles = yield _this2.walk(loc);

      // work out what files have been created/modified
      const buildArtifacts = [];
      for (var _iterator3 = afterFiles, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
        var _ref4;

        if (_isArray3) {
          if (_i3 >= _iterator3.length) break;
          _ref4 = _iterator3[_i3++];
        } else {
          _i3 = _iterator3.next();
          if (_i3.done) break;
          _ref4 = _i3.value;
        }

        const _ref3 = _ref4;
        const file = _ref3[0];
        const mtime = _ref3[1];

        if (!beforeFiles.has(file) || beforeFiles.get(file) !== mtime) {
          buildArtifacts.push(file);
        }
      }

      if (!buildArtifacts.length) {
        // nothing else to do here since we have no build artifacts
        return;
      }

      // set build artifacts
      const ref = pkg._reference;
      invariant(ref, 'expected reference');
      _this2.artifacts[`${pkg.name}@${pkg.version}`] = buildArtifacts;
    })();
  }

  install(cmds, pkg, spinner, current) {
    var _this3 = this;

    return (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* () {
      const ref = pkg._reference;
      invariant(ref, 'expected reference');
      const locs = ref.locations;

      let onProgress;

      // Don't use the spinners if logging detailed timing info
      if (cmds.length > 0 && !_this3.verboseScripts) {
        onProgress = function onProgress(data) {
          const dataStr = data.toString() // turn buffer into string
          .trim(); // trim whitespace

          invariant(spinner && spinner.tick, 'We should have spinner and its ticker here');
          if (dataStr) {
            spinner.tick(dataStr
            // Only get the last line
            .substr(dataStr.lastIndexOf('\n') + 1)
            // change tabs to spaces as they can interfere with the console
            .replace(/\t/g, ' '));
          }
        };
      }

      try {
        for (var _iterator4 = cmds, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
          var _ref6;

          if (_isArray4) {
            if (_i4 >= _iterator4.length) break;
            _ref6 = _iterator4[_i4++];
          } else {
            _i4 = _iterator4.next();
            if (_i4.done) break;
            _ref6 = _i4.value;
          }

          const _ref5 = _ref6;
          const stage = _ref5[0];
          const cmd = _ref5[1];

          yield Promise.all(locs.map((() => {
            var _ref7 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* (loc, i) {
              const prefix = `[${current}${locs.length > 1 ? `(${i + 1})` : ''}/${_this3.installablePkgs}]`;
              const relativeLoc = loc.substr(loc.indexOf('node_modules'));
              const locInfo = locs.length > 1 ? ` (${_this3.reporter.format.gray(relativeLoc)})` : '';
              const pkgInfo = `${pkg.name}@${pkg.version}${locInfo}`;
              if (_this3.verboseScripts) {
                _this3.reporter.info(`${prefix} Running ${pkgInfo} ${stage} (${_this3.reporter.format.gray(cmd)})${locInfo}`);
              }
              const start = Date.now();

              var _ref8 = yield (0, (_executeLifecycleScript || _load_executeLifecycleScript()).default)({
                stage,
                config: _this3.config,
                cwd: loc,
                cmd,
                isInteractive: _this3.verboseScripts,
                onProgress
              });

              const stdout = _ref8.stdout;

              if (!_this3.verboseScripts) {
                _this3.reporter.verbose(stdout);
              }
              const time = Date.now() - start;
              _this3.timings.push({
                time,
                name: pkg.name,
                version: pkg.version,
                loc: relativeLoc,
                stage
              });

              const totalTime = (time / 1000).toFixed(2);
              if (_this3.verboseScripts) {
                _this3.reporter.info(`${prefix} Finished ${pkgInfo} ${stage} in ${totalTime}s`);
              }
            });

            return function (_x, _x2) {
              return _ref7.apply(this, arguments);
            };
          })()));
        }
      } catch (err) {
        err.message = `${locs.join(', ')}: ${err.message}`;

        invariant(ref, 'expected reference');

        if (ref.optional) {
          ref.ignore = true;
          ref.incompatible = true;
          _this3.reporter.warn(_this3.reporter.lang('optionalModuleScriptFail', err.message));
          _this3.reporter.info(_this3.reporter.lang('optionalModuleFail'));

          // Cleanup node_modules
          try {
            yield Promise.all(locs.map((() => {
              var _ref9 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* (loc) {
                yield (_fs || _load_fs()).unlink(loc);
              });

              return function (_x3) {
                return _ref9.apply(this, arguments);
              };
            })()));
          } catch (e) {
            _this3.reporter.error(_this3.reporter.lang('optionalModuleCleanupFail', e.message));
          }
        } else {
          throw err;
        }
      }
    })();
  }

  packageCanBeInstalled(pkg) {
    const cmds = this.getInstallCommands(pkg);
    if (!cmds.length) {
      return false;
    }
    if (this.config.packBuiltPackages && pkg.prebuiltVariants) {
      for (const variant in pkg.prebuiltVariants) {
        if (pkg._remote && pkg._remote.reference && pkg._remote.reference.includes(variant)) {
          return false;
        }
      }
    }
    const ref = pkg._reference;
    invariant(ref, 'Missing package reference');
    if (!ref.fresh && !this.force) {
      // this package hasn't been touched
      return false;
    }

    // Don't run lifecycle scripts for hoisted packages
    if (!ref.locations.length) {
      return false;
    }

    // we haven't actually written this module out
    if (ref.ignore) {
      return false;
    }
    return true;
  }

  runCommand(spinner, pkg) {
    var _this4 = this;

    return (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* () {
      const cmds = _this4.getInstallCommands(pkg);
      const current = ++_this4.installed;
      spinner.setPrefix(current, pkg.name);
      yield _this4.install(cmds, pkg, spinner, current);
    })();
  }

  // find the next package to be installed
  findInstallablePackage(workQueue, installed, connectionsToRemove) {
    for (var _iterator5 = workQueue, _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
      var _ref10;

      if (_isArray5) {
        if (_i5 >= _iterator5.length) break;
        _ref10 = _iterator5[_i5++];
      } else {
        _i5 = _iterator5.next();
        if (_i5.done) break;
        _ref10 = _i5.value;
      }

      const pkg = _ref10;

      const ref = pkg._reference;
      invariant(ref, 'expected reference');
      const deps = ref.dependencies;

      let dependenciesFulfilled = true;
      for (var _iterator6 = deps, _isArray6 = Array.isArray(_iterator6), _i6 = 0, _iterator6 = _isArray6 ? _iterator6 : _iterator6[Symbol.iterator]();;) {
        var _ref11;

        if (_isArray6) {
          if (_i6 >= _iterator6.length) break;
          _ref11 = _iterator6[_i6++];
        } else {
          _i6 = _iterator6.next();
          if (_i6.done) break;
          _ref11 = _i6.value;
        }

        const dep = _ref11;

        const pkgDep = this.resolver.getStrictResolvedPattern(dep);

        // We ignore dependencies that have been picked to break circular dependencies.
        if (connectionsToRemove.has(`${this.createPackageId(pkg)} -> ${this.createPackageId(pkgDep)}`)) {
          continue;
        }

        if (!installed.has(pkgDep)) {
          dependenciesFulfilled = false;
          break;
        }
      }

      // all dependencies are installed
      if (dependenciesFulfilled) {
        return pkg;
      }
    }

    return null;
  }

  worker(spinner, workQueue, installed, waitQueue, connectionsToRemove) {
    var _this5 = this;

    return (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* () {
      while (workQueue.size > 0) {
        // find a installable package
        const pkg = _this5.findInstallablePackage(workQueue, installed, connectionsToRemove);

        // can't find a package to install, register into waitQueue
        if (pkg == null) {
          spinner.clear();
          yield new Promise(function (resolve) {
            return waitQueue.add(resolve);
          });
          continue;
        }

        // found a package to install
        workQueue.delete(pkg);
        if (_this5.packageCanBeInstalled(pkg)) {
          yield _this5.runCommand(spinner, pkg);
        }
        installed.add(pkg);
        for (var _iterator7 = waitQueue, _isArray7 = Array.isArray(_iterator7), _i7 = 0, _iterator7 = _isArray7 ? _iterator7 : _iterator7[Symbol.iterator]();;) {
          var _ref12;

          if (_isArray7) {
            if (_i7 >= _iterator7.length) break;
            _ref12 = _iterator7[_i7++];
          } else {
            _i7 = _iterator7.next();
            if (_i7.done) break;
            _ref12 = _i7.value;
          }

          const workerResolve = _ref12;

          workerResolve();
        }
        waitQueue.clear();
      }
    })();
  }

  createPackageId(manifest) {
    return `${manifest.name} @ ${manifest.version}`;
  }

  addDependenciesToGraph(patterns, graph) {
    patterns.forEach(pattern => {
      const pkg = this.resolver.getStrictResolvedPattern(pattern);
      const packageId = this.createPackageId(pkg);

      if (graph.has(packageId)) {
        return;
      }

      const dependencies = !pkg._reference ? [] : pkg._reference.dependencies;
      const resolvedDependencies = dependencies.map(d => {
        const resolvedDependency = this.resolver.getStrictResolvedPattern(d);
        return this.createPackageId(resolvedDependency);
      });
      graph.set(packageId, new Set(resolvedDependencies));
      this.addDependenciesToGraph(dependencies, graph);
    });
  }

  detectCycles(mother, graph, ancestors, connectionsToRemove, visited) {
    if (visited.has(mother)) {
      return;
    }

    ancestors.add(mother);

    const children = graph.get(mother) || new Set();

    children.forEach(child => {
      if (ancestors.has(child)) {
        connectionsToRemove.add(`${mother} -> ${child}`);
        children.delete(child);
        return;
      }

      this.detectCycles(child, graph, ancestors, connectionsToRemove, visited);
    });

    ancestors.delete(mother);
    visited.add(mother);
  }

  getConnectionsToRemoveToGetAcyclicGraph(seedPatterns) {
    const dependencyGraph = new Map();
    this.addDependenciesToGraph(seedPatterns, dependencyGraph);
    const connectionsToRemove = new Set();

    const rootDependencies = seedPatterns.map(d => {
      const resolvedDependency = this.resolver.getStrictResolvedPattern(d);
      return `${resolvedDependency.name} @ ${resolvedDependency.version}`;
    });
    dependencyGraph.set('root', new Set(rootDependencies));
    this.detectCycles('root', dependencyGraph, new Set(), connectionsToRemove, new Set());
    return connectionsToRemove;
  }

  init(seedPatterns) {
    var _this6 = this;

    return (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* () {
      _this6.timings = [];
      const connectionsToRemove = _this6.getConnectionsToRemoveToGetAcyclicGraph(seedPatterns);

      const workQueue = new Set();
      const installed = new Set();
      const pkgs = _this6.resolver.getTopologicalManifests(seedPatterns);
      _this6.installablePkgs = 0;
      // A map to keep track of what files exist before installation
      const beforeFilesMap = new Map();
      for (var _iterator8 = pkgs, _isArray8 = Array.isArray(_iterator8), _i8 = 0, _iterator8 = _isArray8 ? _iterator8 : _iterator8[Symbol.iterator]();;) {
        var _ref13;

        if (_isArray8) {
          if (_i8 >= _iterator8.length) break;
          _ref13 = _iterator8[_i8++];
        } else {
          _i8 = _iterator8.next();
          if (_i8.done) break;
          _ref13 = _i8.value;
        }

        const pkg = _ref13;

        if (_this6.packageCanBeInstalled(pkg)) {
          const ref = pkg._reference;
          invariant(ref, 'expected reference');
          yield Promise.all(ref.locations.map((() => {
            var _ref18 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* (loc) {
              beforeFilesMap.set(loc, (yield _this6.walk(loc)));
              _this6.installablePkgs += 1;
            });

            return function (_x7) {
              return _ref18.apply(this, arguments);
            };
          })()));
        }
        workQueue.add(pkg);
      }

      if (_this6.verboseScripts) {
        _this6.reporter.disableProgress();
      }
      const workerCount = Math.min(_this6.installablePkgs, _this6.config.childConcurrency);
      const set = _this6.reporter.activitySet(_this6.installablePkgs, workerCount);

      // waitQueue acts like a semaphore to allow workers to register to be notified
      // when there are more work added to the work queue
      const waitQueue = new Set();
      yield Promise.all(set.spinners.map(function (spinner) {
        return _this6.worker(spinner, workQueue, installed, waitQueue, connectionsToRemove);
      }));
      // generate built package as prebuilt one for offline mirror
      const offlineMirrorPath = _this6.config.getOfflineMirrorPath();
      if (_this6.config.packBuiltPackages && offlineMirrorPath) {
        for (var _iterator9 = pkgs, _isArray9 = Array.isArray(_iterator9), _i9 = 0, _iterator9 = _isArray9 ? _iterator9 : _iterator9[Symbol.iterator]();;) {
          var _ref14;

          if (_isArray9) {
            if (_i9 >= _iterator9.length) break;
            _ref14 = _iterator9[_i9++];
          } else {
            _i9 = _iterator9.next();
            if (_i9.done) break;
            _ref14 = _i9.value;
          }

          const pkg = _ref14;

          if (_this6.packageCanBeInstalled(pkg)) {
            let prebuiltPath = path.join(offlineMirrorPath, 'prebuilt');
            yield (_fs || _load_fs()).mkdirp(prebuiltPath);
            const prebuiltFilename = (0, (_packageNameUtils || _load_packageNameUtils()).getPlatformSpecificPackageFilename)(pkg);
            prebuiltPath = path.join(prebuiltPath, prebuiltFilename + '.tgz');
            const ref = pkg._reference;
            invariant(ref, 'expected reference');
            const builtPackagePaths = ref.locations;

            yield Promise.all(builtPackagePaths.map((() => {
              var _ref15 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* (builtPackagePath) {
                // don't use pack command, we want to avoid the file filters logic
                const stream = yield (0, (_pack || _load_pack()).packWithIgnoreAndHeaders)(builtPackagePath);

                const hash = yield new Promise(function (resolve, reject) {
                  const validateStream = new (_crypto || _load_crypto()).HashStream();
                  stream.pipe(validateStream).pipe(fs.createWriteStream(prebuiltPath)).on('error', reject).on('close', function () {
                    return resolve(validateStream.getHash());
                  });
                });
                pkg.prebuiltVariants = pkg.prebuiltVariants || {};
                pkg.prebuiltVariants[prebuiltFilename] = hash;
              });

              return function (_x4) {
                return _ref15.apply(this, arguments);
              };
            })()));
          }
        }
      } else {
        // cache all build artifacts
        for (var _iterator10 = pkgs, _isArray10 = Array.isArray(_iterator10), _i10 = 0, _iterator10 = _isArray10 ? _iterator10 : _iterator10[Symbol.iterator]();;) {
          var _ref16;

          if (_isArray10) {
            if (_i10 >= _iterator10.length) break;
            _ref16 = _iterator10[_i10++];
          } else {
            _i10 = _iterator10.next();
            if (_i10.done) break;
            _ref16 = _i10.value;
          }

          const pkg = _ref16;

          if (_this6.packageCanBeInstalled(pkg)) {
            const ref = pkg._reference;
            invariant(ref, 'expected reference');
            const beforeFiles = ref.locations.map(function (loc) {
              return beforeFilesMap.get(loc);
            });
            yield Promise.all(beforeFiles.map((() => {
              var _ref17 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)(function* (b, index) {
                invariant(b, 'files before installation should always be recorded');
                yield _this6.saveBuildArtifacts(ref.locations[index], pkg, b, set.spinners[0]);
              });

              return function (_x5, _x6) {
                return _ref17.apply(this, arguments);
              };
            })()));
          }
        }
      }

      set.end();

      if (_this6.verboseScripts) {
        _this6.reporter.enableProgress();

        const format = _this6.reporter.format;
        _this6.reporter.info(`\n\n${format.bold(format.underline('Time taken by package scripts'))}\n`);

        const timingsHeader = ['Package', 'Version', 'Stage', 'Time', '  Location'];
        const timingsBody = _this6.timings.sort(function (a, b) {
          return a.name < b.name ? -1 : a.name > b.name ? 1 : (_semver || _load_semver()).default.lt(a.version, b.version) ? -1 : 1;
        }).map(function ({ name, version, loc, stage, time }) {
          let timeStr = `${(time / 1000).toFixed(2)}s`;
          if (time > 20 * 1000) {
            timeStr = format.bold(format.red(timeStr));
          } else if (time > 10 * 1000) {
            timeStr = format.bold(format.yellow(timeStr));
          }
          return [name, version, format.gray(stage), timeStr, '  ' + format.gray(loc)];
        });
        _this6.reporter.table(timingsHeader, [...timingsBody, Array(timingsHeader.length).fill('')]);
      }
    })();
  }
}
exports.default = PackageInstallScripts;