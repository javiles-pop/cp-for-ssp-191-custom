var FWI_Scheduler = {
  interval: 0,
  logInterval: 0,
  schedulerRunning: false,

  /* Monitor Tab Intervals */
  _monitorLogTimeout: 0, // Handler for the monitor log timeout.
  monitorStatusInt: 0,
  monitorScreenshotInt: 0,

  /* Not used yet */
  lastDayRun: {
    software: HOST_DEVICE.getSetting('last_run_software'),
    reboot: HOST_DEVICE.getSetting('last_run_reboot'),
    firmware: HOST_DEVICE.getSetting('last_run_firmware'),
    screenshot: HOST_DEVICE.getSetting('last_run_screenshot'),
    status: HOST_DEVICE.getSetting('last_run_status'),
    logs: HOST_DEVICE.getSetting('last_run_logs')
  },

  /* Log file active? */
  logsWriting: false,

  /* Start Interval */
  startScheduler: function() {
    this.schedulerRunning = true;
    // Handle network connectivity test
    var updateNetworkStatus = function(online) {
      if (!FWI_App.online && online && FWI_Provision.activated) {
        FWI_Provision.updateRefreshToken &&
          FWI_Provision.updateRefreshToken(function(newToken) {
            var url = FWI_Deploy.storageURL;

            // replace the token if necessary
            if (
              !FWI_Deploy.isLinkPublic ||
              FWI_Deploy.storageURL.indexOf('_fwi_accessToken') !== -1
            ) {
              FWI_Helper.insertOrReplaceQueryParam(
                '_fwi_accessToken',
                newToken,
                url
              );
            }

            // cache buster for CMD channels that may have been updated while offline.
            FWI_App.log({
              msg:
                'Checking for updated channel content after coming back online...',
              level: 'INFO'
            });

            url = FWI_Helper.insertOrReplaceQueryParam(
              '_fwi',
              new Date().getTime().toString(),
              url
            );

            // Then store the updated URL and reload the sign.
            var onSuccess = function() {
              // Reload sign once URL has been verified.
              var context = '';
              if (FWI_App.currentScreen === 'screen_settings') {
                context = 'pre_deploy';
              }
              FWI_Deploy2.setIframeURL(FWI_Deploy.storageURL);
              FWI_App.alreadyDeployedStart(context);
            };

            FWI_Deploy.setURL(url, FWI_Deploy.isLinkPublic, onSuccess);
          });
      }

      if (FWI_App.online !== online) {
        FWI_About.getStaticData();
      }

      FWI_App.online = online;

      var $onlineIndicator = $('.network-status');

      if (online) {
        // FWI_App.log('Device connected to network.', 'DEBUG');
        $onlineIndicator
          .removeClass('network-status__disconnected')
          .addClass('network-status__connected');
      } else {
        FWI_App.log('Device disconnected from network.', 'DEBUG');
        $onlineIndicator
          .removeClass('network-status__connected')
          .addClass('network-status__disconnected');
      }
    };
    var onNetworkStatusSuccess = function(online) {
      updateNetworkStatus(online);
    };
    var onNetworkStatusError = function() {
      // Assume offline.
      updateNetworkStatus(false);
    };
    // Initial online check.
    HOST_DEVICE.isDeviceOnline(onNetworkStatusSuccess, onNetworkStatusError);

    // Check online status every N seconds
    this.onlineInterval = window.setInterval(function() {
      HOST_DEVICE.isDeviceOnline(onNetworkStatusSuccess, onNetworkStatusError);
    }, HOST_DEVICE.onlineCheckFrequency());

    // Check events every 60s.
    // This will also update the time.
    this.interval = window.setInterval(function() {
      var currentTime = HOST_DEVICE.getTime();
      $('.settings_clock .device_time_value').html(
        FWI_Helper.getTimestamp(currentTime)
      );

      if (FWI_Deploy.deployId) {
        FWI_Scheduler.checkForEvents(currentTime);
      } else {
        FWI_App.log(
          'Scheduler - Idle, no Deploy ID | ' +
            FWI_Helper.getTimestamp(currentTime)
        );
      }
      FWI_App.setHost();
      var cachedURL = HOST_DEVICE.getSetting('cached_url');
      if (cachedURL && FWI_App.playerElement.prop('src') !== cachedURL) {
        FWI_App.log({
          msg:
            'Current sign url does not match url that is stored for offline playback.',
          level: 'WARN'
        });
        if (HOST_DEVICE.isDeviceOnline()) {
          HOST_DEVICE.setSetting(
            'cached_url',
            FWI_App.playerElement.prop('src')
          );
        }
      }
    }, 60000); // Every minute.

    /* Initial Update settings clock */
    var currentTime = HOST_DEVICE.getTime();

    $('.settings_clock .device_time_value').html(
      FWI_Helper.getTimestamp(currentTime)
    );
    FWI_App.log('startScheduler - ' + FWI_Helper.formatAMPM(currentTime));
  },
  /* Not used */
  stopScheduler: function() {
    window.clearInterval(this.interval);
    window.clearInterval(this.logInterval);
    window.clearInterval(this.onlineInterval);
    this.schedulerRunning = false;
  },

  /* Check for events at current time */
  checkForEvents: function(date) {
    var now = date;
    var currentDay = now.getDay();
    var currentDayStr = FWI_Helper.getWeekDay(date);

    now = FWI_Helper.formatAMPM(now);
    FWI_App.log('Scheduler checking for events to be executed at ' + now + '.');

    // Software Update
    if (
      FWI_Software.softwareUpdatesTime &&
      FWI_Software.softwareUpdatesEnabled &&
      now === FWI_Software.softwareUpdatesTime
    ) {
      FWI_Scheduler.lastDayRun.software = currentDay;
      HOST_DEVICE.setSetting('last_run_software', currentDay);
      FWI_App.log('Checking for software update at scheduled time: ' + now);
      HOST_DEVICE.checkSoftwareNow();
    }

    /* Reboot Device */
    if (FWI_Hardware.rebootTime && FWI_Hardware.rebootEnabled) {
      var randomRebootTime = FWI_Helper.timeStringToDate(
        FWI_Hardware.rebootTime
      ); // fallback
      if (FWI_Hardware.randomRebootTime) {
        randomRebootTime = FWI_Hardware.randomRebootTime;
      }
      // we don't care about seconds here. only minute.
      date.setSeconds(0);
      FWI_Hardware.randomRebootTime.setSeconds(0);

      if (date >= randomRebootTime) {
        FWI_Scheduler.lastDayRun.reboot = currentDay;
        HOST_DEVICE.setSetting('last_run_reboot', currentDay);
        FWI_App.log('Scheduler - Run Reboot with random offset', 'INFO');
        FWI_Hardware.publishOfflineNotificationReason(
          offlineCodes.SCHEDULED_REBOOT
        );
        HOST_DEVICE.rebootDevice();
      }
    }

    /* Firmware Check */
    if (
      FWI_Hardware.firmwareUpdatesTime &&
      FWI_Hardware.firmwareUpdatesEnabled
    ) {
      if (now === FWI_Hardware.firmwareUpdatesTime) {
        FWI_Scheduler.lastDayRun.firmware = currentDay;
        HOST_DEVICE.setSetting('last_run_firmware', currentDay);
        FWI_App.log('Scheduler - Run Firmware Upgrade');
        FWI_Hardware.checkFirmwareNow();
      }
    }

    /* On/Off Timer */
    if (
      FWI_Hardware.onOffTimersEnabled &&
      FWI_Hardware.onOffTimers &&
      FWI_Hardware.onOffTimers.length
    ) {
      var turnOn = false;
      var turnOff = false;

      $.each(FWI_Hardware.onOffTimers, function(key, value) {
        /* Check for timers today */
        if (
          value.dayStr.indexOf(currentDayStr) >= 0 ||
          value.dayStr.indexOf('Everyday') >= 0
        ) {
          var onFormat = value.on.dupeCheck.split('|');
          var offFormat = value.off.dupeCheck.split('|');

          if (onFormat[1] === now) {
            turnOn = true;
            return false;
          }

          if (offFormat[1] === now) {
            turnOff = true;
            return false;
          }
        }
      });

      if (turnOn) {
        FWI_App.log('Scheduler - OnOff Timer - Turn Display On: ' + now);
        HOST_DEVICE.turnDisplayOnOff('ON');
        FWI_Hardware.display_on = true;
      }

      if (turnOff) {
        FWI_App.log('Scheduler - OnOff Timer - Turn Display Off: ' + now);
        HOST_DEVICE.turnDisplayOnOff('OFF');
        FWI_Hardware.display_on = false;
      }
    }
  },

  // Sets the log upload time or disables log upload entirely.
  monitorLog: function(onOff) {
    FWI_App.log('Monitor log, enabled: ' + FWI_Advanced.advEnabled, 'DEBUG');

    if (FWI_Advanced.advEnabled) {
      FWI_App.log('Monitor log, onOff: ' + onOff, 'DEBUG');

      if (onOff && onOff.toUpperCase() === 'ON') {
        window.clearTimeout(this._monitorLogTimeout);

        if (FWI_Monitoring.monLogsTime && FWI_Monitoring.monLogsTime2) {
          // Determine random time within next, valid log upload window.
          var now = new Date();
          FWI_App.log('Monitor log, now: ' + now.toString(), 'DEBUG');
          var windowStartTime = FWI_Helper.time12ToSecondsAfterMidnight(
            FWI_Monitoring.monLogsTime
          );
          var windowEndTime = FWI_Helper.time12ToSecondsAfterMidnight(
            FWI_Monitoring.monLogsTime2
          );
          FWI_App.log(
            'Monitor log, startTime in seconds: ' + windowStartTime,
            'DEBUG'
          );
          FWI_App.log(
            'Monitor log, endTime in seconds: ' + windowEndTime,
            'DEBUG'
          );
          if (
            !isNaN(windowStartTime) &&
            !isNaN(windowEndTime) &&
            windowStartTime !== windowEndTime
          ) {
            var startTime = getWindowTime(now, FWI_Monitoring.monLogsTime);
            var endTime = getWindowTime(now, FWI_Monitoring.monLogsTime2);
            FWI_App.log(
              'Monitor log, startTime: ' + startTime.toString(),
              'DEBUG'
            );
            FWI_App.log(
              'Monitor log, endTime 1: ' + endTime.toString(),
              'DEBUG'
            );
            if (endTime < startTime) {
              endTime.setHours(endTime.getHours() + 24);
            }
            FWI_App.log(
              'Monitor log, endTime 2: ' + endTime.toString(),
              'DEBUG'
            );
            var min = Math.ceil(startTime.getTime());
            var max = Math.floor(endTime.getTime());
            var randomTime = Math.floor(Math.random() * (max - min)) + min;
            FWI_App.log('Monitor log, min: ' + min, 'DEBUG');
            FWI_App.log('Monitor log, max: ' + max, 'DEBUG');
            FWI_App.log('Monitor log, randomTime 1: ' + randomTime, 'DEBUG');
            FWI_App.log(
              'Monitor log, FWI_Monitoring.monLogsTimestamp: ' +
                FWI_Monitoring.monLogsTimestamp,
              'DEBUG'
            );
            // If random time is within the last 12 hours, add 24 hours to the next upload time.
            if (FWI_Monitoring.monLogsTimestamp) {
              FWI_App.log(
                'Monitor log, FWI_Monitoring.monLogsTimestamp as date: ' +
                  FWI_Monitoring.monLogsTimestamp.toString(),
                'DEBUG'
              );
              if (
                randomTime - FWI_Monitoring.monLogsTimestamp.getTime() <
                12 * 60 * 60 * 1000
              ) {
                randomTime += 24 * 60 * 60 * 1000;
              }
            }
            FWI_App.log('Monitor log, randomTime 2: ' + randomTime, 'DEBUG');
            if (randomTime < now.getTime()) {
              // If the calculated time is in the past, schedule for next day's window
              randomTime += 24 * 60 * 60 * 1000; // Add 24 hours
              FWI_App.log('Monitor log, time was in past, moved to next day: ' + new Date(randomTime), 'DEBUG');
            }
            FWI_App.log('Monitor log, randomTime 3: ' + randomTime, 'DEBUG');
            var randomDurationSeconds = Math.max(
              (randomTime - now.getTime()) / 1000,
              0
            );
            FWI_App.log(
              'Monitor log, randomDurationSeconds: ' + randomDurationSeconds,
              'DEBUG'
            );
            // Store time for log uploads.
            HOST_DEVICE.setSetting(
              'mon_logs_time_seconds',
              randomDurationSeconds.toString()
            );
            FWI_App.log(
              'Log upload time set. Next scheduled log upload will happen at ' +
                new Date(now.getTime() + randomDurationSeconds * 1000) +
                '.',
              'INFO'
            );

            // Scheduled log upload for the future.
            this._monitorLogTimeout = window.setTimeout(function() {
              // Check if logs should be upload now.
              if (
                randomDurationSeconds != null &&
                FWI_Monitoring.monLogsEnabled
              ) {
                FWI_App.log('Log upload scheduled for now.', 'DEBUG');
                var onSuccess = function() {
                  // Re-enable log upload if still enabled.
                  var logUploadEnabled =
                    HOST_DEVICE.getSetting('mon_logs_enabled') ===
                    true.toString();
                  FWI_Scheduler.monitorLog(logUploadEnabled ? 'ON' : 'OFF');
                  FWI_Monitoring.monLogsTimestamp = HOST_DEVICE.getTime();
                  HOST_DEVICE.setSetting(
                    'mon_logs_timestamp',
                    FWI_Monitoring.monLogsTimestamp.toString()
                  );
                };
                var onError = function() {
                  // Re-enable log upload if still enabled.
                  var logUploadEnabled =
                    HOST_DEVICE.getSetting('mon_logs_enabled') ===
                    true.toString();
                  FWI_Scheduler.monitorLog(logUploadEnabled ? 'ON' : 'OFF');
                };

                FWI_Monitoring.uploadLogsStart(onSuccess, onError);
              } else {
                FWI_App.log('Log Interval Ignored, Check Deploy ID');
              }
            }, randomDurationSeconds * 1000);
          } else {
            FWI_App.log(
              'Log upload window invalid, so log upload is disabled.',
              'INFO'
            );
          }
        } else {
          FWI_App.log('Log upload window has not been initialized.', 'DEBUG');
        }
      } else {
        window.clearTimeout(this.monitorLogInt);
      }
    } else {
      FWI_App.log(
        'Log upload window ignored. Missing valid Services connection properties.',
        'WARN'
      );
    }
  },

  monitorStatus: function(onOff) {
    if (FWI_Advanced.advEnabled) {
      if (onOff && onOff.toUpperCase() === 'ON') {
        window.clearInterval(this.monitorStatusInt);
        this.monitorStatusInt = window.setInterval(function() {
          /* Status Check */
          if (
            FWI_Monitoring.monStatusTimeSeconds &&
            FWI_Monitoring.monStatusTimeSeconds >= 30 &&
            FWI_Monitoring.monStatusEnabled
          ) {
            FWI_App.log('Scheduler - Cron: monStatus upload');
            FWI_Monitoring.uploadStatus();
          } else {
            FWI_App.log('Status Interval Ignored, Check Deploy ID');
          }
        }, 1 * FWI_Monitoring.monStatusTimeSeconds * 1000);
      } else {
        window.clearInterval(this.monitorStatusInt);
      }
    } else {
      FWI_App.log(
        'Status upload interval ignored, Missing valid Services connection properties.',
        'WARN'
      );
    }
  },

  monitorScreenshot: function(onOff) {
    if (FWI_Advanced.advEnabled) {
      if (onOff && onOff.toUpperCase() === 'ON') {
        window.clearInterval(this.monitorScreenshotInt);
        this.monitorScreenshotInt = window.setInterval(function() {
          /* Screenshot Check */
          if (
            FWI_Monitoring.monScreenshotTimeSeconds >= 30 &&
            FWI_Monitoring.monScreenshotEnabled
          ) {
            FWI_App.log('Capturing screenshot at scheduled interval.', 'DEBUG');
            FWI_Monitoring.captureScreen();
          } else {
            FWI_App.log(
              'Screenshot upload interval ignored. Screenshot upload enabled: ' +
                FWI_Monitoring.monScreenshotEnabled +
                ', Screenshot upload interval (s): ' +
                FWI_Monitoring.monScreenshotTimeSeconds,
              'WARN'
            );
          }
        }, 1 * FWI_Monitoring.monScreenshotTimeSeconds * 1000);
      } else {
        window.clearInterval(this.monitorScreenshotInt);
      }
    } else {
      FWI_App.log(
        'Screenshot upload interval ignored, Missing valid Services connection properties.',
        'WARN'
      );
    }
  },

  init: function() {
    if (!this.schedulerRunning) {
      this.startScheduler();

      window.addEventListener('online', function() {
        console.log('DEVICE IS BACK ONLINE!');
        FWI_Custom.init();
        FWI_Provision.connectAuthenticated();
      });

      window.addEventListener('offline', function() {
        FWI_App.online = false;
      });
    } else {
      FWI_App.log({ msg: 'Scheduler already initialized', level: 'DEBUG' });
    }
  }
};

function getWindowTime(now, time12) {
  var hours = Number(time12.match(/^(\d+)/)[1]);
  var minutes = Number(time12.match(/:(\d+)/)[1]);
  var ampm = time12.match(/\s(.*)$/)[1];

  if (ampm === 'PM' && hours < 12) {
    hours = hours + 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = hours - 12;
  }

  var setTime = new Date(now);

  setTime.setHours(hours, minutes, 0, 0);

  return setTime;
}
