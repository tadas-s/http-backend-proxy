'use strict';

var HttpBackend = require('../lib/http-backend-proxy');
var mocks = require('./helpers/mocks.js');

describe('Buffered configuration', function(){

  var browser;
  var proxy;
  var $httpBackendMock;
  var responseMock;
  var windowMock;

  beforeEach(function () {
    browser = {
      executeScript: function(script) {
        var src = '(function(window) { ' + script + ' })';
        (eval(src))(windowMock);
      }
    };
    spyOn(browser, 'executeScript').andCallThrough();

    $httpBackendMock = new mocks.$httpBackendMock();
    responseMock = new mocks.responseMock();
    windowMock = new mocks.windowMock($httpBackendMock);

    spyOn($httpBackendMock, 'whenGET').andReturn(responseMock);
    spyOn(responseMock, 'respond');
    spyOn(responseMock, 'passThrough');
  });

  describe('A proxy with buffering not configured', function () {

    var proxy, returnValue1, returnValue2;

    beforeEach(function () {

      proxy = new HttpBackend(browser);

      returnValue1 = proxy.whenGET('/url1').passThrough();
      returnValue2 = proxy.whenGET('/url2').passThrough();
    });

    it('should configure two expectations', function () {
      expect(browser.executeScript.calls.length).toEqual(2);
      expect($httpBackendMock.whenGET).toHaveBeenCalledWith('/url1');
      expect($httpBackendMock.whenGET).toHaveBeenCalledWith('/url2');
    });

    it('should pass the data context on each call to the proxy', function () {
      // TODO: can't spy on setter so this test case is bit weak
      expect(browser.executeScript.calls[0].args[0]).toContain(
        '$httpBackend[contextField] = context;');
      expect(browser.executeScript.calls[1].args[0]).toContain(
        '$httpBackend[contextField] = context;');
    });
  });

  describe('A proxy with buffering turned off', function () {

    var proxy, returnValue1, returnValue2;

    beforeEach(function () {

      proxy = new HttpBackend(browser);

      returnValue1 = proxy.whenGET('/url1').passThrough();
      returnValue2 = proxy.whenGET('/url2').passThrough();
    });

    it('should configure two expectations', function () {
      expect(browser.executeScript.calls.length).toEqual(2);
      expect($httpBackendMock.whenGET).toHaveBeenCalledWith('/url1');
      expect($httpBackendMock.whenGET).toHaveBeenCalledWith('/url2');
    });

    it('should pass the data context on each call to the proxy', function () {
      // TODO: can't spy on setter so this test case is bit weak
      expect(browser.executeScript.calls[0].args[0]).toContain(
        '$httpBackend[contextField] = context;');
      expect(browser.executeScript.calls[1].args[0]).toContain(
        '$httpBackend[contextField] = context;');
    });
  });

  describe('A proxy with buffering turned on', function () {

    var proxy, returnValue1, returnValue2;

    beforeEach(function () {

      proxy = new HttpBackend(browser, {buffer: true});

      proxy.context.value="before";

      returnValue1 = proxy.whenGET('/url1').passThrough();
      returnValue2 = proxy.whenGET('/url2').passThrough();

      proxy.context.value="current";

    });

    it('should not return a promise for the first call', function(){
      expect(returnValue1).toBeUndefined();
    });

    it('should not return a promise for the second call', function(){
      expect(returnValue2).toBeUndefined();
    });

    describe('before flushing the buffer', function () {

      it('shoud make no executeScript calls', function () {
        expect(browser.executeScript).not.toHaveBeenCalled();
      });

    });

    describe('after flushing the buffer', function () {

      var returnValue1;

      beforeEach(function () {
        returnValue1 = proxy.flush();
      });

      it('should make one executeScript call', function () {
        expect(browser.executeScript.calls.length).toEqual(1);
      });

      it('should include all calls to the proxy in that single call', function () {
        expect($httpBackendMock.whenGET).toHaveBeenCalledWith('/url1');
        expect($httpBackendMock.whenGET).toHaveBeenCalledWith('/url2');
      });

      it('should pass the current data context to the browser', function () {
        expect($httpBackendMock.context).toEqual({value: "current"});
      });

      describe('additional calls to flush', function () {

        var returnValue2;

        beforeEach(function () {
          returnValue2 = proxy.flush();
        });

        it('should not call executeScript a second time', function () {
          proxy.flush();
          expect(browser.executeScript.calls.length).toEqual(1);
        });

        it('should return a completed promise.', function () {
          expect(returnValue2.isComplete).toEqual(true);
        });

      });

    });

  });

});