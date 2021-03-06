var Request = require("sdk/request").Request;
var preferences = require("sdk/simple-prefs");
var self = require("sdk/self");
var tabs = require("sdk/tabs");
var timers = require("sdk/timers");
var widgets = require("sdk/widget");

const COMPACT_WIDTH = 18;
const LARGE_WIDTH = 120;

exports.checker = null;

exports.main = function (options, callbacks) {

  var widget = widgets.Widget({
    id: "github-status",
    label: "Github Status Checher",
    width: COMPACT_WIDTH,
    contentURL: self.data.url("indicator.html"),
    contentScriptFile: self.data.url("periodical-checker.js"),
    onClick: function() {
      tabs.open("https://status.github.com/");
    }
  });

  // preference value is in seconds: take it to miliseconds
  var checkInterval = preferences.prefs["checkInterval"] * 60 * 1000;
  var guiMode = preferences.prefs["guiMode"];

  console.log(checkInterval);

  var updateStatusIndicator = function(status, last_updated) {
    widget.port.emit("update-status", status, last_updated);
    widget.tooltip = "Github Status - Updated: " + last_updated;
  };

  var checkStatus = function() {
    Request({
      url: "https://status.github.com/api/status.json",
      onComplete: function(response) {

        var status;
        var last_updated;

        if (response.json) {
          status = response.json.status;
          last_updated = response.json.last_updated;
        } else {
           status = "Unknown";
        };

        updateStatusIndicator(status, last_updated);
        console.log("Status updated:", (new Date()).toString());
      }
    }).get();

    if (!this.checker) {
      checker = timers.setInterval(checkStatus, checkInterval);
    }
  };

  function checkIntervalChanged(prefName) {
    // preference value is in minutes: take it to miliseconds
    checkInterval = preferences.prefs[prefName] * 60 * 1000;
    console.log("Setted to", checkInterval);
    // re-schedule interval timer
    timers.clearInterval(this.checker);
    if (checkInterval > 0) {
      this.checker = timers.setInterval(checkStatus, checkInterval);
    }
  }

  function guiModeChanged(prefName) {
    var newValue = preferences.prefs[prefName];
    if (newValue == "compact") {
        widget.width = COMPACT_WIDTH;
    } else {
        widget.width = LARGE_WIDTH;
    }
    widget.port.emit("change-gui-mode", newValue);
  }

  preferences.on("checkInterval", checkIntervalChanged);
  preferences.on("guiMode", guiModeChanged);

  checkStatus();
}

exports.onUnload = function (reason) {
  timers.clearInterval(this.checker);
};
