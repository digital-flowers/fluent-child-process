/*jshint node:true*/
'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * Create a new command
 *
 * Can be called with or without the 'new' operator, and the 'input' parameter
 * may be specified as 'options.source' instead (or passed later with the
 * addInput method).
 *
 * @constructor
 * @param {String} command input file path
 * @param {Array}  [args] array of command line arguments to pass to the process
 * @param {Object} [options] command options
 * @param {Function} [endCallback] callback function to be called once the process is done
 * @param {Boolean} [options.captureStdout=true] wither to to capture child process output or not
 * @param {String} [options.stdoutLines=0] maximum lines of child process output to keep in memory, leave 0 for unlimited
 * @param {Number} [options.timeout=<no timeout>] child process processing timeout in seconds
 * @param {Object} [options.logger=<no logging>] logger object with 'error', 'warning', 'info' and 'debug' methods
 */
function ChildProcessCommand(command, args, options, endCallback) {
    // Make 'new' optional
    if (!(this instanceof ChildProcessCommand)) {
        return new ChildProcessCommand(command, args, options, endCallback);
    }

    // handle omitting optional arguments
    if (typeof args === 'function') {
        endCallback = args;
        args = [];
        options = {};
    }
    if (typeof options === 'function') {
        endCallback = options;
        options = {};
    }
    if (typeof endCallback === 'undefined') {
        endCallback = function () {
        };
    }

    EventEmitter.call(this);

    // Set default values
    args = args || [];
    options = options || {};
    options.stdoutLines = options.stdoutLines || 0;
    options.captureStdout = (options.captureStdout !== false);
    options.logger = options.logger || {
            debug: function () {
            },
            info: function () {
            },
            warn: function () {
            },
            error: function () {
            }
        };

    this.command = command;
    this.args = args;
    this.options = options;
    this.endCallback = endCallback;
    this.logger = options.logger;

    return this.run();
}
util.inherits(ChildProcessCommand, EventEmitter);
module.exports = ChildProcessCommand;


/* Add processor methods */
require('./processor')(ChildProcessCommand.prototype);