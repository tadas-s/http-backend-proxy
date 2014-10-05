module.exports = {

  $httpBackendMock: function() {
    return {
      when: function() {},
      expect: function() {}
    };
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