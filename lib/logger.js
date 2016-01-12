"use strict";

var manager = require('./log4js');

var levels = require('./levels')
, util = require('util')
, events = require('events')
, DEFAULT_CATEGORY = '[default]';

var logWritesEnabled = true;

/**
 * Models a logging event.
 * @constructor
 * @param {String} categoryName name of category
 * @param {Log4js.Level} level level of message
 * @param {Array} data objects to log
 * @param {Log4js.Logger} logger the associated logger
 * @author Seth Chisamore
 */
function LoggingEvent (categoryName, level, data, logger) {
  this.startTime = new Date();
  this.categoryName = categoryName;
  this.data = data;
  this.level = level;
  this.logger = logger;
}

/**
 * Logger to log messages.
 * use {@see Log4js#getLogger(String)} to get an instance.
 * @constructor
 * @param name name of category to log to
 * @author Stephan Strittmatter
 */
function Logger (name, level, parentLogger) {
  this.category = name || DEFAULT_CATEGORY;
  if (parentLogger) {
    this.parentLogger = parentLogger;
  } else if (this.category != DEFAULT_CATEGORY) {
    this.parentLogger = manager.getDefaultLogger();
  }

  var parentLevel = levels.FATAL;
  if (this.parentLogger && this.parentLogger.hasOwnProperty('level')) {
    parentLevel = this.parentLogger.level;
  }

  if (level) {
    this.level = levels.toLevel(level);
  } else {
    this.level = parentLevel;
  }

}
util.inherits(Logger, events.EventEmitter);
Logger.DEFAULT_CATEGORY = DEFAULT_CATEGORY;
Logger.prototype.level = levels.TRACE;

Logger.prototype.setLevel = function(level) {
  this.level = levels.toLevel(level, this.level || levels.TRACE);
};

Logger.prototype.removeLevel = function() {
  delete this.level;
};

Logger.prototype.getParent = function() {
  return this.parentLogger;
}

Logger.prototype.getLogger = function(subCategoryName) {
  if (!subCategoryName || subCategoryName.length <= 0) {
    return this;
  }

  return manager.getLogger(this.category+"."+subCategoryName);
}

Logger.prototype.log = function() {
  var args = Array.prototype.slice.call(arguments)
  , logLevel = levels.toLevel(args.shift(), levels.INFO)
  , loggingEvent;

  loggingEvent = new LoggingEvent(this.category, logLevel, args, this);
  this.emitLog(loggingEvent);
};

Logger.prototype.emitLog = function(loggingEvent) {
  if (loggingEvent.level && this.isLevelEnabled(loggingEvent.level)) {
    this.emit("log", loggingEvent);
  }
  else if (this.parentLogger) {
    loggingEvent.level = this.parentLogger.logLevel;
    Logger.prototype.emitLog.call(this.parentLogger, loggingEvent);
  }
}

Logger.prototype.isLevelEnabled = function(otherLevel) {
  if (this.level)
    return this.level.isLessThanOrEqualTo(otherLevel);
  return levels.FATAL.isLessThanOrEqualTo(otherLevel);
};

['Trace','Debug','Info','Warn','Error','Fatal', 'Mark'].forEach(
  function(levelString) {
    var level = levels.toLevel(levelString);
    Logger.prototype['is'+levelString+'Enabled'] = function() {
      return this.isLevelEnabled(level);
    };

    Logger.prototype[levelString.toLowerCase()] = function () {
      if (logWritesEnabled && this.isLevelEnabled(level)) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(level);
        Logger.prototype.log.apply(this, args);
      }
    };
  }
);

/**
 * Disable all log writes.
 * @returns {void}
 */
function disableAllLogWrites() {
  logWritesEnabled = false;
}

/**
 * Enable log writes.
 * @returns {void}
 */
function enableAllLogWrites() {
  logWritesEnabled = true;
}

exports.LoggingEvent = LoggingEvent;
exports.Logger = Logger;
exports.disableAllLogWrites = disableAllLogWrites;
exports.enableAllLogWrites = enableAllLogWrites;
