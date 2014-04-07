var assert   = require('assert');
var thunkify = require('thunkify');
var JWT      = require('jsonwebtoken');

// Make verify function play nice with co/koa
JWT.verify = thunkify(JWT.verify);

module.exports = function(opts) {
  opts = opts || {};
  opts.key = opts.key || 'user';

  assert(opts.secret, '"secret" option is required');

  return function *jwt(next) {
    var token, msg, user, parts, scheme, credentials;

    if(this.method === 'OPTIONS') {
      this.status = 204;
      return;
    }

    if (this.header.authorization) {
      parts = this.header.authorization.split(' ');
      if (parts.length == 2) {
        scheme = parts[0];
        credentials = parts[1];
          
        if (/^Bearer$/i.test(scheme)) {
          token = credentials;
        }
      } else {
        if (!opts.passthrough) {
          this.throw(401, 'Bad Authorization header format. Format is "Authorization: Bearer <token>"\n');
        }
      }
    } else {
      if (!opts.passthrough) {
        this.throw(401, 'No Authorization header found\n');
      }
    }

    try {
      user = yield JWT.verify(token, opts.secret, opts);
    } catch(e) {
      msg = 'Invalid token' + (opts.debug ? ' - ' + e.message + '\n' : '\n');
    }

    if (user || opts.passthrough) {
      this[opts.key] = user;
      yield next;
    } else {
      this.throw(401, msg);
    }
  };
};

module.exports.sign = JWT.sign;
module.exports.verify = JWT.verify;
