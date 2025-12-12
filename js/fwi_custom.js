// var cacheBusterText = '_fwi';
var FWI_Custom = {
  counterReceive: 0,
  counterSend: 0,
  iframeDomain: '',
  enabled: false,
  webPlayerVersion: '0.0.0',

  // Receive + Route from iframe
  recieveChildFn: function(e) {
    // Check for CM Remote Command + Player Confirm Callbacks
    try {
      if (e) {
        if (e.data) {
          if (e.data.command) {
            // Check if this player function needs action
            FWI_Custom.playerSent(e.data.command, e.data);
          }

          var receivedData;

          if (typeof e.data === 'string') {
            receivedData = JSON.parse(e.data);
          } else {
            receivedData = e.data;
          }

          if (receivedData.funct) {
            FWI_Custom.counterReceive += 1;
            FWI_App.log(
              'Attempting to execute function: ' + receivedData.funct,
              'DEBUG'
            );
            FWI_App.log(
              'Player command - ' +
                FWI_Custom.counterReceive +
                '| IN FUNCT: ' +
                receivedData.funct
            );
            window['FWI_Custom'][receivedData.funct](receivedData);
          }
        }
      }
    } catch (err) {
      FWI_App.log('recieveChildFn error: ' + err, 'ERROR');
      FWI_App.log('recieveChildFn error arg: ' + JSON.stringify(e), 'ERROR');
    }
  },

  // Summary: Restarts (or starts) the player monitor.
  restartPlayerMonitor: function() {
    // Start monitor timer. We check every few minutes if the player can still be reached.
    FWI_App.log(
      'Starting or restarting monitor for Content Player for Web.',
      'DEBUG'
    );
    var $webView = FWI_App.playerElement;

    this.stopPlayerMonitor();
    this._monitorTimer = setInterval(
      $.proxy(function() {
        var contentWindow = $webView ? $webView[0].contentWindow : null; // Window hosting Web Player.

        if (contentWindow && contentWindow.document.domain) {
          // Send "ping" command to Web Player.
          var domain = FWI_Deploy.storageURL; // Sign URL domain.
          var pingMessage = {
            command: 'ping'
          };

          FWI_App.log(
            'Sending ping message to Content Player for Web.',
            'DEBUG'
          );
          contentWindow.postMessage(pingMessage, domain);

          // Then wait for a response.
          this._pingReplyTimer = setTimeout(
            $.proxy(
              function() {
                // We did not receive a reply from Web Player. Attempt to reconnect to the sign.
                var link = $webView.attr('src');
                FWI_App.log(
                  'Content Player for Web is unresponsive at URL "' +
                    link +
                    '". Attempting to reload sign.',
                  'WARN'
                );

                // Reload sign.
                var onSuccess = function() {
                  if (FWI_Deploy.setIframeURL) {
                    FWI_Deploy.setIframeURL();
                  }
                  FWI_App.displayPlayer();
                };
                FWI_Deploy.cachedSignin(onSuccess);
              },
              this,
              $webView
            ),
            60000 // Wait up to one minute for a response from Web Player.
          );
        }
      }, this),
      120000 // Every two minutes.
    );
  },

  // Summary: Stops the player monitor.
  stopPlayerMonitor: function() {
    clearTimeout(this._pingReplyTimer);
    clearTimeout(this._monitorTimer);
  },

  /* Specific User Initiated Commands */
  /* Original 5.4 CMDs */
  rebootNow: function(data) {
    try {
      var cmdName = $.trim(data.args.name);

      FWI_App.log('Player command - ' + data.funct + ' - ' + cmdName);

      if (cmdName === 'PlayerCommandReboot') {
        FWI_App.log('Player command - Reboot Device');
        FWI_Hardware.publishOfflineNotificationReason(
          offlineCodes.USER_COMMAND_RESTART_PLAYER
        );
        HOST_DEVICE.rebootDevice();
      }
    } catch (e) {
      FWI_App.log(JSON.stringify(e), 'DEBUG');
      FWI_App.log('Player command - Error with Reboot');
    }
  },

  restartApp: function(data) {
    try {
      var cmdName = $.trim(data.args.name);

      FWI_App.log('Player command - ' + data.funct + ' - ' + cmdName);

      if (cmdName === 'RestartPlayer') {
        FWI_App.log('Player command - RestartPlayer');
        FWI_Hardware.publishOfflineNotificationReason(
          offlineCodes.USER_COMMAND_RESTART_PLAYER
        );
        HOST_DEVICE.reloadPlayer();
      }
    } catch (e) {
      FWI_App.log(JSON.stringify(e), 'DEBUG');
      FWI_App.log('Player command - Error with RestartPlayer');
    }
  },

  changeOrientation: function(data) {
    try {
      var cmdName = $.trim(data.args.name);
      var cmdValue = data.args.attributes.value.Orientation;

      FWI_App.log('Player command - ' + data.funct + ' - ' + cmdName);

      var success = false;
      if (cmdName === 'AutoCalibrateDisplay') {
        // FIXME: Can these be === instead of ==?
        if (cmdValue == '0') {
          success = true;
        } else if (cmdValue == '90') {
          success = true;
        } else if (cmdValue == '180') {
          success = true;
        } else if (cmdValue == '270') {
          success = true;
        }
      }

      if (success) {
        FWI_Hardware.changeDeviceOrientation(cmdValue);
        FWI_App.log(
          'Player command - Orientation Success | ' +
            FWI_Hardware.deviceOrientation
        );
      } else {
        FWI_App.log('Player command - Error with Orientation Val: ' + cmdValue);
      }
    } catch (e) {
      FWI_App.log(JSON.stringify(e), 'DEBUG');
      FWI_App.log('Player command - Error with Orientation');
    }
  },

  setDisplayOrientation: function(data) {
    var commandName =
      data && data.args && data.args.name
        ? $.trim(data.args.name.toString())
        : '';

    try {
      var angleText = data.args.attributes.value.RotationAngle;
      var angle = parseFloat(angleText);

      if (isNaN(angle)) {
        FWI_App.log(
          'Missing or invalid "RotationAngle" value provided: "' +
            angleText +
            '".',
          'ERROR'
        );
        return;
      }

      // Round to nearest 90 degree angle.
      var roundedAngle = (Math.round(angle / 90) * 90) % 360;
      var orientation; // Can be either "DEGREE_0", "DEGREE_90", "DEGREE_180", or "DEGREE_270".

      switch (roundedAngle) {
        case 90:
          orientation = 'DEGREE_90';
          break;
        case 180:
          orientation = 'DEGREE_180';
          break;
        case 270:
          orientation = 'DEGREE_270';
          break;
        default:
          orientation = 'DEGREE_0';
          break;
      }

      HOST_DEVICE.setOrientation(
        orientation,
        function() {
          // NOTE: Placeholder because it'd take to long to clean up the removal of this
        },
        function(err) {
          FWI_App.log(
            'Error while processing command "' +
              commandName +
              '". Error: ' +
              err,
            'WARN'
          );
        }
      );
    } catch (err) {
      FWI_App.log(
        'Error while processing command "' + commandName + '". Error: ' + err,
        'WARN'
      );
    }
  },

  fwiServices: function(data) {
    try {
      var cmdName = $.trim(data.args.name);
      var cmdValue = data.args.attributes.value;

      var cmdValueHost = cmdValue.hasOwnProperty('Host');
      var cmdValueComp = cmdValue.hasOwnProperty('Company');
      var cmdValueUser = cmdValue.hasOwnProperty('Username');
      var cmdValuePass = cmdValue.hasOwnProperty('Password');

      if (cmdName === 'SendInstallerParameters') {
        if (cmdValueHost && cmdValueComp && cmdValueUser && cmdValuePass) {
          FWI_Advanced.validateCreds(
            cmdValue.Host,
            cmdValue.Company,
            cmdValue.Username,
            cmdValue.Password,
            function() {
              FWI_Advanced.soapSuccess(
                cmdValue.Host,
                cmdValue.Company,
                cmdValue.Username,
                cmdValue.Password
              );
            },
            function(msg) {
              FWI_Advanced.soapError(msg);
            }
          );
          FWI_App.log(
            'Player command - Attempting Conenection with fwiServices'
          );
        } else {
          FWI_App.log(
            'Player command - Error with fwiServices | missing param'
          );
        }
      }
    } catch (e) {
      FWI_App.log(JSON.stringify(e), 'DEBUG');
      FWI_App.log('Player command - Error with fwiServices');
    }
  },

  toggleSoftwareEnable: function(data) {
    if (FWI_Software.softwareUrl) {
      try {
        var cmdName = $.trim(data.args.name);

        FWI_App.log('Player command - ' + data.funct + ' - ' + cmdName);

        if (cmdName === 'PlayerCommandEnableCheckForUpdate') {
          $(
            '.setting_software_url .time_picker input.time_digit:first'
          ).trigger('change');
          FWI_Software.checkForUpdatesEnabled();
          FWI_App.log('Player command - checkForUpdatesEnabled Success');
        } else if (cmdName === 'PlayerCommandDisableCheckForUpdate') {
          FWI_Software.checkForUpdatesDisabled();
          FWI_App.log('Player command - checkForUpdatesDisabled Success');
        }
      } catch (e) {
        FWI_App.log(JSON.stringify(e), 'DEBUG');
        FWI_App.log('Player command - Error with toggleSoftwareUpdates');
      }
    } else {
      FWI_App.log(
        'Player command - Error with toggleSoftwareUpdates, Software url not set'
      );
    }
  },
  // Remote command
  checkSoftwareNow: function(data) {
    if (FWI_Software.softwareUrl) {
      try {
        var cmdName = $.trim(data.args.name);

        FWI_App.log('Player command - ' + data.funct + ' - ' + cmdName);

        if (cmdName == 'PlayerCommandCheckForUpdate') {
          FWI_App.log('Player command - PlayerCommandCheckForUpdate Success');
          HOST_DEVICE.checkSoftwareNow();
        }
      } catch (e) {
        FWI_App.log(
          'Player command - Error with PlayerCommandCheckForUpdate: ' +
            JSON.stringify(e)
        );
      }
    } else {
      FWI_App.log('Player command - Software Update URL Not Set');
    }
  },

  turnOnDisplay: function() {
    try {
      HOST_DEVICE.turnDisplayOnOff('ON');
      FWI_Hardware.display_on = true;
      FWI_App.log('Player command - turnOnDisplay Success');
    } catch (e) {
      FWI_App.log(JSON.stringify(e), 'DEBUG');
      FWI_App.log('Player command - turnOnDisplay Error');
    }
  },

  turnOffDisplay: function() {
    try {
      HOST_DEVICE.turnDisplayOnOff('OFF');
      FWI_Hardware.display_on = false;
      FWI_App.log('Player command - turnOffDisplay Success');
    } catch (e) {
      FWI_App.log(JSON.stringify(e), 'DEBUG');
      FWI_App.log('Player command - turnOffDisplay Error');
    }
  },
  //set the display volume remotely in CM / CMW
  setVolume: function(data) {
    try {
      var volumeLevel = parseInt(
        $.trim(data.args.attributes.value.VolumeLevel)
      );

      if (volumeLevel != null && !isNaN(volumeLevel)) {
        HOST_DEVICE.setVolume(volumeLevel);
        FWI_App.log('Player command - ' + data.funct + ' - ' + volumeLevel);
      } else {
        FWI_App.log('Player command - Error with Set Volume');
      }
    } catch (e) {
      FWI_App.log(JSON.stringify(e), 'DEBUG');
      FWI_App.log('Player command - Error with Set Volume');
    }
  },
  //enable and set the pin for the configuration access code remotely from CM / CMW
  setAccessCode: function(data) {
    try {
      var accessCode = $.trim(data.args.attributes.value.AccessCode);

      if (
        accessCode !== '' &&
        (accessCode + '').match(/^\d+$/) &&
        accessCode.toString().length <= 7
      ) {
        /* Valid, Add Code */
        FWI_App.log('Player command - Access Code Validates - ' + accessCode);
        FWI_Software.setAccessCode(accessCode);
      } else if (accessCode === '') {
        /* Remove */
        FWI_App.log('Player command - Access Code Validates (Removed)');
        FWI_Software.clearAccessCode();
      } else {
        FWI_App.log('Player command - Access Code Error');
      }
    } catch (e) {
      FWI_App.log(JSON.stringify(e), 'DEBUG');
      FWI_App.log('Player command - Access Code Error');
    }
  },
  //configure log capture remotely from CM / CMW
  uploadLogs: function(data) {
    if (FWI_Advanced.advEnabled) {
      try {
        var cmdValue = data.args.attributes.value;
        var cmdValueEnabled = cmdValue.hasOwnProperty('Enabled');
        var cmdValueUploadTime = cmdValue.hasOwnProperty('UploadTime');

        if (!cmdValueEnabled && !cmdValueUploadTime) {
          FWI_Monitoring.uploadLogsStart();
          FWI_App.log('Player command - Logs Uploading');
        } else {
          if (cmdValueEnabled) {
            if (cmdValue.Enabled.toLowerCase() == 'true') {
              FWI_Monitoring.enableLogs();
              FWI_App.log('Player command - Logs enableLogs');
            } else if (cmdValue.Enabled.toLowerCase() == 'false') {
              FWI_Monitoring.disableLogs();
              FWI_App.log('Player command - Logs disableLogs');
            } else {
              FWI_App.log('Player command - Logs Enable/Disable Error');
            }
          }

          if (cmdValueUploadTime) {
            if (
              cmdValue.UploadTime.length == 5 ||
              cmdValue.UploadTime.length == 8
            ) {
              var h1 = cmdValue.UploadTime.charAt(0);
              var h2 = cmdValue.UploadTime.charAt(1);
              var m1 = cmdValue.UploadTime.charAt(3);
              var m2 = cmdValue.UploadTime.charAt(4);
              var s1 = 0;
              var s2 = 0;

              if (cmdValue.UploadTime.length == 8) {
                s1 = cmdValue.UploadTime.charAt(6);
                s2 = cmdValue.UploadTime.charAt(7);
              }

              var format_time = h1 + h2 + ':' + m1 + m2 + ':' + s1 + s2;
              if (FWI_Validate.validateTime6Int(h1, h2, m1, m2, s1, s2)) {
                // Since the shim now uses a log upload window (issue JI#CORE-2462),
                // we convert the given time stamp to a window by padding it with
                // 5 minutes on each side.
                var secondsAfterMidnight = FWI_Helper.hourMinSecToSeconds(
                  format_time
                );
                var logUploadWindowStartSeconds = secondsAfterMidnight - 5 * 60; // 5 minutes before.

                if (logUploadWindowStartSeconds < 0) {
                  logUploadWindowStartSeconds += 24 * 60 * 60; // Add 24 hours to get a positive number.
                }

                var logUploadWindowsStartText = FWI_Helper.secondsAfterMidnightToTime12(
                  logUploadWindowStartSeconds
                );

                FWI_Monitoring.setLogsTime('begin', logUploadWindowsStartText);

                var logUploadWindowEndSeconds = secondsAfterMidnight + 5 * 60; // 5 minutes after.

                if (logUploadWindowEndSeconds >= 24 * 60 * 60) {
                  logUploadWindowEndSeconds -= 24 * 60 * 60; // Subtract 24 hours to get a number less than 24 hours.
                }

                var logUploadWindowsEndText = FWI_Helper.secondsAfterMidnightToTime12(
                  logUploadWindowEndSeconds
                );

                FWI_Monitoring.setLogsTime('end', logUploadWindowsEndText);
                FWI_App.log(
                  'Successfully processed "UploadLogs" command. Time to upload: ' +
                    format_time,
                  'INFO'
                );
                FWI_Monitoring.resetTimers(); // Update the timers on the UI.
              } else {
                FWI_App.log(
                  'Error while processing "UploadLogs" command. Invalid time stamp: ' +
                    cmdValueUploadTime,
                  'ERROR'
                );
              }
            } else {
              FWI_App.log(
                'Error while processing "UploadLogs" command. Invalid time stamp: ' +
                  cmdValueUploadTime,
                'ERROR'
              );
            }
          }
        }
      } catch (e) {
        FWI_App.log(
          'Error while processing "UploadLogs" command: ' + e,
          'ERROR'
        );
      }
    } else {
      FWI_App.log(
        'Error while processing "UploadLogs" command. FWI Services not enabled.',
        'ERROR'
      );
    }
  },

  /* CMW 5.6 First round updates  */
  // Summary: Configure FWI Services.
  configureServicesProperties: function(data) {
    try {
      var cmdValue = data.args.attributes.value;
      var cmdValueUrl = cmdValue.hasOwnProperty('Url');
      var cmdValueUser = cmdValue.hasOwnProperty('UserName');
      var cmdValueComp = cmdValue.hasOwnProperty('Company');
      var cmdValuePass = cmdValue.hasOwnProperty('Password');

      if (cmdValueUrl && cmdValueComp && cmdValueUser && cmdValuePass) {
        FWI_Advanced.validateCreds(
          cmdValue.Url,
          cmdValue.Company,
          cmdValue.UserName,
          cmdValue.Password,
          function() {
            FWI_Advanced.soapSuccess(
              cmdValue.Url,
              cmdValue.Company,
              cmdValue.UserName,
              cmdValue.Password
            );
          },
          function(msg) {
            FWI_Advanced.soapError(msg);
          }
        );
        FWI_App.log('Player command - Attempting Connection with fwiServices');
      } else {
        FWI_App.log('Player command - Error with fwiServices | missing param');
      }
    } catch (e) {
      FWI_App.log(JSON.stringify(e), 'DEBUG');
      FWI_App.log('Player command - Error with fwiServices');
    }
  },
  // Change current device player/sign.
  configureDeployment: function(data) {
    try {
      var cmdValue = data.args.attributes.value;
      var cmdValueUrl = cmdValue.hasOwnProperty('Url');
      var cmdValueUser = cmdValue.hasOwnProperty('UserName');
      var cmdValuePass = cmdValue.hasOwnProperty('Password');

      if (cmdValueUrl) {
        var url = cmdValue.Url;

        if (cmdValueUser && cmdValuePass) {
          var userName = cmdValue.UserName;
          var userPass = cmdValue.Password;

          if (userName && userPass) {
            FWI_Deploy.rmtCmdAuthUser = userName;
            FWI_Deploy.rmtCmdAuthPass = userPass;
          }
        } else {
          FWI_Deploy.rmtCmdAuthUser = '';
          FWI_Deploy.rmtCmdAuthPass = '';
        }

        if (url && FWI_Deploy.validateURL(url)) {
          FWI_App.log('Player command - configureDeployment Attempting');
          FWI_Deploy.testURL = url;
          var onSuccess = function(isLinkPublic) {
            FWI_Deploy.applySignin(isLinkPublic, function() {
              // If the shim is not showing, then resume play with the updated settings.
              if (FWI_Deploy.setIframeURL && $('.wrap_player').is(':visible')) {
                FWI_Deploy.setIframeURL();
              }
            });
          };
          FWI_Deploy.connectToWebPlayer(url, onSuccess);
        } else {
          FWI_App.log('Player command - configureDeployment Not Valid');
        }
      }
    } catch (e) {
      FWI_App.log(JSON.stringify(e), 'DEBUG');
      FWI_App.log('Player command - Error with configureDeployment');
    }
  },

  /* EVEN NEWER CMW 5.6 */
  removeAccessCode: function() {
    FWI_App.log('Player command - Access Code Validates (Removed)');
    FWI_Software.clearAccessCode();
  },

  enableDisplayTimers: function() {
    FWI_Hardware.onOffTimersEnable();
    FWI_App.log('Player command - enableOnOffTimers Enable Success');
  },

  disableDisplayTimers: function() {
    FWI_Hardware.onOffTimersDisable();
    FWI_App.log('Player command - disableOnOffTimers Disable Success');
  },

  addDisplayTimer: function(data) {
    /* 	"Days", "Comma-delimited list of two-letter day abbreviations; no spaces." 
		"TimeOn", "HH:MM:SS" 
		"TimeOff", "HH:MM:SS"  */
    try {
      var cmdValue = data.args.attributes.value;
      var cmdValueTimeOn = cmdValue.hasOwnProperty('TimeOn');
      var cmdValueTimeOff = cmdValue.hasOwnProperty('TimeOff');
      var cmdValueDays = cmdValue.hasOwnProperty('Days');

      if (
        cmdValueTimeOn &&
        cmdValueTimeOff &&
        cmdValueDays &&
        cmdValue.Days !== ''
      ) {
        var days = FWI_Helper.processTimerDays(cmdValue.Days);

        if (
          (cmdValue.TimeOn.length === 5 || cmdValue.TimeOn.length === 8) &&
          (cmdValue.TimeOff.length === 5 || cmdValue.TimeOff.length === 8) &&
          days &&
          days !== 0
        ) {
          var time12On = FWI_Helper.time24to12(cmdValue.TimeOn);
          var h1On = time12On.charAt(0);
          var h2On = time12On.charAt(1);
          var m1On = time12On.charAt(3);
          var m2On = time12On.charAt(4);
          var ampmOn;

          if (time12On.indexOf('PM') !== -1) {
            ampmOn = ' PM';
          } else if (time12On.indexOf('AM') !== -1) {
            ampmOn = ' AM';
          }

          var time12Off = FWI_Helper.time24to12(cmdValue.TimeOff);
          var h1Off = time12Off.charAt(0);
          var h2Off = time12Off.charAt(1);
          var m1Off = time12Off.charAt(3);
          var m2Off = time12Off.charAt(4);
          var ampmOff;

          if (time12Off.indexOf('PM') !== -1) {
            ampmOff = ' PM';
          } else if (time12Off.indexOf('AM') !== -1) {
            ampmOff = ' AM';
          }

          if (ampmOn !== '' && ampmOff !== '') {
            var format_timeOn = h1On + h2On + ':' + m1On + m2On + ampmOn;
            var format_timeOff = h1Off + h2Off + ':' + m1Off + m2Off + ampmOff;

            if (
              FWI_Validate.validateTime4(h1On, h2On, m1On, m2On) &&
              FWI_Validate.validateTime4(h1Off, h2Off, m1Off, m2Off)
            ) {
              var dupeCheck = FWI_Hardware.validateDupeCheck(
                format_timeOn,
                format_timeOff,
                days
              );

              if (dupeCheck !== false) {
                FWI_Hardware.createTimerSet(
                  format_timeOn,
                  format_timeOff,
                  days
                );
                FWI_Shadow.updateShadow();
                FWI_App.log('Player command - New onOffTimer Sets - validate');
              } else {
                FWI_App.log('Player command - Duplicate Timer Error');
              }
            } else {
              FWI_App.log(
                'Player command - addDisplayTimer Format Error ' +
                  format_timeOn +
                  ' - ' +
                  format_timeOff
              );
            }
          }
        } else {
          FWI_App.log('Player command - addDisplayTimer Add-Timer Param Error');
        }
      }
    } catch (e) {
      FWI_App.log(JSON.stringify(e), 'DEBUG');
      FWI_App.log('Player command - addDisplayTimer Error');
    }
  },

  deleteDisplayTimer: function(data) {
    /* 	"Days", "Comma-delimited list of two-letter day abbreviations; no spaces." 
		"TimeOn", "HH:MM:SS" 
		"TimeOff", "HH:MM:SS"  */
    try {
      var cmdValue = data.args.attributes.value;
      var cmdValueTimeOn = cmdValue.hasOwnProperty('TimeOn');
      var cmdValueTimeOff = cmdValue.hasOwnProperty('TimeOff');
      var cmdValueDays = cmdValue.hasOwnProperty('Days');

      if (
        cmdValueTimeOn &&
        cmdValueTimeOff &&
        cmdValueDays &&
        cmdValue.Days != ''
      ) {
        var days = FWI_Helper.processTimerDays(cmdValue.Days);
        if (
          (cmdValue.TimeOn.length === 5 || cmdValue.TimeOn.length === 8) &&
          (cmdValue.TimeOff.length === 5 || cmdValue.TimeOff.length === 8) &&
          days &&
          days !== 0
        ) {
          var time12On = FWI_Helper.time24to12(cmdValue.TimeOn);
          var h1On = time12On.charAt(0);
          var h2On = time12On.charAt(1);
          var m1On = time12On.charAt(3);
          var m2On = time12On.charAt(4);
          var ampmOn;

          if (time12On.indexOf('PM') !== -1) {
            ampmOn = ' PM';
          } else if (time12On.indexOf('AM') !== -1) {
            ampmOn = ' AM';
          }

          var time12Off = FWI_Helper.time24to12(cmdValue.TimeOff);
          var h1Off = time12Off.charAt(0);
          var h2Off = time12Off.charAt(1);
          var m1Off = time12Off.charAt(3);
          var m2Off = time12Off.charAt(4);
          var ampmOff;

          if (time12Off.indexOf('PM') !== -1) {
            ampmOff = ' PM';
          } else if (time12Off.indexOf('AM') !== -1) {
            ampmOff = ' AM';
          }

          if (ampmOn !== '' && ampmOff !== '') {
            var format_timeOn = h1On + h2On + ':' + m1On + m2On + ampmOn;
            var format_timeOff = h1Off + h2Off + ':' + m1Off + m2Off + ampmOff;

            if (
              FWI_Validate.validateTime4(h1On, h2On, m1On, m2On) &&
              FWI_Validate.validateTime4(h1Off, h2Off, m1Off, m2Off)
            ) {
              var validateRemoveTimer = FWI_Hardware.validateRemoveTimer(
                format_timeOn,
                format_timeOff,
                days
              );

              if (validateRemoveTimer == true) {
                FWI_App.log('Player command - onOff Timer found, removing');
                FWI_Hardware.deleteTimerSetRmtCmd(
                  format_timeOn,
                  format_timeOff,
                  days
                );
              } else {
                FWI_App.log('Player command - onOff Timer Not found Error');
              }
            } else {
              FWI_App.log(
                'Player command - Status Time Format Error ' + format_timeOn
              );
            }
          }
        } else {
          FWI_App.log(
            'Player command - deleteDisplayTimer Del-Timer Param Error'
          );
        }
      } else {
        FWI_App.log('Player command - deleteDisplayTimer Del-Timer Error');
      }
    } catch (e) {
      FWI_App.log(JSON.stringify(e), 'DEBUG');
      FWI_App.log('Player command - deleteDisplayTimer Error');
    }
  },

  deleteAllDisplayTimers: function() {
    FWI_Hardware.deleteAllTimers();
    FWI_App.log('Player command - Deleting all onOff Timers');
  },

  enableStatusUpload: function(data) {
    /* "UploadTime", "HH:MM:SS"  */
    if (FWI_Advanced.advEnabled) {
      FWI_Monitoring.enableStatus();
      FWI_App.log('Player command - Status Upload Enable Success');

      try {
        var cmdValue = data.args.attributes.value;
        var cmdValueUploadTime = cmdValue.hasOwnProperty('UploadTime');

        if (cmdValueUploadTime) {
          if (
            cmdValue.UploadTime.length === 5 ||
            cmdValue.UploadTime.length === 8
          ) {
            var h1 = cmdValue.UploadTime.charAt(0);
            var h2 = cmdValue.UploadTime.charAt(1);
            var m1 = cmdValue.UploadTime.charAt(3);
            var m2 = cmdValue.UploadTime.charAt(4);
            var s1 = 0;
            var s2 = 0;

            if (cmdValue.UploadTime.length === 8) {
              s1 = cmdValue.UploadTime.charAt(6);
              s2 = cmdValue.UploadTime.charAt(7);
            }

            var format_time = h1 + h2 + ':' + m1 + m2 + ':' + s1 + s2;

            if (FWI_Validate.validateTime6Int(h1, h2, m1, m2, s1, s2)) {
              FWI_Monitoring.setStatusTimeUpdNum(format_time);
              FWI_App.log(
                'Player command - setStatusTime Success ' + format_time
              );
            } else {
              FWI_App.log(
                'Player command - Status Time Format Error ' + format_time
              );
            }
          } else {
            FWI_App.log('Player command - Status Time Format Error');
          }
        }
      } catch (e) {
        FWI_App.log(JSON.stringify(e), 'DEBUG');
        FWI_App.log('Player command - Status Error');
      }
    } else {
      FWI_App.log('Player command - FWI Services Not enabled');
    }
  },

  disableStatusUpload: function() {
    if (FWI_Advanced.advEnabled) {
      FWI_Monitoring.disableStatus();
      FWI_App.log('Player command - Status Upload Disable Success');
    } else {
      FWI_App.log('Player command - FWI Services Not enabled');
    }
  },

  uploadStatus: function() {
    if (FWI_Advanced.advEnabled) {
      FWI_Monitoring.uploadStatus();
      FWI_App.log('Player command - Status Uploading');
    } else {
      FWI_App.log('Player command - FWI Services Not enabled');
    }
  },

  setStatusUploadTime: function(data) {
    /* "UploadTime", "HH:MM:SS" */
    if (FWI_Advanced.advEnabled) {
      try {
        var cmdValue = data.args.attributes.value;
        var cmdValueUploadTime = cmdValue.hasOwnProperty('UploadTime');

        if (cmdValueUploadTime) {
          if (
            cmdValue.UploadTime.length === 5 ||
            cmdValue.UploadTime.length === 8
          ) {
            //var time12 = FWI_Helper.time24to12(cmdValue.UploadTime);

            var h1 = cmdValue.UploadTime.charAt(0);
            var h2 = cmdValue.UploadTime.charAt(1);
            var m1 = cmdValue.UploadTime.charAt(3);
            var m2 = cmdValue.UploadTime.charAt(4);
            var s1 = 0;
            var s2 = 0;

            if (cmdValue.UploadTime.length === 8) {
              s1 = cmdValue.UploadTime.charAt(6);
              s2 = cmdValue.UploadTime.charAt(7);
            }

            var format_time = h1 + h2 + ':' + m1 + m2 + ':' + s1 + s2;

            if (FWI_Validate.validateTime6Int(h1, h2, m1, m2, s1, s2)) {
              FWI_Monitoring.setStatusTimeUpdNum(format_time);
              FWI_App.log(
                'Player command - setStatusTime Success ' + format_time
              );
            } else {
              FWI_App.log(
                'Player command - Status Time Format Error ' + format_time
              );
            }
          } else {
            FWI_App.log('Player command - Status Time Format Error');
          }
        }
      } catch (e) {
        FWI_App.log(JSON.stringify(e), 'DEBUG');
        FWI_App.log('Player command - Status Error');
      }
    } else {
      FWI_App.log('Player command - FWI Services Not enabled');
    }
  },

  enableScreenshotUpload: function(data) {
    /* "UploadTime", "HH:MM:SS" (optional)  */
    if (FWI_Advanced.advEnabled) {
      FWI_Monitoring.enableScreenshot();
      FWI_App.log('Player command - enableScreenshot Success');

      try {
        var cmdValue = data.args.attributes.value;
        var cmdValueUploadTime = cmdValue.hasOwnProperty('UploadTime');

        if (cmdValueUploadTime) {
          if (
            cmdValue.UploadTime.length === 5 ||
            cmdValue.UploadTime.length === 8
          ) {
            var h1 = cmdValue.UploadTime.charAt(0);
            var h2 = cmdValue.UploadTime.charAt(1);
            var m1 = cmdValue.UploadTime.charAt(3);
            var m2 = cmdValue.UploadTime.charAt(4);
            var s1 = 0;
            var s2 = 0;

            if (cmdValue.UploadTime.length == 8) {
              s1 = cmdValue.UploadTime.charAt(6);
              s2 = cmdValue.UploadTime.charAt(7);
            }

            var format_time = h1 + h2 + ':' + m1 + m2 + ':' + s1 + s2;

            if (FWI_Validate.validateTime6Int(h1, h2, m1, m2, s1, s2)) {
              FWI_Monitoring.setScreenshotTimeUpdNum(format_time);
              FWI_App.log(
                'Player command - setScreenshotTime Success ' + format_time
              );
            } else {
              FWI_App.log(
                'Player command - Screenshot Time Format Error ' + format_time
              );
            }
          } else {
            FWI_App.log('Player command - Screenshot Time Format Error');
          }
        }
      } catch (e) {
        FWI_App.log(JSON.stringify(e), 'DEBUG');
        FWI_App.log('Player command - Screenshot Error');
      }
    } else {
      FWI_App.log('Player command - FWI Services Not enabled');
    }
  },

  disableScreenshotUpload: function() {
    if (FWI_Advanced.advEnabled) {
      FWI_Monitoring.disableScreenshot();
      FWI_App.log('Player command - disableScreenshot Success');
    } else {
      FWI_App.log('Player command - FWI Services Not enabled');
    }
  },

  uploadScreenshot: function() {
    FWI_Monitoring.captureScreen();
  },

  setScreenshotUploadTime: function(data) {
    /* "UploadTime", "HH:MM:SS" (optional)  */
    if (FWI_Advanced.advEnabled) {
      try {
        var cmdValue = data.args.attributes.value;
        var cmdValueUploadTime = cmdValue.hasOwnProperty('UploadTime');

        if (cmdValueUploadTime) {
          if (
            cmdValue.UploadTime.length === 5 ||
            cmdValue.UploadTime.length === 8
          ) {
            //var time12 = FWI_Helper.time24to12(cmdValue.UploadTime);

            var h1 = cmdValue.UploadTime.charAt(0);
            var h2 = cmdValue.UploadTime.charAt(1);
            var m1 = cmdValue.UploadTime.charAt(3);
            var m2 = cmdValue.UploadTime.charAt(4);
            var s1 = 0;
            var s2 = 0;

            if (cmdValue.UploadTime.length == 8) {
              s1 = cmdValue.UploadTime.charAt(6);
              s2 = cmdValue.UploadTime.charAt(7);
            }

            var format_time = h1 + h2 + ':' + m1 + m2 + ':' + s1 + s2;

            if (FWI_Validate.validateTime6Int(h1, h2, m1, m2, s1, s2)) {
              FWI_Monitoring.setScreenshotTimeUpdNum(format_time);
              FWI_App.log(
                'Player command - setScreenshotTime Success ' + format_time
              );
            } else {
              FWI_App.log(
                'Player command - Screenshot Time Format Error ' + format_time
              );
            }
          } else {
            FWI_App.log('Player command - Screenshot Time Format Error');
          }
        }
      } catch (e) {
        FWI_App.log(JSON.stringify(e), 'DEBUG');
        FWI_App.log('Player command - Screenshot Error');
      }
    } else {
      FWI_App.log('Player command - FWI Services Not enabled');
    }
  },

  enableLogsUpload: function(data) {
    /* "UploadTime", "HH:MM:SS" (optional)  */
    var cmdName =
      data && data.args && data.args.name
        ? $.trim(data.args.name)
        : '<Unknown>';

    if (FWI_Advanced.advEnabled) {
      FWI_Monitoring.enableLogs();

      try {
        var cmdValue = data.args.attributes.value;
        var cmdValueUploadTime = cmdValue.hasOwnProperty('UploadTime');

        if (cmdValueUploadTime) {
          if (
            cmdValue.UploadTime.length === 5 ||
            cmdValue.UploadTime.length === 8
          ) {
            var h1 = cmdValue.UploadTime.charAt(0);
            var h2 = cmdValue.UploadTime.charAt(1);
            var m1 = cmdValue.UploadTime.charAt(3);
            var m2 = cmdValue.UploadTime.charAt(4);
            var s1 = 0;
            var s2 = 0;

            if (cmdValue.UploadTime.length === 8) {
              s1 = cmdValue.UploadTime.charAt(6);
              s2 = cmdValue.UploadTime.charAt(7);
            }

            var format_time = h1 + h2 + ':' + m1 + m2 + ':' + s1 + s2;

            if (FWI_Validate.validateTime6Int(h1, h2, m1, m2, s1, s2)) {
              // Since the shim now uses a log upload window (issue JI#CORE-2462),
              // we convert the given time stamp to a window by padding it with
              // 5 minutes on each side.
              var secondsAfterMidnight = FWI_Helper.hourMinSecToSeconds(
                format_time
              );
              var logUploadWindowStartSeconds = secondsAfterMidnight - 5 * 60; // 5 minutes before.

              if (logUploadWindowStartSeconds < 0) {
                logUploadWindowStartSeconds += 24 * 60 * 60; // Add 24 hours to get a positive number.
              }

              var logUploadWindowsStartText = FWI_Helper.secondsAfterMidnightToTime12(
                logUploadWindowStartSeconds
              );

              FWI_Monitoring.setLogsTime('begin', logUploadWindowsStartText);

              var logUploadWindowEndSeconds = secondsAfterMidnight + 5 * 60; // 5 minutes after.

              if (logUploadWindowEndSeconds >= 24 * 60 * 60) {
                logUploadWindowEndSeconds -= 24 * 60 * 60; // Subtract 24 hours to get a number less than 24 hours.
              }

              var logUploadWindowsEndText = FWI_Helper.secondsAfterMidnightToTime12(
                logUploadWindowEndSeconds
              );

              FWI_Monitoring.setLogsTime('end', logUploadWindowsEndText);
              FWI_App.log(
                'Succesfully processed "' +
                  cmdName +
                  '" command. Time to upload: ' +
                  format_time,
                'INFO'
              );
              FWI_Monitoring.resetTimers(); // Update the timers on the UI.
            } else {
              FWI_App.log(
                'Error while processing "' +
                  cmdName +
                  '" command. Invalid time stamp: ' +
                  cmdValueUploadTime,
                'ERROR'
              );
            }
          } else {
            FWI_App.log('Player command - Log Time Format Error');
          }
        }
      } catch (e) {
        FWI_App.log(
          'Error while processing "' + cmdName + '" command. Error: ' + e,
          'ERROR'
        );
      }
    } else {
      FWI_App.log(
        'Error while processing "' +
          cmdName +
          '" command. Services not enabled.',
        'ERROR'
      );
    }
  },

  disableLogsUpload: function() {
    if (FWI_Advanced.advEnabled) {
      FWI_Monitoring.disableLogs();
      FWI_App.log('Player command - Logs disableLogs');
    } else {
      FWI_App.log('Player command - FWI Services Not enabled');
    }
  },

  setLogsUploadTime: function(data) {
    /* "UploadTime", "HH:MM:SS" (optional)  */
    var cmdName =
      data && data.args && data.args.name
        ? $.trim(data.args.name)
        : '<Unknown>';

    if (FWI_Advanced.advEnabled) {
      try {
        var cmdValue = data.args.attributes.value;
        var cmdValueUploadTime = cmdValue.hasOwnProperty('UploadTime');

        if (cmdValueUploadTime) {
          if (
            cmdValue.UploadTime.length === 5 ||
            cmdValue.UploadTime.length === 8
          ) {
            var h1 = cmdValue.UploadTime.charAt(0);
            var h2 = cmdValue.UploadTime.charAt(1);
            var m1 = cmdValue.UploadTime.charAt(3);
            var m2 = cmdValue.UploadTime.charAt(4);
            var s1 = 0;
            var s2 = 0;

            if (cmdValue.UploadTime.length === 8) {
              s1 = cmdValue.UploadTime.charAt(6);
              s2 = cmdValue.UploadTime.charAt(7);
            }

            var format_time = h1 + h2 + ':' + m1 + m2 + ':' + s1 + s2;
            if (FWI_Validate.validateTime6Int(h1, h2, m1, m2, s1, s2)) {
              // NOTE: FYI, Hastily copied from BS for release, sorry
              // Since the shim now uses a log upload window (issue JI#CORE-2462),
              // we convert the given time stamp to a window by padding it with
              // 5 minutes on each side.
              var secondsAfterMidnight = FWI_Helper.hourMinSecToSeconds(
                format_time
              );
              var logUploadWindowStartSeconds = secondsAfterMidnight - 5 * 60; // 5 minutes before.

              if (logUploadWindowStartSeconds < 0) {
                logUploadWindowStartSeconds += 24 * 60 * 60; // Add 24 hours to get a positive number.
              }

              var logUploadWindowsStartText = FWI_Helper.secondsAfterMidnightToTime12(
                logUploadWindowStartSeconds
              );
              FWI_Monitoring.setLogsTime('begin', logUploadWindowsStartText);
              var logUploadWindowEndSeconds = secondsAfterMidnight + 5 * 60; // 5 minutes after.

              if (logUploadWindowEndSeconds >= 24 * 60 * 60) {
                logUploadWindowEndSeconds -= 24 * 60 * 60; // Subtract 24 hours to get a number less than 24 hours.
              }

              var logUploadWindowsEndText = FWI_Helper.secondsAfterMidnightToTime12(
                logUploadWindowEndSeconds
              );
              FWI_Monitoring.setLogsTime('end', logUploadWindowsEndText);
              FWI_App.log(
                'Succesfully processed "' +
                  cmdName +
                  '" command. Time to upload: ' +
                  format_time,
                'INFO'
              );
              FWI_Monitoring.resetTimers(); // Update the timers on the UI.
            } else {
              FWI_App.log(
                'Error while processing "' +
                  cmdName +
                  '" command. Invalid time stamp: ' +
                  cmdValueUploadTime,
                'ERROR'
              );
            }
          } else {
            FWI_App.log(
              'Error while processing "' +
                cmdName +
                '" command. Invalid time stamp: ' +
                cmdValueUploadTime,
              'ERROR'
            );
          }
        }
      } catch (e) {
        FWI_App.log(
          'Error while processing "' + cmdName + '" command. Error: ' + e,
          'ERROR'
        );
      }
    } else {
      FWI_App.log(
        'Error while processing "' +
          cmdName +
          '" command. Services not enabled.',
        'ERROR'
      );
    }
  },

  updateSoftwareUrl: function(data) {
    try {
      var cmdValue = data.args.attributes.value;
      var cmdValueUrl = cmdValue.hasOwnProperty('Url');

      if (cmdValueUrl) {
        var url = cmdValue.Url;

        if (FWI_Validate.validateURL(url)) {
          var onSuccess = function() {
            HOST_DEVICE.setSetting('software_url', url);
            HOST_DEVICE.setLauncherURL(url);
            $('input[name="software_updates_url"]').val(url);
            FWI_Software.softwareUrl = url;
            $('button.software_updates_url_verify').prop('disabled', false);
            $('.setting_software_url .require_verify')
              .prop('disabled', false)
              .removeAttr('disabled');
            $('.software_url_message')
              .parent()
              .addClass('success')
              .removeClass('icon_fail')
              .removeClass('need_validation');
            FWI_Shadow.updateShadow();
          };
          var onError = function() {
            $('button.software_updates_url_verify').prop('disabled', false);

            if (!FWI_Software.softwareUrl) {
              $('.setting_software_url .require_verify')
                .attr('disabled', '')
                .prop('disabled', true);
              FWI_Software.checkForUpdatesDisabled();
            }

            $('.software_url_message')
              .parent()
              .removeClass('success')
              .removeClass('need_validation')
              .addClass('icon_fail');
          };

          $('button.software_updates_url_verify').prop('disabled', true);
          HOST_DEVICE.validateSoftwareUpdate(url, onSuccess, onError);
        } else {
          FWI_App.log(
            'Player command - updateSoftwareUrl Not Valid, canceling manifest check'
          );
        }
      } else {
        FWI_App.log('Player command - updateSoftwareUrl Missing Param');
      }
    } catch (e) {
      FWI_App.log(
        'Player command - Error with updateSoftwareUrl' + JSON.stringify(e)
      );
    }
  },

  updateSoftwareTime: function(data) {
    /* "CheckTime", "HH:MM:SS" */
    if (FWI_Software.softwareUrl) {
      try {
        var cmdValue = data.args.attributes.value;
        var cmdValueCheckTime = cmdValue.hasOwnProperty('CheckTime');

        if (cmdValueCheckTime) {
          if (
            cmdValue.CheckTime.length === 5 ||
            cmdValue.CheckTime.length === 8
          ) {
            var time12 = FWI_Helper.time24to12(cmdValue.CheckTime);
            var h1 = time12.charAt(0);
            var h2 = time12.charAt(1);
            var m1 = time12.charAt(3);
            var m2 = time12.charAt(4);
            var ampm;

            if (time12.indexOf('PM') !== -1) {
              ampm = ' PM';
            } else if (time12.indexOf('AM') !== -1) {
              ampm = ' AM';
            }

            if (ampm !== '') {
              var format_time = h1 + h2 + ':' + m1 + m2 + ampm;

              if (FWI_Validate.validateTime4(h1, h2, m1, m2)) {
                FWI_Software.setUpdateTimeUpdNum(format_time);
                FWI_App.log(
                  'Player command - setSoftwareUpdateCheckTime Success ' +
                    format_time
                );
              } else {
                FWI_App.log(
                  'Player command - setSoftwareUpdateCheckTime Failure ' +
                    format_time
                );
              }
            }
          } else {
            FWI_App.log(
              'Player command - Error with setSoftwareUpdateCheckTime'
            );
          }
        }
      } catch (e) {
        FWI_App.log(JSON.stringify(e), 'DEBUG');
        FWI_App.log('Player command - Error with setSoftwareUpdateCheckTime');
      }
    } else {
      FWI_App.log(
        'Player command - Error with toggleSoftwareUpdates, Software url not set'
      );
    }
  },

  enableDailyReboot: function(data) {
    /* "RebootTime", "HH:MM:SS" (optional)  */
    $('.setting_hardware_reboot .time_picker input.time_digit:first').trigger(
      'change'
    );
    FWI_Hardware.hardwareRebootEnabled();
    FWI_App.log('Player command - PlayerCommandEnableAutoReboot Success');

    try {
      var cmdValue = data.args.attributes.value;
      var cmdValueRebootTime = cmdValue.hasOwnProperty('RebootTime');

      if (cmdValueRebootTime) {
        var RebootTime = cmdValue.RebootTime;

        /* Validate Time */
        if (RebootTime.length === 5 || RebootTime.length === 8) {
          var time12 = FWI_Helper.time24to12(RebootTime);
          var h1 = time12.charAt(0);
          var h2 = time12.charAt(1);
          var m1 = time12.charAt(3);
          var m2 = time12.charAt(4);
          var ampm;

          if (time12.indexOf('PM') !== -1) {
            ampm = ' PM';
          } else if (time12.indexOf('AM') !== -1) {
            ampm = ' AM';
          }

          if (ampm !== '') {
            var format_time = h1 + h2 + ':' + m1 + m2 + ampm;
            if (FWI_Validate.validateTime4(h1, h2, m1, m2)) {
              FWI_Hardware.setRebootTimeUpdNum(format_time);
              FWI_App.log(
                'Player command - PlayerCommandSetAutoRebootTime Success ' +
                  format_time
              );
            } else {
              FWI_App.log(
                'Player command - PlayerCommandSetAutoRebootTime Failure ' +
                  format_time
              );
            }
          }
        } else {
          FWI_App.log(
            'Player command - Error with PlayerCommandSetAutoRebootTime'
          );
        }
      } else {
        FWI_App.log('Player command - RebootTime val Not found');
      }
    } catch (e) {
      FWI_App.log(JSON.stringify(e), 'DEBUG');
      FWI_App.log('Player command - Error with Cfg Reboot');
    }
  },

  disableDailyReboot: function() {
    FWI_Hardware.hardwareRebootDisabled();
    FWI_App.log('Player command - hardwareRebootDisabled Success');
  },

  setDailyRebootTime: function(data) {
    /* "RebootTime", "HH:MM:SS" (optional)  */
    try {
      var cmdValue = data.args.attributes.value;
      var cmdValueRebootTime = cmdValue.hasOwnProperty('RebootTime');

      if (cmdValueRebootTime) {
        var RebootTime = cmdValue.RebootTime;

        /* Validate Time */
        if (RebootTime.length === 5 || RebootTime.length === 8) {
          var time12 = FWI_Helper.time24to12(RebootTime);
          var h1 = time12.charAt(0);
          var h2 = time12.charAt(1);
          var m1 = time12.charAt(3);
          var m2 = time12.charAt(4);
          var ampm;

          if (time12.indexOf('PM') !== -1) {
            ampm = ' PM';
          } else if (time12.indexOf('AM') !== -1) {
            ampm = ' AM';
          }

          if (ampm !== '') {
            var format_time = h1 + h2 + ':' + m1 + m2 + ampm;

            if (FWI_Validate.validateTime4(h1, h2, m1, m2)) {
              FWI_Hardware.setRebootTimeUpdNum(format_time);
              FWI_App.log(
                'Player command - PlayerCommandSetAutoRebootTime Success ' +
                  format_time
              );
            } else {
              FWI_App.log(
                'Player command - PlayerCommandSetAutoRebootTime Failure ' +
                  format_time
              );
            }
          }
        } else {
          FWI_App.log(
            'Player command - Error with PlayerCommandSetAutoRebootTime'
          );
        }
      } else {
        FWI_App.log('Player command - RebootTime val Not found');
      }
    } catch (e) {
      FWI_App.log(JSON.stringify(e), 'DEBUG');
      FWI_App.log('Player command - Error with Cfg Reboot');
    }
  },

  reboot: function() {
    FWI_App.log('Player command - Reboot Device');
    FWI_Hardware.publishOfflineNotificationReason(
      offlineCodes.USER_COMMAND_RESTART_PLAYER
    );
    HOST_DEVICE.rebootDevice();
  },

  enableFirmwareUpdateCheck: function() {
    if (FWI_Hardware.firmwareURL) {
      FWI_Hardware.checkForFirmwareUpdatesEnabled();
      FWI_App.log('Player command - enableFirmwareUpdateCheck Success');
    } else {
      FWI_App.log('Player command - Firmware url not verified');
    }
  },

  disableFirmwareUpdateCheck: function() {
    if (FWI_Hardware.firmwareURL) {
      FWI_Hardware.checkForFirmwareUpdatesDisabled();
      FWI_App.log('Player command - disableFirmwareUpdateCheck Success');
    } else {
      FWI_App.log('Player command - Firmware url not verified');
    }
  },

  updateFirmwareUrl: function(data) {
    try {
      var cmdValue = data.args.attributes.value;
      var cmdHasUrl = cmdValue.hasOwnProperty('Url');

      if (cmdHasUrl) {
        var url = cmdValue.Url;

        if (HOST_DEVICE.isValidFirmwareURL(url)) {
          FWI_App.log(
            'Firmware location appears to be valid; checking if exists'
          );

          $.ajax({
            url: url,
            cache: false,
            type: 'HEAD',
            error: function() {
              FWI_App.log('Firmware location file does not exist');
              FWI_Hardware.firmwareUrlNotVerified();
            },
            success: function() {
              FWI_App.log('Firmware location file exists');
              $('input[name="firmware_updates_url"]').val(url);
              FWI_Hardware.firmwareUrlVerified();
            }
          });
        } else {
          FWI_App.log(
            'Player command - Error with setFirmwareUpdateCheckUrl file format'
          );
        }
      }
    } catch (e) {
      FWI_App.log('Player command - Error with setFirmwareUpdateCheckUrl');
    }
  },

  updateFirmwareTime: function(data) {
    /* "CheckTime", "HH:MM:SS"  */
    if (FWI_Hardware.firmwareURL) {
      try {
        var cmdValue = data.args.attributes.value;
        var cmdValueCheckTime = cmdValue.hasOwnProperty('CheckTime');

        if (cmdValueCheckTime) {
          var CheckTime = cmdValue.CheckTime;

          if (CheckTime.length === 5 || CheckTime.length === 8) {
            var time12 = FWI_Helper.time24to12(CheckTime);
            var h1 = time12.charAt(0);
            var h2 = time12.charAt(1);
            var m1 = time12.charAt(3);
            var m2 = time12.charAt(4);
            var ampm;

            if (time12.indexOf('PM') !== -1) {
              ampm = ' PM';
            } else if (time12.indexOf('AM') !== -1) {
              ampm = ' AM';
            }

            if (ampm !== '') {
              var format_time = h1 + h2 + ':' + m1 + m2 + ampm;

              if (FWI_Validate.validateTime4(h1, h2, m1, m2)) {
                FWI_Hardware.setFirmwareTimeUpdNum(format_time);
                FWI_App.log(
                  'Player command - setFirmwareUpdateCheckTime Success ' +
                    format_time
                );
              } else {
                FWI_App.log(
                  'Player command - setFirmwareUpdateCheckTime Failure ' +
                    format_time
                );
              }
            }
          } else {
            FWI_App.log(
              'Player command - Error with setFirmwareUpdateCheckTime'
            );
          }
        }
      } catch (e) {
        FWI_App.log(JSON.stringify(e), 'DEBUG');
        FWI_App.log('Player command - Error with setFirmwareUpdateCheckTime');
      }
    } else {
      FWI_App.log('Player command - Firmware url not verified');
    }
  },

  checkFirmware: function() {
    if (FWI_Hardware.firmwareURL) {
      FWI_Hardware.checkFirmwareNow();
      FWI_App.log('Player command - Firmware Update Begin');
    } else {
      FWI_App.log('Player command - Firmware url not verified');
    }
  },

  init: function() {
    FWI_App.log('Player command module loaded.', 'DEBUG');

    if (!this.enabled) {
      window.addEventListener(
        'message',
        function(e) {
          FWI_Custom.recieveChildFn(e);
        },
        false
      );
    }

    this.enabled = true;
  },

  /* Player-sent postMessage Functions, not necessarily user initiated */
  playerSent: function(command, commandData) {
    switch (command) {
      case 'loadSign':
        // We received a load sign command from Web Player.
        FWI_App.log(
          'Received command from embedded player to load the sign.',
          'DEBUG'
        );
        var url = commandData.signUrl;

        if (!FWI_Deploy.isLinkPublic || url.indexOf('_fwi_accessToken') !== -1) {
          // replace accessToken if it has changed.
           url = FWI_Helper.insertOrReplaceQueryParam(
            '_fwi_accessToken',
            FWI_App._accessToken,
            url
          );
        }

        // cache bust to prevent black screen.
        url = FWI_Helper.insertOrReplaceQueryParam(
          '_fwi',
          new Date().getTime(),
          url
        );

        // Then store the updated URL and reload the sign.
        FWI_Deploy2.setIframeURL(url);
        break;
      case 'pingResponse':
        // Message sent when Web Player acknowledges a ping request.
        FWI_App.log(
          'Received ping response message from Content Player for Web.',
          'DEBUG'
        );
        FWI_Custom.restartPlayerMonitor();
        break;
      case 'setPlayer':
        // Log Web Player version number. Store deployment ID and name of player if supplied.
        FWI_App.log(
          'Content Player for Web is ready. Version number: ' +
            commandData.version +
            '.'
        );
        FWI_Custom.webPlayerVersion = commandData.version;

        if (
          commandData.logLevel != null &&
          commandData.logLevel !== FWI_App.logLevel
        ) {
          FWI_App.setLogLevel(commandData.logLevel);
        }

        if (commandData.deploymentId) {
          FWI_Deploy.deployId = commandData.deploymentId;
          HOST_DEVICE.setSetting('deploy_id', FWI_Deploy.deployId);
          FWI_App.log(
            'Deployment ID set from message: ' + commandData.deploymentId,
            'INFO'
          );

          // Get new player ID for FWI Services or update existing one.
          FWI_Monitoring.getPlayerID();

          // Start monitoring sign.
          FWI_Custom.restartPlayerMonitor();
        }

        if (commandData.playerName) {
          FWI_Deploy.playerName = commandData.playerName;
          HOST_DEVICE.setSetting('player_name', FWI_Deploy.playerName);
          FWI_App.log(
            'Player name set from message: ' + commandData.playerName,
            'INFO'
          );
        }
        break;
      case 'log':
        try {
          FWI_App.log({
            msg: commandData.message,
            level: commandData.level,
            logType: 'PlayerLog',
            date: commandData.date
          });
        } catch (error) {
          FWI_App.log('Error processing log command: ' + error, 'ERROR');
        }
        break;
      case 'executeCommandResponse':
        FWI_Custom.cloudCommandResponse(
          commandData.cloudArguments,
          commandData.success ? 'SUCCESS' : 'FAIL',
          commandData.error
        );
    }
  },

  cloudCommand: function(args) {
    if (args.command === 'deploy') {
      var url = args.url || '';

      if (url !== '' && FWI_Deploy.validateURL(url)) {
        FWI_Deploy.testURL = url;
        FWI_Deploy.connectToWebPlayer(url);
      }
    } else if (args.command === 'player') {
      FWI_App.displayPlayer();
    } else if (args.command === 'screenshot') {
      FWI_App.log(
        'Received command from Cloud device management to capture a screenshot.',
        'DEBUG'
      );
      FWI_Monitoring.captureScreen(args.uploadUrl, args.uploadBody);
    } else if (args.command === 'settings') {
      FWI_App.displaySettings();
    } else if (args.command === 'playerCommand') {
      if (args.commandName === 'Reboot') {
        FWI_Custom.cloudCommandResponse(args, 'CONFIRMED');

        // During a reboot we lose context, so we store the Cloud
        // command arguments in settings. Then on power on
        // check if there is anything stored and send a success
        // response to cloud.

        HOST_DEVICE.setSetting(
          'cloud-reboot-attempt',
          JSON.stringify(args),
          function() {
            FWI_Hardware.publishOfflineNotificationReason(
              offlineCodes.USER_COMMAND_RESTART_PLAYER
            );
            HOST_DEVICE.rebootDevice(function(errorMessage) {
              HOST_DEVICE.removeSetting('cloud-reboot-attempt');
              FWI_Custom.cloudCommandResponse(args, 'FAIL', errorMessage);
            });
          }
        );
      } else if (args.commandName === 'ClearCache') {
        FWI_Custom.sendCloudCommandToWebPlayer('5.10.0', args);
      } else if (args.commandName === 'RunScript') {
        if (args.attributes['1'] === 'ClearLogs') {
          HOST_DEVICE.clearLogs(function(result) {
            FWI_Custom.cloudCommandResponse(args, result);
          });
        } else {
          FWI_Custom.sendCloudCommandToWebPlayer('5.10.0', args);
        }
      } else if (args.commandName === 'CheckDeployment') {
        FWI_Custom.sendCloudCommandToWebPlayer('5.10.0', args);
      } else {
        FWI_Custom.cloudCommandResponse(args, 'UNKNOWN');
      }
    }
  },

  checkWebPlayerSupportsCommand: function(versionSupported) {
    var webPlayerVersionParts = FWI_Custom.webPlayerVersion.split('.');
    var supportedVersionParts = versionSupported.split('.');
    var webPlayerMajor = parseInt(webPlayerVersionParts[0], 10);
    var supportedMajor = parseInt(supportedVersionParts[0], 10);
    var webPlayerMinor = parseInt(webPlayerVersionParts[1], 10);
    var supportedMinor = parseInt(supportedVersionParts[1], 10);
    var webPlayerPatch = parseInt(webPlayerVersionParts[2], 10);
    var supportedPatch = parseInt(supportedVersionParts[2], 10);

    return (
      webPlayerMajor > supportedMajor ||
      (webPlayerMajor === supportedMajor && webPlayerMinor > supportedMinor) ||
      (webPlayerMajor === supportedMajor &&
        webPlayerMinor === supportedMinor &&
        webPlayerPatch >= supportedPatch)
    );
  },

  sendCloudCommandToWebPlayer: function(versionSupported, args) {
    FWI_Custom.cloudCommandResponse(args, 'CONFIRMED');

    if (FWI_Custom.checkWebPlayerSupportsCommand(versionSupported)) {
      try {
        FWI_App.playerElement[0].contentWindow.postMessage(
          {
            command: 'executeCommand',
            commandName: args.commandName,
            attributes: args.attributes,
            cloudArguments: args
          },
          FWI_Deploy.storageURL
        );
      } catch (error) {
        FWI_Custom.cloudCommandResponse(
          args,
          'FAIL',
          'Failed to pass command to Web Player'
        );
      }
    } else {
      FWI_Custom.cloudCommandResponse(
        args,
        'FAIL',
        'Command requires Web Player version ' +
          versionSupported +
          '. This sign is currently on version ' +
          FWI_Custom.webPlayerVersion +
          '.'
      );
    }
  },

  cloudCommandResponse: function(originalArgs, status, errorMessage) {
    FWI_Provision.connection.mqtt.publish(
      'fwi/' + FWI_Provision.tenant + '/command',
      JSON.stringify({
        env: 'prod',
        companyId: FWI_Provision.tenant,
        eventId: originalArgs.eventId,
        deviceId: FWI_Provision.id,
        status: status,
        message: errorMessage || '',
        command: originalArgs.commandName,
        requestId: originalArgs.requestId
      })
    );
  },

  clearLogs: function(args) {
    HOST_DEVICE.clearLogs(function(result) {
      FWI_Custom.cloudCommandResponse(args, result);
    });
  },

  // See if the reboot was caused by a command from Cloud
  checkRebootSuccess: function() {
    try {
      var cloudRebootArgs = JSON.parse(
        HOST_DEVICE.getSetting('cloud-reboot-attempt')
      );

      HOST_DEVICE.removeSetting('cloud-reboot-attempt');

      if (cloudRebootArgs != null) {
        FWI_Custom.cloudCommandResponse(cloudRebootArgs, 'SUCCESS');
      }
    } catch (e) {
      HOST_DEVICE.removeSetting('cloud-reboot-attempt');
    }
  }
};
