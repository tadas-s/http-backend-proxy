'use strict';

var HttpBackend = require('../lib/http-backend-proxy');
var mocks = require('./helpers/mocks.js');

describe('Shortcut Method JavaScript Generation', function(){

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

    ['GET', 'HEAD', 'DELETE', 'POST', 'PUT', 'PATCH', 'JSONP'].forEach(function(method) {
      spyOn($httpBackendMock, 'when' + method).andReturn(responseMock);
    });

    spyOn(responseMock, 'passThrough');
  });

  //GET, HEAD and DELETE all have the same signature so use the same tests
  ['GET', 'HEAD', 'DELETE'].forEach(function(method){
    (function(method){

      describe('the when' + method + ' method', function () {
        var methodName = ['when' + method];
        var methodUnderTest;

        beforeEach(function () {
          methodUnderTest = proxy[methodName];
        });

        it('should generate the correct JavaScript when called with a url only.', function () {
          methodUnderTest('/url').passThrough();
          evalAndRunGeneratedCode();

          expect($httpBackendMock[methodName]).toHaveBeenCalledWith('/url');
          expect(responseMock.passThrough).toHaveBeenCalled();
        });

        it('should generate the correct JavaScript when called with a url function.', function () {
          methodUnderTest(function(url){return url.indexOf('/api') == 0;}).passThrough();
          evalAndRunGeneratedCode();

          expect($httpBackendMock[methodName]).toHaveBeenCalledWith(jasmine.any(Function));
          expect($httpBackendMock[methodName].calls[0].args[0].toString()).toEqual("function (url){return url.indexOf('/api') == 0;}");
          expect(responseMock.passThrough).toHaveBeenCalled();
        });

        it('should generate the correct JavaScript when called with a url regex.', function () {
          methodUnderTest(new RegExp('/url')).passThrough();
          evalAndRunGeneratedCode();

          expect($httpBackendMock[methodName]).toHaveBeenCalledWith(new RegExp('/url'));
          expect(responseMock.passThrough).toHaveBeenCalled();
        });

        it('should generate the correct JavaScript when called with a url and headers', function () {
          methodUnderTest('/url', {header:'value'}).passThrough();
          evalAndRunGeneratedCode();

          expect($httpBackendMock[methodName]).toHaveBeenCalledWith('/url', {header:'value'});
          expect(responseMock.passThrough).toHaveBeenCalled();
        });

      });

    })(method);
  });

  //POST, PUT and PATCH all have the same signature so use the same tests
  ['POST', 'PUT', 'PATCH'].forEach(function(method){
    (function(method){

      describe('the when' + method + ' method', function () {

        var methodName = ['when' + method]
        var methodUnderTest;

        beforeEach(function () {
          methodUnderTest = proxy[methodName];
        });

        it('should generate the correct JavaScript when called with a url only.', function () {
          methodUnderTest('/url').passThrough();
          evalAndRunGeneratedCode();

          expect($httpBackendMock[methodName]).toHaveBeenCalledWith('/url');
          expect(responseMock.passThrough).toHaveBeenCalled();
        });

        it('should generate the correct JavaScript when called with a url function.', function () {
          methodUnderTest(function(url){return url.indexOf('/api') == 0;}).passThrough();
          evalAndRunGeneratedCode();

          expect($httpBackendMock[methodName]).toHaveBeenCalledWith(jasmine.any(Function));
          expect($httpBackendMock[methodName].calls[0].args[0].toString()).toEqual("function (url){return url.indexOf('/api') == 0;}");
          expect(responseMock.passThrough).toHaveBeenCalled();
        });

        it('should generate the correct JavaScript when called with a url regex.', function () {
          methodUnderTest(new RegExp('/url')).passThrough();
          evalAndRunGeneratedCode();

          expect($httpBackendMock[methodName]).toHaveBeenCalledWith(new RegExp('/url'));
          expect(responseMock.passThrough).toHaveBeenCalled();
        });

        it('should generate the correct JavaScript when called with a url and data object.', function () {
          methodUnderTest('/url', {key:'value'}).passThrough();
          evalAndRunGeneratedCode();

          expect($httpBackendMock[methodName]).toHaveBeenCalledWith('/url', {key:'value'});
          expect(responseMock.passThrough).toHaveBeenCalled();
        });

        it('should generate the correct JavaScript when called with a url and data regex.', function () {
          methodUnderTest('/url', new RegExp('pattern')).passThrough();
          evalAndRunGeneratedCode();

          expect($httpBackendMock[methodName]).toHaveBeenCalledWith('/url', new RegExp('pattern'));
          expect(responseMock.passThrough).toHaveBeenCalled();
        });

        it('should generate the correct JavaScript when called with a url, data and headers object.', function () {
          methodUnderTest('/url', 'string data', {header:'value'}).passThrough();
          evalAndRunGeneratedCode();

          expect($httpBackendMock[methodName]).toHaveBeenCalledWith('/url', 'string data', {header:'value'});
          expect(responseMock.passThrough).toHaveBeenCalled();
        });

        it('should generate the correct JavaScript when called with a url, data and headers function.', function () {
          methodUnderTest('/url', 'string data', function(headers){}).passThrough();
          evalAndRunGeneratedCode();

          expect($httpBackendMock[methodName]).toHaveBeenCalledWith('/url', 'string data', jasmine.any(Function));
          expect(responseMock.passThrough).toHaveBeenCalled();
        });

      });

    })(method);
  });

  describe('the whenJSONP method', function () {

    it('should generate the correct JavaScript when called with a url only.', function () {
      proxy.whenJSONP('/url').passThrough();
      evalAndRunGeneratedCode();

      expect($httpBackendMock.whenJSONP).toHaveBeenCalledWith('/url');
      expect(responseMock.passThrough).toHaveBeenCalled();
    });

    it('should generate the correct JavaScript when called with a url function.', function () {
      proxy.whenJSONP(function(url){return url.indexOf('/api') == 0;}).passThrough();
      evalAndRunGeneratedCode();

      expect($httpBackendMock.whenJSONP).toHaveBeenCalledWith(jasmine.any(Function));
      expect(responseMock.passThrough).toHaveBeenCalled();
    });

    it('should generate the correct JavaScript when called with a url regex.', function () {
      proxy.whenJSONP(new RegExp('/url')).passThrough();
      evalAndRunGeneratedCode();

      expect($httpBackendMock.whenJSONP).toHaveBeenCalledWith(new RegExp('/url'));
      expect(responseMock.passThrough).toHaveBeenCalled();
    });

  });

});