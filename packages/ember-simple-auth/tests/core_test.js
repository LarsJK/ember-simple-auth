var applicationMock;
var ApplicationMock = Ember.Object.extend({
  init: function() {
    this.registrations = {};
    this.injections = [];
  },
  register: function(name, factory, options) {
    this.registrations[name] = {
      factory: factory,
      options: options
    };
  },
  inject: function(target, property, name) {
    var registration = this.registrations[name];
    if (registration) {
      this.injections.push({
        target:   target,
        property: property,
        object:   registration.factory
      });
    }
  }
});

var authorizerMock;
var AuthorizerMock = Ember.Object.extend({
  authorize: function() {
    this.authorized = true;
  }
});
AuthorizerMock.reopenClass({
  create: function(options) {
    return (authorizerMock = this._super(options));
  }
});

var ajaxPrefilterMock;
var AjaxPrefilterMock = Ember.Object.extend({
  ajaxPrefilterCapture: function(prefilter) {
    this.registeredAjaxPrefilter = prefilter;
  }
});

module('Ember.SimpleAuth', {
  originalAjaxPrefilter: Ember.$.ajaxPrefilter,
  setup: function() {
    applicationMock       = ApplicationMock.create();
    ajaxPrefilterMock     = AjaxPrefilterMock.create();
    Ember.$.ajaxPrefilter = Ember.$.proxy(ajaxPrefilterMock.ajaxPrefilterCapture, ajaxPrefilterMock);
  },
  teardown: function() {
    Ember.$.ajaxPrefilter = this.originalAjaxPrefilter;
    Ember.run.cancel(Ember.SimpleAuth.Session._syncPropertiesTimeout);
  }
});

test('assigns the login route during setup', function() {
  Ember.SimpleAuth.setup(applicationMock, { loginRoute: 'somewhere' });

  equal(Ember.SimpleAuth.loginRoute, 'somewhere', 'Ember.SimpleAuth saves loginRoute when specified for setup.');
});

test('assigns the route after login during setup', function() {
  Ember.SimpleAuth.setup(applicationMock, { routeAfterLogin: 'somewhere' });

  equal(Ember.SimpleAuth.routeAfterLogin, 'somewhere', 'Ember.SimpleAuth saves routeAfterLogin when specified for setup.');
});

test('assigns the route after logout during setup', function() {
  Ember.SimpleAuth.setup(applicationMock, { routeAfterLogout: 'somewhere' });

  equal(Ember.SimpleAuth.routeAfterLogout, 'somewhere', 'Ember.SimpleAuth saves routeAfterLogout when specified for setup.');
});

test('injects a session object in models, views, controllers and routes during setup', function() {
  Ember.SimpleAuth.setup(applicationMock);

  Ember.$.each(['model', 'view', 'controller', 'view'], function(i, component) {
    var injection = Ember.$.grep(applicationMock.injections, function(injection) {
      return injection.target === component;
    })[0];

    equal(injection.property, 'session', 'Ember.SimpleAuth injects makes a session object available as "session" in ' + component + ' during setup.');
    equal(injection.object.constructor, Ember.SimpleAuth.Session, 'Ember.SimpleAuth injects a session object into ' + component + ' during setup.');
  });
});

test('registers an AJAX prefilter that authorizes requests during setup', function() {
  Ember.SimpleAuth.setup(applicationMock, { authorizer: AuthorizerMock, store: Ember.SimpleAuth.Stores.Ephemeral });

  ajaxPrefilterMock.registeredAjaxPrefilter({}, {}, {});
  ok(authorizerMock.authorized, 'Ember.SimpleAuth registers an AJAX prefilter that authorizes same-origin requests during setup.');

  authorizerMock.authorized = false;
  ajaxPrefilterMock.registeredAjaxPrefilter({ url: 'https://a.different.domain:1234' }, {}, {});
  ok(!authorizerMock.authorized, 'Ember.SimpleAuth registers an AJAX prefilter that does not authorize cross-origin requests during setup.');

  Ember.SimpleAuth.setup(applicationMock, { crossOriginWhitelist: ['https://a.different.domain:1234'], authorizer: AuthorizerMock });
  ajaxPrefilterMock.registeredAjaxPrefilter({ url: 'https://a.different.domain:1234' }, {}, {});
  ok(authorizerMock.authorized, 'Ember.SimpleAuth registers an AJAX prefilter that authorizes cross-origin requests when the origin is in the crossOriginWhitelist during setup.');
});
