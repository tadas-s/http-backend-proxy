'use strict';

var HttpBackend = require('../lib/http-backend-proxy');
var regexScenarios = require('./helpers/regular-expression-scenarios');
var mocks = require('./helpers/mocks.js');

describe('Proxy.when JavaScript generation', function(){

  var browser;
  var proxy;
  var $httpBackendMock;
  var responseMock;
  var windowMock;

  function evalAndRunGeneratedCode(code) {
    code = code || browser.executeScript.calls[0].args[0];
    var src = '(function(window) { return(' + code + '); })';
    return (eval(src))(windowMock);
  }

  beforeEach(function () {
    browser = { executeScript: function(){} };
    spyOn(browser, 'executeScript');
    proxy = new HttpBackend(browser, {contextAutoSync: false});

    $httpBackendMock = new mocks.$httpBackendMock();
    responseMock = new mocks.responseMock();
    windowMock = new mocks.windowMock($httpBackendMock);

    spyOn($httpBackendMock, 'when').andReturn(responseMock);
    spyOn(responseMock, 'respond');
    spyOn(responseMock, 'passThrough');
  });

  it('should generate correct JavaScript for parameterless calls to respond()', function () {
    proxy.when().respond();
    evalAndRunGeneratedCode();

    expect($httpBackendMock.when).toHaveBeenCalled();
    expect(responseMock.respond).toHaveBeenCalled();
  });

  it('should generate correct JavaScript for parameterless calls to passThrough()', function () {
    proxy.when().passThrough();
    evalAndRunGeneratedCode();

    expect($httpBackendMock.when).toHaveBeenCalled();
    expect(responseMock.passThrough).toHaveBeenCalled();
  });

  it('should generate correct JavaScript for calls with one when() and one respond() argument', function () {
    proxy.when('GET').respond(200);
    evalAndRunGeneratedCode();

    expect($httpBackendMock.when).toHaveBeenCalledWith('GET');
    expect(responseMock.respond).toHaveBeenCalledWith(200);
  });

  it('should generate correct JavaScript for calls with one when() argument to passThrough()', function () {
    proxy.when('GET').passThrough();
    evalAndRunGeneratedCode();

    expect($httpBackendMock.when).toHaveBeenCalledWith('GET');
    expect(responseMock.passThrough).toHaveBeenCalled();
  });

  it('should generate correct JavaScript for calls with two when() and two respond() arguments', function () {
    proxy.when('GET', '/endpoint').respond(200, {json: 'response'});
    evalAndRunGeneratedCode();

    expect($httpBackendMock.when).toHaveBeenCalledWith('GET', '/endpoint');
    expect(responseMock.respond).toHaveBeenCalledWith(200, {json: 'response'});
  });

  it('should generate correct JavaScript for calls with two when() arguments to passThrough()', function () {
    proxy.when('GET', '/endpoint').passThrough();
    evalAndRunGeneratedCode();

    expect($httpBackendMock.when).toHaveBeenCalledWith('GET', '/endpoint');
    expect(responseMock.passThrough).toHaveBeenCalled();
  });

  it('should generate correct JavaScript for calls with three when() and three respond() arguments', function () {
    proxy.when('GET', '/endpoint', {json: 'request'}).respond(200, {json: 'response'}, {header: 'value'});
    evalAndRunGeneratedCode();

    expect($httpBackendMock.when).toHaveBeenCalledWith('GET', '/endpoint', {"json":"request"});
    expect(responseMock.respond).toHaveBeenCalledWith(200, {"json":"response"}, {"header":"value"});
  });

  it('should generate correct JavaScript for calls with three when() arguments to passThrough()', function () {
    proxy.when('GET', '/endpoint', {json: 'request'}).passThrough();
    evalAndRunGeneratedCode();

    expect($httpBackendMock.when).toHaveBeenCalledWith('GET', '/endpoint', {json: 'request'});
    expect(responseMock.passThrough).toHaveBeenCalled();
  });

  it('should generate correct JavaScript for calls with four when() and four respond() arguments', function () {
    proxy.when('GET', '/endpoint', {json: 'request'}, {header2: "value2"}).respond(200, {json: 'response'}, {header: 'value'}, "OK");
    evalAndRunGeneratedCode();

    expect($httpBackendMock.when).toHaveBeenCalledWith('GET', '/endpoint', {"json":"request"}, {header2: "value2"});
    expect(responseMock.respond).toHaveBeenCalledWith(200, {"json":"response"}, {"header":"value"}, "OK");
  });

  it('should generate correct JavaScript for calls with four when() arguments to passThrough()', function () {
    proxy.when('GET', '/endpoint', {json: 'request'}, {header2: "value2"}).passThrough();
    evalAndRunGeneratedCode();

    expect($httpBackendMock.when).toHaveBeenCalledWith('GET', '/endpoint', {json: 'request'}, {header2: "value2"});
    expect(responseMock.passThrough).toHaveBeenCalled();
  });

  it('should generate correct JavaScript for calls with complex json arguments', function () {

    //Admittedly in the below, passing a function doesn't make a lot of sense but out aim
    //is simply to replicate the local call on the remote browser.  It would require special
    //handling to NOT serialize functions so well keep it simple.
    var json = {
      string: "abc",
      number: 290,
      obj: {
        nested: "object"
      },
      array: [ 232, "ABC", null, {} ],
      null: null,
      regex: /find me/,
      func: function(){ return null; }
    };

    var expected = {
      string: "abc",
      number: 290,
      obj: {
        nested: "object"
      },
      array: [ 232, "ABC", null, {} ],
      null: null,
      regex: /find me/,
      func: jasmine.any(Function)
    };

    proxy.when('GET', '/endpoint', json).respond(200, json);
    evalAndRunGeneratedCode();

    expect($httpBackendMock.when).toHaveBeenCalledWith('GET', '/endpoint', expected);
    expect($httpBackendMock.when.calls[0].args[2].func.toString()).toEqual("function (){ return null; }");
    expect(responseMock.respond).toHaveBeenCalledWith(200, expected);
    expect(responseMock.respond.calls[0].args[1].func.toString()).toEqual("function (){ return null; }");
  });

  it('should generate correct JavaScript for calls with anonymous functions', function () {
    proxy.
      when('GET', function(url){return url.indexOf('/home') == 0;}).
      respond(function(method, url, data, headers){ return [200, 'you called ' + url];});
    evalAndRunGeneratedCode();

    expect($httpBackendMock.when.calls[0].args[1].toString()).toEqual("function (url){return url.indexOf('/home') == 0;}");
    expect(responseMock.respond.calls[0].args[0].toString()).toEqual("function (method, url, data, headers){ return [200, 'you called ' + url];}");
  });

  /*
  for(var i = 0; i < regexScenarios.length; i++){ (function(scenario){
    it('should generate correct JavaScript for calls with regular expression '  + scenario.desc,
    function () {

      proxy.when('GET', scenario.regex ).passThrough();
      expect(browser.executeScript.calls[0].args[0]).toContain(
        '$httpBackend.when("GET", ' + scenario.output + ').passThrough();');

    });
  })(regexScenarios[i])} */

});