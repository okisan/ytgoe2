/*
 Copyright 2012 StackMob Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

(function () {
  var root = this;

  function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ')
        c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0)
        return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  function getSessionCookieValue() {
    return readCookie(StackMob.loggedInCookie);
  }

  function parseHash(text, name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\#&]" + name + "=([^&]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(text);
    if (results == null)
      return""; else
      return results[1];
  }

  window.StackMob = root.StackMob = {DEFAULT_API_VERSION: 0, DEFAULT_LOGIN_SCHEMA: 'user', DEFAULT_LOGIN_FIELD: 'username', DEFAULT_PASSWORD_FIELD: 'password', EARTH_RADIANS_MI: 3956.6, EARTH_RADIANS_KM: 6367.5, FORCE_CREATE_REQUEST: 'stackmob_force_create_request', ARRAY_FIELDNAME: 'stackmob_array_fieldname', ARRAY_VALUES: 'stackmob_array_values', CASCADE_DELETE: 'stackmob_cascade_delete', HARD_DELETE: true, SOFT_DELETE: false, apiVersion: 0, sdkVersion: "0.2.1", publicKey: null, loggedInCookie: null, loggedInUser: null, Storage: {STORAGE_PREFIX: 'stackmob.', persist: function (key, value) {
    if (localStorage)
      localStorage.setItem(this.STORAGE_PREFIX + key, value); else
      null;
  }, retrieve: function (key) {
    if (localStorage)
      return localStorage.getItem(this.STORAGE_PREFIX + key); else
      null;
  }, remove: function (key) {
    if (localStorage)
      localStorage.removeItem(this.STORAGE_PREFIX + key);
  }}, getLoggedInUser: function () {
    return(this.isLoggedIn() && this.Storage.retrieve(this.loggedInUserKey)) ? this.Storage.retrieve(this.loggedInUserKey) : null;
  }, isLoggedIn: function () {
    return(getSessionCookieValue() != null && !this.isLoggedOut()) || this.hasValidOAuth();
  }, isUserLoggedIn: function (username) {
    return username == this.getLoggedInUser();
  }, isLoggedOut: function () {
    if (this.isOAuthMode())return!this.hasValidOAuth();
    var cookieValue = getSessionCookieValue();
    if (!cookieValue)
      return false;
    try {
      return JSON.parse(cookieValue);
    } catch (err) {
      return false;
    }
  }, getScheme: function () {
    return this.secure === true ? 'https' : 'http';
  }, getDevAPIBase: function () {
    return this.fullURL === true ? this.getScheme() + '://dev.' + this.appName + '.' + this.clientSubdomain + '.stackmobapp.com/' : '/';
  }, getProdAPIBase: function () {
    return this.fullURL === true ? this.getScheme() + '://' + this.appName + '.' + this.clientSubdomain + '.stackmobapp.com/' : '/';
  }, getBaseURL: function () {
    return StackMob['apiURL'] || (StackMob['fullURL'] === true ? (StackMob['apiVersion'] === 0 ? StackMob.getDevAPIBase() : StackMob.getProdAPIBase()) : window.location.protocol + '//' + window.location.hostname + ':' + window.location.port)
  }, throwError: function (msg) {
    throw new Error(msg);
    logger.debug(requestHeaders);
  }, urlError: function () {
    this.throwError('A "url" property or function must be specified');
  }, requirePublicKey: function () {
    if (!StackMob.publicKey)
      this.throwError("Error: This requires that you initialize StackMob with a public key.");
  }, isOAuthMode: function () {
    return!isNaN(StackMob['publicKey'] && !StackMob['privateKey']);
  }, initOAuthForm: function (id) {
    function findForm() {
      var forms = document.getElementsByTagName('form');
      return _.find(forms, function (elem) {
        return elem.getAttribute('action').replace(new RegExp('http://|https://', 'g'), '').match(new RegExp("(/.*/accessToken)$"));
      })
    }

    var f = document.getElementById(id) || findForm();
    if (!f)StackMob.throwError('Could not find the login form.');
    var tokenType = document.createElement('input');
    tokenType.setAttribute('name', 'token_type');
    tokenType.setAttribute('value', 'mac');
    var apiKey = document.createElement('input');
    apiKey.setAttribute('name', 'stackmob_api_key');
    apiKey.setAttribute('value', StackMob['publicKey']);
    var apiVersion = document.createElement('input');
    apiVersion.setAttribute('name', 'stackmob_api_version');
    apiVersion.setAttribute('value', StackMob['apiVersion']);
    _.each([tokenType, apiKey, apiVersion], function (elem) {
      elem.setAttribute('type', 'hidden');
      f.appendChild(elem);
    });
  }, handleOAuthCallback: function (options) {
    var options = options || {};
    var theUrl = options['url'] || window.location.href;
    var accessToken = parseHash(theUrl, 'access_token');
    var macKey = parseHash(theUrl, 'mac_key');
    var expires = parseInt(parseHash(theUrl, 'expires'));
    if (_.all([accessToken, macKey, expires], _.identity)) {
      var unvalidated_expiretime = (new Date()).getTime() + (expires * 1000);
      if (this.Storage.retrieve('oauth2_accessToken') != accessToken) {
        this.Storage.persist('oauth2_expires', unvalidated_expiretime);
      }
      this.Storage.persist('oauth2_accessToken', accessToken);
      this.Storage.persist('oauth2_macKey', macKey);
      if (options['success'])options['success']();
    } else {
      var msg = parseHash(theUrl, 'error');
      if (options['error'])options['error'](msg);
    }
  }, hasValidOAuth: function () {
    if (!this.isOAuthMode())return false;
    var accessToken = StackMob.Storage.retrieve('oauth2_accessToken');
    var macKey = StackMob.Storage.retrieve('oauth2_macKey');
    var expires = parseInt(StackMob.Storage.retrieve('oauth2_expires'));
    return _.all([accessToken, macKey, expires], _.identity) && (new Date()).getTime() <= expires;
  }, getOAuthExpireTime: function () {
    var expires = this.Storage.retrieve('oauth2_expires');
    return expires ? parseInt(expires) : null;
  }, METHOD_MAP: {"create": "POST", "read": "GET", "update": "PUT", "delete": "DELETE", "addRelationship": "POST", "appendAndSave": "PUT", "deleteAndSave": "DELETE", "login": "GET", "logout": "GET", "forgotPassword": "POST", "loginWithTempAndSetNewPassword": "GET", "resetPassword": "POST", "createUserViaOAuth2": "POST", "loginWithFacebookToken": "GET", "createUserWithFacebook": "GET", "linkUserWithFacebook": "GET", "cc": "GET"}, getProperty: function (object, prop) {
    if (!(object && object[prop]))
      return null;
    return _.isFunction(object[prop]) ? object[prop]() : object[prop];
  }, init: function (options) {
    options = options || {};
    this.initStart(options);
    this.userSchema = options['userSchema'] || this.DEFAULT_LOGIN_SCHEMA;
    this.loginField = options['loginField'] || this.DEFAULT_LOGIN_FIELD;
    this.passwordField = options['passwordField'] || this.DEFAULT_PASSWORD_FIELD;
    this.newPasswordField = options['newPasswordField'] || 'new_password';
    this.apiVersion = options['apiVersion'] || this.DEFAULT_API_VERSION;
    this.appName = this.getProperty(options, "appName") || this.throwError("An appName must be specified");
    this.clientSubdomain = this.getProperty(options, "clientSubdomain");
    this.loggedInCookie = 'session_' + this.appName;
    this.loggedInUserKey = this.loggedInCookie + '_user';
    this.publicKey = options['publicKey'];
    this.apiURL = options['apiURL'];
    if (this.isOAuthMode() && (!root.Crypto || isNaN(root.Crypto && root.Crypto.HMAC))) {
      var script = document.createElement('script');
      script.setAttribute('src', 'http://crypto-js.googlecode.com/files/2.5.3-crypto-sha1-hmac.js');
      script.setAttribute('type', 'text/javascript');
      var loaded = false;
      var loadFunction = function () {
        if (loaded)return;
        loaded = true;
      };
      script.onload = loadFunction;
      script.onreadystatechange = loadFunction;
      var headID = document.getElementsByTagName("head")[0];
      headID.appendChild(script);
    }
    this.secure = options['secure'] === true;
    this.fullURL = options['fullURL'] === true || this.fullURL;
    this.ajax = options['ajax'] || this.ajax;
    if (this.apiVersion === 0) {
      this.debug = true;
      this.urlRoot = options['urlRoot'] || this.getDevAPIBase();
    } else {
      this.debug = false;
      this.urlRoot = options['urlRoot'] || this.getProdAPIBase();
    }
    this.initEnd(options);
    return this;
  }, initStart: function (options) {
  }, initEnd: function (options) {
  }};
}).call(this);
(function () {
  var root = this;
  var $ = root.jQuery || root.Ext || root.Zepto;

  function createBaseString(ts, nonce, method, uri, host, port) {
    var nl = '\u000A';
    return ts + nl + nonce + nl + method + nl + uri + nl + host + nl + port + nl + nl;
  }

  function bin2String(array) {
    var result = "";
    for (var i = 0; i < array.length; i++) {
      result += String.fromCharCode(array[i]);
    }
    return result;
  }

  function generateMAC(method, id, key, hostWithPort, url) {
    var splitHost = hostWithPort.split(':');
    var hostNoPort = splitHost.length > 1 ? splitHost[0] : hostWithPort;
    var port = splitHost.length > 1 ? splitHost[1] : 80;
    var ts = Math.round(new Date().getTime() / 1000);
    var nonce = "n" + Math.round(Math.random() * 10000);
    var base = createBaseString(ts, nonce, method, url, hostNoPort, port);
    var bstring = bin2String(Crypto.HMAC(Crypto.SHA1, base, key, {asBytes: true}));
    var mac = btoa(bstring);
    return'MAC id="' + id + '",ts="' + ts + '",nonce="' + nonce + '",mac="' + mac + '"';
  }

  _.extend(StackMob, {isSencha: function () {
    return root.Ext;
  }, isZepto: function () {
    return root.Zepto;
  }, initEnd: function (options) {
    createStackMobModel();
    createStackMobCollection();
    createStackMobUserModel();
  }, cc: function (method, params, options) {
    this.customcode(method, params, options);
  }, customcode: function (method, params, options) {
    options = options || {};
    options['data'] = options['data'] || {};
    _.extend(options['data'], params);
    options['url'] = this.debug ? this.getDevAPIBase() : this.getProdAPIBase();
    this.sync.call(StackMob, method, null, options);
  }, sync: function (method, model, options) {
    options = options || {};
    var forceCreateRequest = options[StackMob.FORCE_CREATE_REQUEST] === true
    if (forceCreateRequest) {
      method = 'create';
    }
    function _prepareBaseURL(model, params) {
      if (!params['url']) {
        if (model)
          params['url'] = StackMob.getProperty(model, "url");
      }
      var notCustomCode = method != 'cc';
      var notNewModel = (model && model.isNew && !model.isNew());
      var notForcedCreateRequest = !forceCreateRequest;
      var isArrayMethod = (method == 'addRelationship' || method == 'appendAndSave' || method == 'deleteAndSave');
      if (_isExtraMethodVerb(method)) {
        var endpoint = method;
        if (method == 'createUserViaOAuth2')
          endpoint = 'registerUser';
        params['url'] += (params['url'].charAt(params['url'].length - 1) == '/' ? '' : '/') + endpoint;
      } else if (isArrayMethod || notCustomCode && notNewModel && notForcedCreateRequest) {
        params['url'] += (params['url'].charAt(params['url'].length - 1) == '/' ? '' : '/') + encodeURIComponent(model.get(model.getPrimaryKeyField()));
        if (isArrayMethod) {
          params['url'] += '/' + options[StackMob.ARRAY_FIELDNAME];
        }
        if (method == 'deleteAndSave') {
          var ids = '';
          if (_.isArray(options[StackMob.ARRAY_VALUES])) {
            ids = _.map(options[StackMob.ARRAY_VALUES],
                function (id) {
                  return encodeURIComponent(id);
                }).join(',');
          } else {
            ids = encodeURIComponent(options[StackMob.ARRAY_VALUES]);
          }
          params['url'] += '/' + ids
        }
      }
    }

    function _prepareHeaders(params, options) {
      params['headers'] = params['headers'] || {};
      params['headers'] = _.extend({"Accept": 'application/vnd.stackmob+json; version=' + StackMob['apiVersion']}, params['headers']);
      _.extend(params['headers'], {"X-StackMob-User-Agent": "StackMob (JS; " + StackMob['sdkVersion'] + ")/" + StackMob['appName']});
      if (StackMob['publicKey'] && !StackMob['privateKey']) {
        params['headers']['X-StackMob-API-Key'] = StackMob['publicKey'];
        params['headers']['X-StackMob-Proxy-Plain'] = 'stackmob-api';
      } else {
        params['headers']['X-StackMob-Proxy'] = 'stackmob-api';
      }
      if (_.include(['PUT', 'POST'], StackMob.METHOD_MAP[method]))params['contentType'] = params['contentType'] || 'application/json';
      if (!isNaN(options[StackMob.CASCADE_DELETE])) {
        params['headers']['X-StackMob-CascadeDelete'] = options[StackMob.CASCADE_DELETE] == true;
      }
      if (options['query']) {
        var queryObj = params['query'] || throwError("No StackMobQuery object provided to the query call.");
        if (queryObj['selectFields']) {
          if (queryObj['selectFields'].length > 0) {
            params['headers']["X-StackMob-Select"] = queryObj['selectFields'].join();
          }
        }
        if (queryObj['range']) {
          params['headers']['Range'] = 'objects=' + queryObj['range']['start'] + '-' + queryObj['range']['end'];
        }
        _.extend(params['data'], queryObj['params']);
        if (queryObj['orderBy'] && queryObj['orderBy'].length > 0) {
          var orderList = queryObj['orderBy'];
          var order = '';
          var size = orderList.length;
          for (var i = 0; i < size; i++) {
            order += orderList[i];
            if (i + 1 < size)
              order += ',';
          }
          params['headers']["X-StackMob-OrderBy"] = order;
        }
      }
    }

    function _prepareRequestBody(method, params, options) {
      options = options || {};
      if (params['type'] == 'POST' || params['type'] == 'PUT') {
        if (method == 'resetPassword' || method == 'forgotPassword') {
          params['data'] = JSON.stringify(params['data']);
        } else if (method == 'addRelationship' || method == 'appendAndSave') {
          if (options && options[StackMob.ARRAY_VALUES])
            params['data'] = JSON.stringify(options[StackMob.ARRAY_VALUES]);
        } else if (method == 'createUserViaOAuth2') {
          params['data'] = params['data'];
        } else if (model) {
          var json = model.toJSON();
          delete json['lastmoddate'];
          delete json['createddate'];
          params['data'] = JSON.stringify(_.extend(json, params['data']));
        } else
          params['data'] = JSON.stringify(params.data);
      } else if (params['type'] == "GET") {
        if (!_.isEmpty(params['data'])) {
          params['url'] += '?';
          var keys = _.keys(params['data']);
          var path = '';
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i]
            var value = params['data'][key];
            path += key + '=' + encodeURIComponent(value);
            if (i + 1 < keys.length)
              path += '&';
          }
          params['url'] += path;
        }
        delete params['data'];
      } else {
        delete params['data'];
      }
    }

    function _prepareAjaxClientParams(params) {
      params = params || {};
      params['processData'] = false;
      params['accepts'] = params['headers']["Accept"];
    }

    function _prepareAuth(method, params) {
      if (_.include(['createUserViaOAuth2'], method)) {
        return;
      }
      var host = StackMob.getBaseURL();
      var path = params['url'].replace(new RegExp(host, 'g'), '/');
      var sighost = host.replace(new RegExp('^http://|^https://', 'g'), '');
      var accessToken = StackMob.Storage.retrieve('oauth2_accessToken');
      var macKey = StackMob.Storage.retrieve('oauth2_macKey');
      var expires = StackMob.Storage.retrieve('oauth2_expires');
      if (StackMob.isOAuthMode() && accessToken && macKey) {
        var authHeaders = generateMAC(StackMob.METHOD_MAP[method] || 'GET', accessToken, macKey, sighost, path);
        if (authHeaders)
          params['headers']['Authorization'] = authHeaders;
      }
    }

    function _isExtraMethodVerb(method) {
      return!_.include(['create', 'update', 'delete', 'read', 'query', 'deleteAndSave', 'appendAndSave', 'addRelationship'], method);
    }

    var type = StackMob.METHOD_MAP[method] || 'GET';
    var params = _.extend({type: type, dataType: 'json'}, options);
    params['data'] = params['data'] || {};
    _prepareBaseURL(model, params);
    _prepareHeaders(params, options);
    _prepareRequestBody(method, params, options);
    _prepareAjaxClientParams(params);
    _prepareAuth(method, params);
    StackMob.makeAPICall(model, params, method);
  }, makeAPICall: function (model, params, method) {
    if (StackMob['ajax']) {
      return StackMob['ajax'](model, params, method);
    } else if (StackMob.isSencha()) {
      return StackMob['ajaxOptions']['sencha'](model, params, method);
    } else if (StackMob.isZepto()) {
      return StackMob['ajaxOptions']['zepto'](model, params, method);
    } else {
      return StackMob['ajaxOptions']['jquery'](model, params, method);
    }
  }});
  var createStackMobModel = function () {
    StackMob.Model = Backbone.Model.extend({urlRoot: StackMob['urlRoot'], url: function () {
      var base = StackMob['urlRoot'] || StackMob.urlError();
      base += this.schemaName;
      return base;
    }, getPrimaryKeyField: function () {
      return this.schemaName + '_id';
    }, constructor: function () {
      this.setIDAttribute();
      Backbone.Model.prototype.constructor.apply(this, arguments);
    }, initialize: function (attributes, options) {
      StackMob.getProperty(this, 'schemaName') || StackMob.throwError('A schemaName must be defined');
      this.setIDAttribute();
    }, setIDAttribute: function () {
      this.idAttribute = this.getPrimaryKeyField();
    }, parse: function (data, xhr) {
      if (!data || (data && (!data['text'] || data['text'] == '')))
        return data;
      var attrs = JSON.parse(data['text']);
      return attrs;
    }, sync: function (method, model, options) {
      StackMob.sync.call(this, method, this, options);
    }, create: function (options) {
      var newOptions = {};
      newOptions[StackMob.FORCE_CREATE_REQUEST] = true;
      _.extend(newOptions, options)
      this.save(null, newOptions);
    }, query: function (stackMobQuery, options) {
      options = options || {};
      _.extend(options, {query: stackMobQuery})
      this.fetch(options);
    }, fetchExpanded: function (depth, options) {
      if (depth < 0 || depth > 3)
        StackMob.throwError('Depth must be between 0 and 3 inclusive.');
      var newOptions = {};
      _.extend(newOptions, options);
      newOptions['data'] = newOptions['data'] || {};
      newOptions['data']['_expand'] = depth;
      this.fetch(newOptions);
    }, getAsModel: function (fieldName, model) {
      var obj = this.get(fieldName);
      if (!obj)
        return{}; else {
        if (_.isArray(obj)) {
          return _.map(obj, function (o) {
            return new model(o);
          });
        } else {
          return new model(obj);
        }
      }
    }, appendAndCreate: function (fieldName, values, options) {
      this.addRelationship(fieldName, values, options);
    }, addRelationship: function (fieldName, values, options) {
      options = options || {};
      options[StackMob.ARRAY_FIELDNAME] = fieldName;
      options[StackMob.ARRAY_VALUES] = values;
      StackMob.sync.call(this, 'addRelationship', this, options);
    }, appendAndSave: function (fieldName, values, options) {
      options = options || {};
      options[StackMob.ARRAY_FIELDNAME] = fieldName;
      options[StackMob.ARRAY_VALUES] = values;
      StackMob.sync.call(this, 'appendAndSave', this, options);
    }, deleteAndSave: function (fieldName, values, cascadeDelete, options) {
      options = options || {};
      options[StackMob.ARRAY_FIELDNAME] = fieldName;
      options[StackMob.ARRAY_VALUES] = values;
      options[StackMob.CASCADE_DELETE] = cascadeDelete;
      StackMob.sync.call(this, 'deleteAndSave', this, options);
    }, setBinaryFile: function (fieldName, filename, filetype, base64EncodedData) {
      var binaryValueString = 'Content-Type: ' + filetype + '\n' + 'Content-Disposition: attachment; ' + 'filename=' + filename + '\n' + 'Content-Transfer-Encoding: base64\n\n' + base64EncodedData;
      this.set(fieldName, binaryValueString);
    }});
  };
  var createStackMobCollection = function () {
    StackMob.Collection = Backbone.Collection.extend({initialize: function () {
      this.model || StackMob.throwError('Please specify a StackMobModel for this collection. e.g., var Items = StackMobCollection.extend({ model: Item });');
      this.schemaName = (new this.model()).schemaName;
    }, url: function () {
      var base = StackMob['urlRoot'] || StackMob.urlError();
      base += this.schemaName;
      return base;
    }, parse: function (data, xhr) {
      if (!data || (data && (!data['text'] || data['text'] == '')))
        return data;
      var attrs = JSON.parse(data['text']);
      return attrs;
    }, sync: function (method, model, options) {
      StackMob.sync.call(this, method, this, options);
    }, query: function (stackMobQuery, options) {
      options = options || {};
      _.extend(options, {query: stackMobQuery})
      this.fetch(options);
    }, create: function (model, options) {
      var newOptions = {};
      newOptions[StackMob.FORCE_CREATE_REQUEST] = true;
      _.extend(newOptions, options);
      Backbone.Collection.prototype.create.call(this, model, newOptions);
    }, count: function (stackMobQuery, options) {
      stackMobQuery = stackMobQuery || new StackMob.Collection.Query();
      options = options || {};
      options.stackmob_count = true;
      var success = options.success;
      var successFunc = function (xhr) {
        if (xhr && xhr.getAllResponseHeaders) {
          var responseHeader = xhr.getResponseHeader('Content-Range');
          var count = -1;
          if (responseHeader) {
            count = responseHeader.substring(responseHeader.indexOf('/') + 1, responseHeader.length)
          }
          if (success) {
            success(count);
          }
        }
      }
      options.success = successFunc;
      if (stackMobQuery.setRange)options.query = (stackMobQuery).setRange(0, 0);
      return(this.sync || Backbone.sync).call(this, 'query', this, options)
    }});
  };
  var createStackMobUserModel = function () {
    StackMob.User = StackMob.Model.extend({idAttribute: StackMob['loginField'], schemaName: 'user', getPrimaryKeyField: function () {
      return StackMob.loginField;
    }, isLoggedIn: function () {
      return StackMob.isUserLoggedIn(this.get(StackMob['loginField']));
    }, createViaOAuth2: function (options) {
      StackMob.requirePublicKey();
      options = options || {};
      options['contentType'] = 'application/x-www-form-urlencoded';
      options['data'] = encodeURIComponent(StackMob['loginField']) + '=' + encodeURIComponent(this.get(StackMob['loginField'])) + '&' +
          encodeURIComponent(StackMob['passwordField']) + '=' + encodeURIComponent(this.get(StackMob['passwordField']));
      options['headers'] = options['headers'] || {};
      (this.sync || Backbone.sync).call(this, "createUserViaOAuth2", this, options);
    }, login: function (keepLoggedIn, options) {
      options = options || {};
      var remember = isNaN(keepLoggedIn) ? false : keepLoggedIn;
      options['data'] = options['data'] || {};
      options['data'][StackMob.loginField] = this.get(StackMob.loginField);
      options['data'][StackMob.passwordField] = this.get(StackMob.passwordField);
      var user = this;
      options['stackmob_onlogin'] = function () {
        StackMob.Storage.persist(StackMob.loggedInUserKey, user.get(StackMob['loginField']));
      };
      (this.sync || Backbone.sync).call(this, "login", this, options);
    }, logout: function (options) {
      options = options || {};
      options['data'] = options['data'] || {};
      options['stackmob_onlogout'] = function () {
        StackMob.Storage.remove(StackMob.loggedInUserKey);
        StackMob.Storage.remove('oauth2_accessToken');
        StackMob.Storage.remove('oauth2_macKey');
        StackMob.Storage.remove('oauth2_expires');
      };
      (this.sync || Backbone.sync).call(this, "logout", this, options);
    }, loginWithFacebookToken: function (facebookAccessToken, keepLoggedIn, options) {
      options = options || {};
      options['data'] = options['data'] || {};
      _.extend(options['data'], {"fb_at": facebookAccessToken});
      (this.sync || Backbone.sync).call(this, "facebookLogin", this, options);
    }, createUserWithFacebook: function (facebookAccessToken, options) {
      options = options || {};
      options['data'] = options['data'] || {};
      _.extend(options['data'], {"fb_at": facebookAccessToken});
      options['data'][StackMob.loginField] = options[StackMob['loginField']] || this.get(StackMob['loginField']);
      (this.sync || Backbone.sync).call(this, "createUserWithFacebook", this, options);
    }, linkUserWithFacebook: function (facebookAccessToken, options) {
      options = options || {};
      options['data'] = options['data'] || {};
      _.extend(options['data'], {"fb_at": facebookAccessToken});
      (this.sync || Backbone.sync).call(this, "linkUserWithFacebook", this, options);
    }, loginWithTempAndSetNewPassword: function (tempPassword, newPassword, keepLoggedIn, options) {
      options = options || {};
      options['data'] = options['data'] || {};
      var obj = {};
      obj[StackMob.passwordField] = oldPassword;
      this.set(obj);
      options['data'][StackMob.newPasswordField] = newPassword;
      this.login(keepLoggedIn, options);
    }, forgotPassword: function (options) {
      options = options || {};
      options['data'] = options['data'] || {};
      options['data'][StackMob.loginField] = this.get(StackMob.loginField);
      (this.sync || Backbone.sync).call(this, "forgotPassword", this, options);
    }, resetPassword: function (oldPassword, newPassword, options) {
      options = options || {};
      options['data'] = options['data'] || {};
      options['data']['old'] = {password: oldPassword};
      options['data']['new'] = {password: newPassword};
      (this.sync || Backbone.sync).call(this, "resetPassword", this, options);
    }});
    StackMob.Users = StackMob.Collection.extend({model: StackMob.User});
    StackMob.GeoPoint = function (lat, lon) {
      if (_.isNumber(lat)) {
        this.lat = lat;
        this.lon = lon;
      } else {
        this.lat = lat['lat'];
        this.lon = lat['lon'];
      }
    }
    StackMob.GeoPoint.prototype.toJSON = function () {
      return{lat: this.lat, lon: this.lon};
    }
    StackMob.Model.Query = function () {
      this.selectFields = [];
      this.params = {};
    }
    _.extend(StackMob.Model.Query.prototype, {select: function (key) {
      this.selectFields.push(key);
      return this;
    }, setExpand: function (depth) {
      this.params['_expand'] = depth;
      return this;
    }})
    StackMob.Collection.Query = function () {
      this.params = {};
      this.orderBy = [];
      this.range = null;
    }
    StackMob.Collection.Query.prototype = new StackMob.Model.Query;
    StackMob.Collection.Query.prototype.constructor = StackMob.Collection.Query;
    _.extend(StackMob.Collection.Query.prototype, {addParam: function (key, value) {
      this.params[key] = value;
      return this;
    }, equals: function (field, value) {
      this.params[field] = value;
      return this;
    }, lt: function (field, value) {
      this.params[field + '[lt]'] = value;
      return this;
    }, lte: function (field, value) {
      this.params[field + '[lte]'] = value;
      return this;
    }, gt: function (field, value) {
      this.params[field + '[gt]'] = value;
      return this;
    }, gte: function (field, value) {
      this.params[field + '[gte]'] = value;
      return this;
    }, notEquals: function (field, value) {
      this.params[field + '[ne]'] = value;
      return this;
    }, isNull: function (field) {
      this.params[field + '[null]'] = true;
      return this;
    }, isNotNull: function (field) {
      this.params[field + '[null]'] = false;
      return this;
    }, mustBeOneOf: function (field, value) {
      var inValue = '';
      if (_.isArray(value)) {
        var newValue = '';
        var size = value.length;
        for (var i = 0; i < size; i++) {
          inValue += value[i];
          if (i + 1 < size)
            inValue += ',';
        }
      } else
        inValue = value;
      this.params[field + '[in]'] = inValue;
      return this;
    }, orderAsc: function (field) {
      this.orderBy.push(field + ':asc');
      return this;
    }, orderDesc: function (field) {
      this.orderBy.push(field + ':desc');
      return this;
    }, setRange: function (start, end) {
      this.range = {'start': start, 'end': end};
      return this;
    }, mustBeNear: function (field, smGeoPoint, distance) {
      this.params[field + '[near]'] = smGeoPoint.lat + ',' + smGeoPoint.lon + ',' + distance;
      return this;
    }, mustBeNearMi: function (field, smGeoPoint, miles) {
      this.mustBeNear(field, smGeoPoint, miles / StackMob.EARTH_RADIANS_MI);
      return this;
    }, mustBeNearKm: function (field, smGeoPoint, miles) {
      this.mustBeNear(field, smGeoPoint, miles / StackMob.EARTH_RADIANS_KM);
      return this;
    }, isWithin: function (field, smGeoPoint, distance) {
      this.params[field + '[within]'] = smGeoPoint.lat + ',' + smGeoPoint.lon + ',' + distance;
      return this;
    }, isWithinMi: function (field, smGeoPoint, distance) {
      this.isWithin(field, smGeoPoint, distance / StackMob.EARTH_RADIANS_MI);
      return this;
    }, isWithinKm: function (field, smGeoPoint, distance) {
      this.isWithin(field, smGeoPoint, distance / StackMob.EARTH_RADIANS_KM);
      return this;
    }, isWithinBox: function (field, smGeoPoint1, smGeoPoint2) {
      this.params[field + '[within]'] = smGeoPoint1.lat + ',' + smGeoPoint1.lon + ',' + smGeoPoint2.lat + ',' + smGeoPoint2.lon;
      return this;
    }});
  };
}).call(this);
(function () {
  var root = this;
  var $ = root.jQuery || root.Ext || root.Zepto;
  _.extend(StackMob, {ajaxOptions: {'sencha': function (model, params, method) {
    var success = params['success'];
    var defaultSuccess = function (response, options) {
      if (_.isFunction(params['stackmob_on' + method]))
        params['stackmob_on' + method]();
      if (response.responseText) {
        var result = JSON.parse(response.responseText);
        model.clear();
        if (params["stackmob_count"] === true) {
          success(response);
        } else if (!model.set(result))
          return false;
        success(model);
      } else
        success();
    };
    params['success'] = defaultSuccess;
    var error = params['error'];
    var defaultError = function (response, request) {
      var result = response.responseText ? JSON.parse(response.responseText) : response;
      (function (m, d) {
        error(d);
      }).call(StackMob, model, result);
    }
    params['error'] = defaultError;
    var hash = {};
    hash['url'] = params['url'];
    hash['headers'] = params['headers'];
    hash['params'] = params['data'];
    hash['success'] = params['success'];
    hash['failure'] = params['error'];
    hash['disableCaching'] = false;
    hash['method'] = params['type'];
    return $.Ajax.request(hash);
  }, 'zepto': function (model, params, method) {
    var success = params['success'];
    var defaultSuccess = function (response, result, xhr) {
      if (_.isFunction(params['stackmob_on' + method]))
        params['stackmob_on' + method]();
      if (response) {
        var result = JSON.parse(response);
        model.clear();
        if (params["stackmob_count"] === true) {
          success(xhr);
        } else if (!model.set(result))
          return false;
        success(model);
      } else
        success();
    };
    params['success'] = defaultSuccess;
    var error = params['error'];
    var defaultError = function (response, request) {
      var result = response.responseText ? JSON.parse(response.responseText) : response;
      (function (m, d) {
        error(d);
      }).call(StackMob, model, result);
    }
    params['error'] = defaultError;
    var hash = {};
    hash['url'] = params['url'];
    hash['headers'] = params['headers'];
    hash['type'] = params['type'];
    hash['data'] = params['data'];
    hash['success'] = defaultSuccess;
    hash['error'] = defaultError;
    return $.ajax(hash);
  }, 'jquery': function (model, params, method) {
    params['beforeSend'] = function (jqXHR, settings) {
      jqXHR.setRequestHeader("Accept", settings['accepts']);
      if (!_.isEmpty(settings['headers'])) {
        for (key in settings['headers']) {
          jqXHR.setRequestHeader(key, settings['headers'][key]);
        }
      }
    };
    var success = params['success'];
    var defaultSuccess = function (model, status, xhr) {
      var result;
      if (model && model.toJSON) {
        result = model;
      } else if (model && (model.responseText || model.text)) {
        var json = JSON.parse(model.responseText || model.text);
        result = json;
      } else if (model) {
        result = model;
      }
      if (params["stackmob_count"] === true) {
        result = xhr;
      }
      if (_.isFunction(params['stackmob_on' + method]))
        params['stackmob_on' + method]();
      if (success) {
        success(result);
      }
    };
    params['success'] = defaultSuccess;
    var err = params['error'];
    params['error'] = function (jqXHR, textStatus, errorThrown) {
      if (jqXHR.status == 302 && jqXHR.getResponseHeader("locations")) {
      }
      var data;
      if (jqXHR && (jqXHR.responseText || jqXHR.text)) {
        var result = JSON.parse(jqXHR.responseText || jqXHR.text);
        data = result;
      }
      (function (m, d) {
        if (err)
          err(d);
      }).call(StackMob, model, data);
    }
    return $.ajax(params);
  }}});
}).call(this);