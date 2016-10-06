/*jshint node:true*/
'use strict';

var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var async = require('async');
var utils = require('./utils');

/*
 *! Processor methods
 */


module.exports = function (proto) {

    /**
     * Emitted just after child process has been spawned.
     *
     * @event ChildProcessCommand#start
     * @param {String} command child process command line
     */

    /**
     * Emitted when child process outputs to stderr
     *
     * @event ChildProcessCommand#stderr
     * @param {String} line stderr output line
     */

    /**
     * Emitted when an error happens when preparing or running a command
     *
     * @event ChildProcessCommand#error
     * @param {Error} error error object
     * @param {String|null} stdout child process stdout, unless outputting to a stream
     * @param {String|null} stderr child process stderr
     */

    /**
     * Emitted when a command finishes processing
     *
     * @event ChildProcessCommand#end
     * @param {Array|String|null} [filenames|stdout] generated filenames when taking screenshots, child process stdout when not outputting to a stream, null otherwise
     * @param {String|null} stderr child process stderr
     */


    /**
     * Spawn an child process process
     *
     * The 'options' argument may contain the following keys:
     * - `cwd`: change working directory
     * - 'captureStdout': capture stdout and pass it to 'endCB' as its 2nd argument (default: false)
     * - 'stdoutLines': override command limit (default: use command limit)
     *
     * The 'processCB' callback, if present, is called as soon as the process is created and
     * receives a nodejs ChildProcess object.  It may not be called at all if an error happens
     * before spawning the process.
     *
     * The 'endCB' callback is called either when an error occurs or when the child process process finishes.
     *
     * @method ChildProcessCommand#_spawnChildProcess
     * @param command input file path
     * @param {Array} args child process command line argument list
     * @param {Object} [options] spawn options (see above)
     * @param {Function} [processCB] callback called with process object and stdout/stderr ring buffers when process has been created
     * @param {Function} [endCB] callback called with error (if applicable) and stdout/stderr ring buffers when process finished
     * @private
     */
    proto._spawnChildProcess = function (command, args, options, processCB, endCB) {
        var self = this;

        var maxLines = 'stdoutLines' in options ? options.stdoutLines : this.options.stdoutLines;

        var stdoutRing = utils.linesRing(maxLines);
        var stdoutClosed = false;

        var stderrRing = utils.linesRing(maxLines);
        var stderrClosed = false;

        // Spawn process
        var childProc = spawn(command, args, options);

        if (childProc.stderr) {
            childProc.stderr.setEncoding('utf8');
        }

        childProc.on('error', function (err) {
            endCB(err);
        });

        // Ensure we wait for captured streams to end before calling endCB
        var exitError = null;

        function handleExit(err) {
            if (err) {
                exitError = err;
            }

            if (processExited && (stdoutClosed || !options.captureStdout) && stderrClosed) {
                endCB(exitError, stdoutRing, stderrRing);
            }
        }

        // Handle process exit
        var processExited = false;
        childProc.on('exit', function (code, signal) {
            processExited = true;

            if (signal) {
                handleExit(new Error('child process target was killed with signal ' + signal));
            } else if (code) {
                handleExit(new Error('child process target exited with code ' + code));
            } else {
                handleExit();
            }
        });

        // Capture stdout if specified
        if (options.captureStdout) {
            childProc.stdout.on('data', function (data) {
                self.emit('data', data);
                stdoutRing.append(data);
            });

            childProc.stdout.on('close', function () {
                stdoutRing.close();
                stdoutClosed = true;
                handleExit();
            });
        }

        // Capture stderr if specified
        childProc.stderr.on('data', function (data) {
            stderrRing.append(data);
        });

        childProc.stderr.on('close', function () {
            stderrRing.close();
            stderrClosed = true;
            handleExit();
        });

        // Call process callback
        processCB(childProc, stdoutRing, stderrRing);
    };


    /**
     * Run child process command
     *
     * @method ChildProcessCommand#run
     * @category Processing
     */
    proto.run = function () {
        var self = this;

        if (!this.command) {
            throw new Error('No command specified');
        }

        // Ensure we send 'end' or 'error' only once
        var ended = false;

        function emitEnd(err, stdout, stderr) {
            if (!ended) {
                ended = true;

                if (err) {
                    self.emit('error', err, stdout, stderr);
                } else {
                    self.emit('end', stdout, stderr);
                }
                self.endCallback(err, stdout, stderr);
            }
        }

        // Run child process
        self._spawnChildProcess(this.command, this.args || [], {
                captureStdout: self.options.captureStdout,
                cwd: self.options.cwd
            }, function processCB(childProc, stdoutRing, stderrRing) {
                self.childProc = childProc;
                self.emit('start', self.command, self.args);

                // Setup timeout if requested
                if (self.options.timeout) {
                    setTimeout(function () {
                        var msg = 'process ran into a timeout (' + self.options.timeout + 's)';

                        emitEnd(new Error(msg), stdoutRing.get(), stderrRing.get());
                        childProc.kill();
                    }, self.options.timeout * 1000);
                }

                // Setup stderr handling
                if (stderrRing) {
                    // 'stderr' event
                    if (self.listeners('stderr').length) {
                        stderrRing.callback(function (line) {
                            self.emit('stderr', line);
                        });
                    }
                }
            },

            function endCB(err, stdoutRing, stderrRing) {
                delete self.childProc;

                if (err) {
                    if (err.message.match(/exited with code/)) {
                        // Add child process error message
                        err.message += ': ' + utils.extractError(stderrRing.get());
                    }
                    emitEnd(err, stdoutRing.get(), stderrRing.get());
                } else {
                    emitEnd(null, stdoutRing.get(), stderrRing.get());
                }
            }
        );
        return this;
    };

    /**
     * Kill current child process, if any
     *
     * @method ChildProcessCommand#kill
     * @category Processing
     *
     * @param {String} [signal=SIGKILL] signal name
     * @return ChildProcessCommand
     */
    proto.kill = function (signal) {
        if (!this.childProc) {
            this.logger.warn('No running child process, cannot send signal');
        } else {
            this.childProc.kill(signal || 'SIGKILL');
        }

        return this;
    };
};
