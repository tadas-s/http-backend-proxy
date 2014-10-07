'use strict';

var HttpBackend = require('../lib/http-backend-proxy');

describe('Setting expectation', function(){

  var angularVersion;
  var urlSelectorFunctionsSupported;
  var httpBackend;

  beforeEach(function () {
    browser.get('index.html');

    element(by.id('version')).getText().then(function(version) {
      angularVersion = JSON.parse(version);
      urlSelectorFunctionsSupported = angularVersion.major > 1 || angularVersion.minor > 2;
    });

    httpBackend = new HttpBackend(browser);
  });

  describe('flush_()', function() {
    it('it fails when there are no expectations configured and nothing to flush', function() {
      httpBackend.flush_().then(function() {
        self.fail('this call to flush_() must not resolve successfully');
      }, function(error) {
        expect(error.message).toContain('No pending request to flush !');
      });
    });

    it('it fails when there is nothing to flush', function() {
      httpBackend.expectGET('/remote').respond(200, {msg: "You called /remote"});

      httpBackend.flush_().then(function() {
        self.fail('this call to flush_() must not resolve successfully');
      }, function(error) {
        expect(error.message).toContain('No pending request to flush !');
      });
    });

    it('completes pending requests', function() {
      httpBackend.expectGET('/remote').respond(200, {msg: "You called /remote"});

      element(by.id('method')).sendKeys('GET');
      element(by.id('url')).sendKeys('remote');
      element(by.id('call')).click();

      httpBackend.flush_();

      expect(element(by.id('r-data')).getText()).toEqual('{"msg":"You called /remote"}');
    });
  });

  describe('verifyNoOutstandingExpectation()', function() {

    it('it does not complain when there are no expectations configured', function() {
      httpBackend.verifyNoOutstandingExpectation()
    });

    describe('with basic GET requests', function() {

      beforeEach(function() {
        httpBackend.expectGET('/remote').respond(200, {msg: "You called /remote"});
      });

      it('throws an error if expectation is not satisfied', function() {
        var self = this;

        httpBackend.verifyNoOutstandingExpectation().then(function() {
          self.fail('this call to verifyNoOutstandingExpectation() must not resolve successfully');
        }, function(error) {
          expect(error.message).toContain('Unsatisfied requests: GET /remote');
        });
      });

      it('passes if expectation is satisfied', function() {
        element(by.id('method')).sendKeys('GET');
        element(by.id('url')).sendKeys('remote');
        element(by.id('call')).click();

        httpBackend.verifyNoOutstandingExpectation();
      });
    });

    describe('with multiple requests', function() {
      it('throws an error if expectation is not fully satisfied', function() {
        httpBackend.expectGET('/remote').respond(200, {msg: "You called /remote"});
        httpBackend.expectGET('/boohoo').respond(200, {msg: "You called /boohoo"});

        element(by.id('method')).sendKeys('GET');
        element(by.id('url')).sendKeys('remote');
        element(by.id('call')).click();

        httpBackend.verifyNoOutstandingExpectation().then(function() {
          self.fail('this call to verifyNoOutstandingExpectation() must not resolve successfully');
        }, function(error) {
          expect(error.message).toContain('Unsatisfied requests: GET /boohoo');
        });
      });

      it('allows flushes in between expectations', function() {
        httpBackend.expectGET('/secret').respond(200, {"mySecret": "Nothing!"});
        element(by.id('method')).sendKeys('GET');
        element(by.id('url')).sendKeys('secret');
        element(by.id('call')).click();
        httpBackend.flush_();
        expect(element(by.id('r-data')).getText()).toEqual('{"mySecret":"Nothing!"}');

        browser.sleep(3000);

        httpBackend.expectPUT('/secret', {"mySecret": "Dark.."}).respond(200, {"mySecret": "Dark.."});
        element(by.id('method')).clear();
        element(by.id('method')).sendKeys('PUT');
        element(by.id('url')).clear();
        element(by.id('url')).sendKeys('secret');
        element(by.id('data')).clear();
        element(by.id('data')).sendKeys('{"mySecret": "Dark.."}');
        element(by.id('call')).click();
        httpBackend.flush_();
        expect(element(by.id('r-data')).getText()).toEqual('{"mySecret":"Dark.."}');

        httpBackend.expectGET('/secret').respond(200, {"mySecret": "Dark.."});
        element(by.id('method')).clear();
        element(by.id('method')).sendKeys('GET');
        element(by.id('url')).clear();
        element(by.id('url')).sendKeys('secret');
        element(by.id('data')).clear();
        element(by.id('call')).click();
        httpBackend.flush_();
        expect(element(by.id('r-data')).getText()).toEqual('{"mySecret":"Dark.."}');

        httpBackend.verifyNoOutstandingExpectation();
      });
    });
  });
});
