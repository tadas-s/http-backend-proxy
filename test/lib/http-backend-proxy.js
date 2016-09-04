/**
 * http-backend-proxy - https://github.com/kbaltrinic/http-backend-proxy
 * (c) 2014 Kenneth Baltrinic. http://www.baltrinic.com
 * License: MIT
 */
'use strict';

var crypto = require('crypto');
var protractor = require('protractor');

var Proxy = function(browser, options){

  var DEFAULT_CONTEXT_FIELD_NAME = 'context';

  options || (options = {});
  options.buffer || (options.buffer = false);

  //This is for backward compatibility since we changed the API from 1.1.1 to 1.2
  if(options.contextField === false){
    console.warn("Setting contextField: false is deprected.  Set contextAutoSync: false instead.");
    options.contextAutoSync = false;
  }

  options.contextAutoSync = typeof(options.contextAutoSync) === 'undefined' || !!options.contextAutoSync;
  options.contextField || (options.contextField = DEFAULT_CONTEXT_FIELD_NAME);

  var proxy = this;
  var buffer = [];

  createMethods(this, 'when', buildWhenFunction);
  createMethods(this, 'expect', buildWhenFunction);

  function createMethods(proxy, prefix, functionBuilder) {
    ['', 'GET', 'PUT', 'HEAD', 'POST', 'DELETE', 'PATCH', 'JSONP'].forEach(function(method) {
     proxy[prefix + method] = functionBuilder(prefix + method);
    });
  }

  function buildWhenFunction(funcName){

    return function(){
      var when = function($httpBackend, method, args, signature) {
        if(/^when/.test(method)) {
          window.httpBackendProxyRegistry = window.httpBackendProxyRegistry || {};

          if(typeof window.httpBackendProxyRegistry[signature] == 'undefined') {
            window.httpBackendProxyRegistry[signature] = $httpBackend[method].apply($httpBackend, args);
          }

          return window.httpBackendProxyRegistry[signature];
        } else if(/^expect/.test(method)) {
          return $httpBackend[method].apply($httpBackend, args);
        }
      };

      var signature = md5(funcName + '|' + stringifyArgs(arguments));

      var whenSrc = '(' + when.toString() + ')($httpBackend, ' + JSON.stringify(funcName) + ', [' + stringifyArgs(arguments) + '], ' + JSON.stringify(signature) + ')';

      return {
        respond: function() {
          var respond = function(when, args) {
            when.respond.apply(when, args);
          };

          var respondSrc = '(' + respond.toString() + ')(' + whenSrc + ', [' + stringifyArgs(arguments) + '])';

          return executeOrBuffer(respondSrc);
        },
        passThrough: function() {
          var respond = function(when) {
            when.passThrough();
          };

          var respondSrc = '(' + respond.toString() + ')(' + whenSrc + ')';

          return executeOrBuffer(respondSrc);
        }
      };

    };

  };

  var wrapBrowserGet = function(){};

  function executeOrBuffer(script){
    if(options.buffer){
      buffer.push(script);
      if(buffer.length == 1) wrapBrowserGet();
    } else {
      script = wrapScriptWithinInjectorInvoke(getContextDefinitionScript() + ';' + script);
      return browser.executeScript(script);
    }
  }

  function wrapScriptWithinInjectorInvoke(script){
    var wrapper = function(window, rootEl, toBeInvoked) {
      var el = window.document.querySelector(rootEl);
      window.angular.element(el).injector().invoke(function($httpBackend) {
        toBeInvoked($httpBackend);
      });
    };

    return 'return (' + wrapper.toString() + ')(window,' + JSON.stringify(browser.rootEl) + ',function($httpBackend){;' + script + ';});';
  }

  if(arguments.length < 3){

    this[options.contextField] = {};

    this.flush = function(){
      if(buffer.length > 0){
        var script = wrapScriptWithinInjectorInvoke(getContextDefinitionScript() + ';' + buffer.join(';'));
        buffer = [];
        return browser.executeScript(script);
      } else {
        var deferred = protractor.promise.defer();
        deferred.promise.complete();
        return deferred.promise;
      }
    }

    this.syncContext = function(context){

      if(typeof(context) !== 'undefined'){

        //If and only if both are simple objects, merge them
        if(Object.prototype.toString.call(proxy[options.contextField]) === '[object Object]'
          && Object.prototype.toString.call(context) === '[object Object]'){

          for (var key in context) {
            if (context.hasOwnProperty(key)) {
              proxy[options.contextField][key] = context[key];
            }
          }

          context = proxy[options.contextField];

        } else {

          proxy[options.contextField] = context;

        }

      } else {

        if(typeof(proxy[options.contextField]) === 'undefined'){
          proxy[options.contextField] = {};
        }

        context =  proxy[options.contextField];
      }

      return browser.executeScript(
        wrapScriptWithinInjectorInvoke(
          getContextDefinitionScript(context)));
    }

    var onLoad;
    this.__defineGetter__("onLoad", function(){

      if(onLoad) return onLoad;

      var _options_ = { buffer: true, contextField: options.contextField };
      return onLoad = new Proxy(browser, _options_, proxy);

    });

  } else {

    var parent = arguments[2];

    var buildModuleScript = function (){
      var script = getContextDefinitionScript(parent[options.contextField]) + ';' + buffer.join(';');
      return 'angular.module("http-backend-proxy", ["ngMockE2E"]).run(function($httpBackend){' +
        script.replace(/window\.\$httpBackend/g, '$httpBackend') + '});'
    };

    wrapBrowserGet = function(){
      var get = browser.get;
      browser.get = function(){

        if(buffer.length > 0){
          if(browser.get.addedOnce && browser.removeMockModule){ browser.removeMockModule('http-backend-proxy') };
          browser.addMockModule('http-backend-proxy', buildModuleScript());
          //addedOnce is a workaround for Protractor issue #764
          browser.get.addedOnce = true;
        }

        return get.apply(browser, arguments);
      };

      browser.get.__super__ = get;
      browser.get.addedOnce = false;
    }

    this.reset = function() {
      buffer = [];
      if(browser.get.__super__){
        if(browser.get.addedOnce && browser.removeMockModule){ browser.removeMockModule('http-backend-proxy') };
        browser.get = browser.get.__super__;
      }
    };

  }

  function stringifyArgs(args){
    var i, s = [];
    for(i = 0; i < args.length; i++){
      s.push(stringifyObject(args[i]));
    }
    return s.join(', ');
  }

  function getContextDefinitionScript(context){
    var fn = function($httpBackend, contextField, context) {
      $httpBackend[contextField] = context;
    };

    if(options.contextAutoSync){
      context = context || proxy[options.contextField];
    }

    if(typeof(context) !== 'undefined'){
      return '(' + fn.toString() + ')($httpBackend,' + JSON.stringify(options.contextField) + ', ' + stringifyObject(context) + ')';
    } else {
      return '';
    }
  }

  function stringifyObject(obj){

    if(obj === null)
      return 'null';

    if(typeof obj === 'function')
      return obj.toString();

    if(obj instanceof Date)
      return 'new Date(' + obj.valueOf() + ')';

    if(obj instanceof RegExp){

      var regexToString = obj.toString();
      var regexEndIndex = regexToString.lastIndexOf("/");
      var expression = JSON.stringify(regexToString.slice(1, regexEndIndex));
      var modifiers = regexToString.substring(regexEndIndex + 1);
      if(modifiers.length > 0) modifiers = "," + JSON.stringify(modifiers);

      return 'new RegExp(' + expression + modifiers + ')';
    }

    if(obj instanceof Array){
      var elements = []
      obj.forEach(function(element){
        elements.push(stringifyObject(element));
      });
      return '[' + elements.join(',') + ']';

    } else if(typeof(obj) === 'object'){

      var fields = [];
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          fields.push(JSON.stringify(key) + ':' + stringifyObject(obj[key]));
        }
      }

      return '{' + fields.join(',') + '}';
    }

    return JSON.stringify(obj);

  }

  function md5(str){
    return crypto.createHash('md5').update(str).digest('hex');
  }

  /**
   * Proxy call to $httpBackend.verifyNoOutstandingExpectation()
   *
   * @throws Error in case there are unsatisfied expectations
   */
  this.verifyNoOutstandingExpectation = function() {
    var fn = function($httpBackend) {
      return $httpBackend.verifyNoOutstandingExpectation();
    };
    var script = wrapScriptWithinInjectorInvoke('(' + fn.toString() + ')($httpBackend)');

    return browser.executeScript(script);
  };

  /**
   * Proxy call to $httpBackend.verifyNoOutstandingRequest()
   *
   * @throws Error if there are outstanding requests that need to be flushed.
   */
  this.verifyNoOutstandingRequest = function() {
    var fn = function($httpBackend) {
      return $httpBackend.verifyNoOutstandingRequest();
    };
    var script = wrapScriptWithinInjectorInvoke('(' + fn.toString() + ')($httpBackend)');

    return browser.executeScript(script);
  };

  this.flushPending = function() {
    var fn = function($httpBackend) {
      return $httpBackend.flush();
    };
    var script = wrapScriptWithinInjectorInvoke('(' + fn.toString() + ')($httpBackend)');

    return browser.executeScript(script);
  };
};

module.exports = Proxy;
