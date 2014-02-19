/*
 * grunt-selenium-webdriver
 * https://github.com/connectid/grunt-selenium-webdriver
 *
 * Copyright (c) 2014 ConnectiD
 * Licensed under the MIT license.
 */
/* 
 * starts and stops selenium in webdriver grid mode as standard
 * but in single hub mode for phantom. This is to ensure compatibility
 * with versions provied on platforms like codeship and circlci
 * requires java runtime installed
 */

"use strict";
var spawn = require('child_process').spawn,
    starting = false, 
    started = false,
    os = require('os'),
    selOptions = [ '-jar' , 'java/selenium-server-standalone-2.39.0.jar'],
    Q = require("q"),
    asyncTask = require("grunt-promise-q");

//    selenium = require('selenium-webdriver'); // use their start server?


var phantomLoc = __dirname + "/../node_modules/phantomjs/bin";


var seleniumServerProcess = null,
    phantomProcess = null;


function startPhantom ( next ) {
    
    phantomProcess = spawn( phantomLoc +'/phantomjs' , [ '--webdriver', '8080', '--webdriver-selenium-grid-hub=http://127.0.0.1:4444' ]);

    phantomProcess.stderr.setEncoding('utf8');
    phantomProcess.stderr.on('data', function(data) {
        data = data.trim();
    });
    phantomProcess.stdout.setEncoding('utf8');
    // wait for client ready message before proceeding
    phantomProcess.stdout.on('data', function( msg ) {
        // look for msg that indicates it's ready and then stop logging messages
        if ( !started && msg.indexOf( 'Registered with grid' ) > -1) {
            console.log ('phantom client ready');
            started = true;
            starting = false;
            if (typeof next === 'function') { 
                return next();
            }
        }
    });
}

/**
 * starts a selenium server with access to default browsers
 * @param next callback function
 * @param isHeadless will start bundled phantomjs single client with selenium in hub mode
 * @private
 */
function start( next, isHeadless ) {

    if ( started) { 
        return next(console.log('already started')); 
    }
    
    if ( isHeadless ) {    
        selOptions.push ( '-role');
        selOptions.push ( 'hub');
    }

    seleniumServerProcess = spawn( 'java', selOptions );
    // selenium webdriver has a port prober in it which could be factored in.
    seleniumServerProcess.on('uncaughtException', function(err) {
        if(err.errno === 'EADDRINUSE' ){
            console.log ('PORT already IN USE, assume selenium running');
            next(); 
        } else {
            console.trace(err);
            process.exit(1);
        }
    });

    seleniumServerProcess.stderr.setEncoding('utf8');
    // listen to procee output until server is actually ready, otherwise next task will break
    seleniumServerProcess.stderr.on('data', function(data) {
        var errMsg;
        data = data.trim();
        if ( isHeadless) {
            // check for hub
            if ( data.indexOf( 'Started SocketConnector' ) > -1) {
                console.log ('selenium hub ready');
                return startPhantom(next);
            } else if ( data.indexOf ('Address already in use') > -1 ) {
                // throw error if already started
                 errMsg = 'FATAL ERROR starting selenium: ' + data + ' maybe try killall -9 java';
                throw errMsg;                
            }
        } else if ( data && 
             // throw error if something unexpected happens
             data.indexOf('org.openqa.grid.selenium.GridLauncher main') === -1 &&
             data.indexOf('Setting system property') === -1 &&
             data.indexOf('INFO') === -1 &&
             data.indexOf('WARNING') === -1 &&
             !started
              ) {
            errMsg = 'FATAL ERROR starting selenium: ' + data;
            throw errMsg;
        }
    });
    seleniumServerProcess.stdout.setEncoding('utf8');
    seleniumServerProcess.stdout.on('data', function( msg ) {
        // look for msg that indicates it's ready and then stop logging messages
        if ( !started && ( msg.indexOf( 'Started org.openqa.jetty.jetty.servlet.ServletHandler' ) > -1 ) ) {
            console.log ('seleniumrc', 'server ready');
            started = true;
            starting = false;
            if (typeof next === 'function') {
                return next();
            }
        } else if ( msg.indexOf( 'should connect to' ) > -1 )  {
            // log this message so you can see which port
            console.log ('seleniumrc starting', msg.substr(20));
        }
    });
}

    
/**
 * Stop the servers
 */
function stop(next) {
    if (phantomProcess) { 
        console.log ('phantom stop request pid',phantomProcess.pid);
        seleniumServerProcess.on('close', function (code, signal) {
            console.log('phantom process terminated');
            // this should really resolve both callbacks rather than guessing phantom wrapper will terminate instantly
            if (typeof next === 'function' && !seleniumServerProcess ) {
                next();
            }
        });
        // kill the child process
        // SIGTERM is supposed to let the process end cleanly
        phantomProcess.kill('SIGTERM');
        started = false;
        starting = false;
    }
    if (seleniumServerProcess) { 
        console.log ('seleniumrc stop request pid',seleniumServerProcess.pid);
        seleniumServerProcess.on('close', function (code, signal) {
            console.log('selenium process terminated');
            if (typeof next === 'function' ) { 
                // need to stub out the other callback
                next();
            }
        });
        // kill the child process
        // SIGTERM is supposed to let the process end cleanly
        seleniumServerProcess.kill('SIGTERM');        
        started = false;
        starting = false;
    }
}


// stop the child processes if this process exits
process.on('exit', function onProcessExit() {
    if (started) {
        stop();
    }
});

/**
 * Exports
 */
module.exports= function ( grunt) {
    var trueFn = function () { 
//        console.log ('finished'); 
        return true; 
    };
    asyncTask.register(grunt, 'selenium_start' , 'Starts and stops webdriver in grid or hub mode for use with 3rd party CI platforms' , function () {
        return Q.nfcall( start ,trueFn , false );
    });    
    asyncTask.register('selenium_phantom_hub', 'Starts selenium in hub mode and attaches a single phantonjs to it for headless env', function() {
        return Q.nfcall( start ,trueFn , true );
    });
    asyncTask.register('selenium_stop', 'Stops webdriver in grid or hub mode for use with 3rd party CI platforms', function() {
        return Q.nfcall( stop ,trueFn );
    });
};


//start(function() { stop ( function() { return console.log('finished'); } ) });


