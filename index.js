/**
 * Module dependencies
 */

var Emitter = require('emitter');

/**
 * Expose Communique constructor
 */

module.exports = Communique;

/**
 * Create a messaging service
 */

function Communique() {
  this.addSeverity('error');
  this.addSeverity('warn');
  this.addSeverity('info');
  this._emitter = new Emitter();
  this.messages = [];
  this.defaults = {
    ttl: 3000,
    severity: 'error',
    message: 'Something went wrong... The error has been recorded to make future improvements.'
  };
}

/**
 * Add a severity level function to the logging service
 *
 * @param {String} severity
 * @return {Communique}
 */

Communique.prototype.addSeverity = function(severity) {
  var self = this;
  self[severity] = function(message, options) {
    self.log(message, options, severity);
  };
  return self;
};

/**
 * Adds an message to the list and notifies any subscribers
 *
 * @param {String} message
 * @param {Object} options
 * @param {String} severity
 */

Communique.prototype.log = function(message, options, severity) {
  var self = this;
  options = options || {};
  severity = severity || self.defaults.severity;
  message = message || self.defaults.message;
  options.ttl = options.ttl || self.defaults.ttl;

  var msg = new CommuniqueMessage(message, options, severity, self.messages, function() {
    self._emitter.emit('change', self.messages);
  });

  self.messages.push(msg);
  msg.removeAfter();

  self._emitter.emit('message', msg);
  self._emitter.emit('change', self.messages);

  return self;
};

/**
 * Subscribe to any changes in the messages
 *
 * @param {Function} cb
 * @return {Communique}
 */

Communique.prototype.onChange = function(cb) {
  var self = this;
  function proxy(arr) {cb(arr);};
  self._emitter.on('change', proxy);
  return function() {
    self._emitter.off('change', proxy);
  };
};

/**
 * Subscribe to any new messages
 *
 * @param {Function} cb
 * @return {Communique}
 */

Communique.prototype.onMessage = function(cb) {
  var self = this;
  function proxy(arr) {cb(arr);};
  self._emitter.on('message', proxy);
  return function() {
    self._emitter.off('message', proxy);
  };
};

/**
 * Create a message object that can remove itself from the messages list
 *
 * @param {String} message
 * @param {Object} options
 * @param {String} severity
 * @param {Array} messages
 */

function CommuniqueMessage(message, options, severity, messages, onremove) {
  this.message = message;
  this.options = options;
  this.severity = severity;
  this._messages = messages;
  this._onremove = onremove;
}

/**
 * Remove the message from its parent list
 */

CommuniqueMessage.prototype.remove = function() {
  var self = this;
  if (!self._messages) return;
  var i = self._messages.indexOf(self);
  if (i === -1) return;
  self._messages.splice(i, 1);
  delete self._timeout;
  delete self._messages;
  self._onremove(self);
  return self;
};

/**
 * Remove the message from its parent list after a ttl
 *
 * @param {Integer} time
 */

CommuniqueMessage.prototype.removeAfter = function(time) {
  var self = this;
  if (time) self.options.ttl = time;
  var ttl = self.options.ttl;
  if (ttl === -1) return;
  self._timeout = setTimeout(function() {
    self.remove();
  }, ttl);
  return self;
};

/**
 * Cancel the timer to remove the message from its parent
 */

CommuniqueMessage.prototype.cancel = function() {
  var self = this;
  if (!self._timeout) return;
  clearTimeout(self._timeout);
  delete self._timeout;
  return self;
};
