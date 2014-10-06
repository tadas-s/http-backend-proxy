'use strict';

var HttpBackend = require('../lib/http-backend-proxy');
var regexScenarios = require('./helpers/regular-expression-scenarios');
var mocks = require('./helpers/mocks.js');

describe('Proxy', function(){

  var browser;
  var proxy;
  var $httpBackendMock;
  var responseMock;
  var windowMock;

  beforeEach(function () {
    browser = {
      executeScript: function(script) {
        var src = '(function(window) { return(' + script + '); })';
        return (eval(src))(windowMock);
      }
    };

    proxy = new HttpBackend(browser, {contextAutoSync: false});

    $httpBackendMock = new mocks.$httpBackendMock();
    responseMock = new mocks.responseMock();
    windowMock = new mocks.windowMock($httpBackendMock);

    spyOn($httpBackendMock, 'expect').andReturn(responseMock);
    spyOn(responseMock, 'respond');
    spyOn(responseMock, 'passThrough');
  });

  describe('.expect()', function() {
    it('should generate correct JavaScript for parameterless calls to expect()', function () {
      proxy.expect().respond();

      expect($httpBackendMock.expect).toHaveBeenCalled();
      expect(responseMock.respond).toHaveBeenCalled();
    });

    it('should generate correct JavaScript for parameterless calls to passThrough()', function () {
      proxy.expect().passThrough();

      expect($httpBackendMock.expect).toHaveBeenCalled();
      expect(responseMock.passThrough).toHaveBeenCalled();
    });

    it('should generate correct JavaScript for calls to expect() with parameters', function () {
      proxy.expect('GET', '/path').respond();

      expect($httpBackendMock.expect).toHaveBeenCalledWith('GET', '/path');
      expect(responseMock.respond).toHaveBeenCalled();
    });

    it('should generate correct JavaScript for calls to respond() with parameters', function () {
      proxy.expect().respond(200, {json: 'prop'});

      expect($httpBackendMock.expect).toHaveBeenCalled();
      expect(responseMock.respond).toHaveBeenCalledWith(200, {json: 'prop'});
    });
  });

  describe('.verifyNoOutstandingExpectation()', function() {
    it('calls $httpBackend.verifyNoOutstandingExpectation()', function() {
      spyOn($httpBackendMock, 'verifyNoOutstandingExpectation').andReturn(undefined);

      proxy.verifyNoOutstandingExpectation();

      expect($httpBackendMock.verifyNoOutstandingExpectation).toHaveBeenCalled();
    });

    it('raises an error if $httpBackend.verifyNoOutstandingExpectation() has raised one', function() {
      spyOn($httpBackendMock, 'verifyNoOutstandingExpectation').andThrow(new Error('Unsatisfied requests: this and that'));

      expect(function() {
        proxy.verifyNoOutstandingExpectation();
      }).toThrow('Unsatisfied requests: this and that');

      expect($httpBackendMock.verifyNoOutstandingExpectation).toHaveBeenCalled();
    });
  });

  xdescribe('.verifyNoOutstandingRequest() method proxy', function() {

  });

  describe('.flush_()', function() {
    it('calls $httpBackend.flush()', function() {
      spyOn($httpBackendMock, 'flush').andReturn(undefined);

      proxy.flush_();

      expect($httpBackendMock.flush).toHaveBeenCalled();
    });

    it('raises an error if $httpBackend.flush() has raised one', function() {
      spyOn($httpBackendMock, 'flush').andThrow(new Error('Nothing to flush!'));

      expect(function() {
        proxy.flush_();
      }).toThrow('Nothing to flush!');

      expect($httpBackendMock.flush).toHaveBeenCalled();
    });
  });
});