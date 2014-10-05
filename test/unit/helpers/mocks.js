"use strict";

module.exports = {
  $httpBackendMock: function() {
    var methods = {
      when: function() {},
      expect: function() {}
    };

    ['GET', 'HEAD', 'DELETE', 'POST', 'PUT', 'PATCH', 'JSONP'].forEach(function(method) {
      methods['when' + method] = function() {};
      methods['expect' + method] = function() {};
    });

    return methods;
  },

  responseMock: function() {
    return {
      respond: function () {},
      passThrough: function () {}
    };
  },

  windowMock: function($httpBackendMock) {
    var self = this;
    this.$httpBackendMock = $httpBackendMock;

    return {
      document: {
        querySelector: function () {
        }
      },
      angular: {
        element: function () {
          return {
            injector: function () {
              return {
                invoke: function (fn) {
                  fn(self.$httpBackendMock);
                }
              };
            }
          };
        }
      }
    };
  }
};