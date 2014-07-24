/*
 * Tests for grunt-selenium-webdriver, any problems are likely to be down to the relative install path of node modules on your system
 * run grunt test --stack for more info on
 */
var chai = require('chai' ),
    webdriver = require('selenium-webdriver' ),
    FIXTURE = 'http://localhost:9000/index.html',
    expect = chai.expect,
    should = chai.should();

/**
 * creates a webdriver client
 * @param callBack or promise
 */
function createClient( callBack) {
// you can stick your saucelabs stuff here
    var serverConfig = 'http://127.0.0.1:4445/wd/hub',
        capabilities = {
            silent: true, // maybe output more for tests?
            browserName: 'phantomjs',
            javascriptEnabled: true,
            takesScreenshot: true,
            databaseEnabled: false,
            cssSelectorsEnabled:true,
            webStorageEnabled: true
    };

    driver = new webdriver.Builder().
        usingServer( serverConfig ).
        withCapabilities( capabilities).
        build();
    if (typeof callBack === 'function') {
        return callBack (driver);
    } else if ( typeof callBack === 'object' && typeof callBack.resolve === 'function' ) {
        return callBack.resolve( driver );
    } else {
        return driver;
    }
}

/**
 * gets inner html of main div element
 * @param callBack or promise
 */
function getMain (driver, callBack) {
    driver.get( url );
    var cont = driver.findElement( webdriver.By.id("main") );
    cont.getAttribute('innerHTML').then( function ( html ) {
        callBack ( html );
    });
}

describe ('test phantom hub', function () {
    var _driver,
        setDriver = function ( driver ) {
            if (!driver) throw new Error ('driver not created');
            _driver = driver;
        }
    before( function () {
        createClient ( setDriver );
    } );
    it ('should return a page with a main div saying page loaded', function (done) {
        expect ( _driver ).to.exist;
        driver.get( FIXTURE );
        var main = driver.findElement( webdriver.By.id("main") );
        main.getAttribute('innerHTML').then( function ( conts ) {
            conts.should.contain ('page loaded');
            done();
        });
    });
    it ('should change main div innerHTML to "main clicked" when clicked', function (done) {
        expect ( _driver ).to.exist;
        driver.get( FIXTURE );
        var main = driver.findElement( webdriver.By.id("main") );
        main.click()
            .then( function () {
                main.getAttribute('innerHTML').then( function ( conts ) {
                    conts.should.contain( main );
                    done();
                });
        });

        done();
    });
});