# Fluent Child Process-API for Node.js

This Library abstracts the complex command-line usage of child process into a fluent and easy to use node.js module. Inspired and forked from the amazing and famous node.js module [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) ;

## Installation

Via npm:

```sh
$ npm install fluent-child-process
```

Or using git:
```sh
$ git clone git://github.com/digital-flowers/fluent-child-process.git
```



## Usage

child process command syntax (options are optional)
```javascript
var child = require("fluent-child-process");
child("path/to/the/binary/file", arguments, options, endCallback);
```

simple usage
```javascript
var fluent = require("fluent-child-process");
var child = fluent("/lib/mediainfo",["--Output=XML","--Full"],{timeout:120}, function(err,stdout,stderr){
   // process finised
});
// you can also kill the process
child.kill();
```

using events
```javascript
var fluent = require("fluent-child-process");
var child = fluent("C:\\test.exe");
// instead of passing end callback you can listen to all the following optional events
child.on('start', function(command, args){
   // invkoed when the child process started 
});
child.on('data', function(command, args){
   // any output from the child process in middle of the execuation progress, 
   // this is usefull to show progress but if you want the full output just listen to the "end" event    
});
child.on('error', function(err){
   // invkoed when the child process stopped with error
});
child.on('end', function(stdout, stderr){
   // invkoed when the child process finished successfully, stdout and stderr are the program final outputs 
});
```



# Options
 **captureStdout**
     {Boolean} wither to to capture child process output or not, default = true
     
 **stdoutLines**
     {Number} maximum lines of child process output to keep in memory, default = unlimited
     
 **timeout** 
     {Number} child process processing timeout in seconds, default is no timeout
     
 **logger** 
     {Object} logger object with 'error', 'warning', 'info' and 'debug' methods, default is no logging
 
 