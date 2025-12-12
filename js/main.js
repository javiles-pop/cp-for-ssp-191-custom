var FWI_App = {
  /* Keep track of current screen user is on */
  currentScreen: 'screen_settings',
  playerElement: null, // Player iframe jQuery node set.
  dev: false,
  online: false,
  _accessToken: '', // Cloud access token.
  _started: false, // Has the app already started?
  log: log,

  /* Show the player */
  displayPlayer: function() {
    // Restart the player. We do this by sending a "play" command to the player.
    // Alternatively, we could reload the frame, but that would require a network
    // connection.
    try {
      if (HOST_DEVICE.isDeviceOnline()) {
        FWI_App.log({
          msg: 'device Online. reinserting url into player',
          level: 'WARN'
        });
        FWI_Deploy2.doNewDeploymentFlow(FWI_Deploy.storageURL);
      } else {
        FWI_Deploy2.setIframeURL(FWI_Deploy.storageURL);
      }
    } catch (error) {
      FWI_App.log(
        'Error while attempting to restart embedded player: ' + error
      );
    }

    this.currentScreen = 'screen_player';
    $('.wrap_access_code').hide();
    $('.wrap_settings').hide();
    $('#debug_logs').hide();
    // Make background transparent and show player.
    $('body').addClass('transparentBackground');
    $('.wrap_player').fadeIn();

    FWI_App.log('Screen Display: ' + this.currentScreen);
  },

  /* Show settings, Bring up Access code modal if needed */
  displaySettings: function() {
    if (HOST_DEVICE.shouldSuspendPlayer()) {
      // Stop the player as external processes could play on top of the configuration screen.
      // We do this by sending a "stop" command to the player.
      try {
        var contentWindow = FWI_App.playerElement[0].contentWindow; // Window hosting Web Player.

        if (contentWindow && contentWindow.document.domain) {
          var message = { command: 'stop' };
          var domain = FWI_Helper.getUserFacingURL(FWI_Deploy.storageURL); // Sign URL domain.

          FWI_App.log(
            'Sending stop message to embedded player. Target domain: ' + domain,
            'DEBUG'
          );
          contentWindow.postMessage(message, domain);
        } else {
          FWI_App.log('Unable to find frame for embedded player.');
        }
        FWI_Custom.stopPlayerMonitor();
      } catch (error) {
        FWI_App.log('Error while attempting to stop embedded player: ' + error);
      }
    }

    if (FWI_Software.accessCode) {
      this.displayEnterAccessCode();
    } else {
      this.displaySettingsAfterCheck();
    }
  },
  /* Function Called after Entering Access Code */
  displaySettingsAfterCheck: function() {
    FWI_App.log('Displaying configuration screen.', 'DEBUG');
    this.currentScreen = 'screen_settings';
    FWI_Settings.currentSetting = 'setting_deploy';

    $('.wrap_access_code').hide();
    // Hide player and enable solid background.
    $('.wrap_player').hide();
    $('body').removeClass('transparentBackground');
    // Show settings.
    $('.modal_takeover').hide();
    $('.wrap_settings').fadeIn();
    FWI_Settings.focusSettingTab('setting_deploy');
    FWI_Settings.focusSettingSidebar();

    FWI_App.log('Screen Display: ' + this.currentScreen);
  },
  /* Access Code Modal */
  enableModal: function() {
    $('html').addClass('modal_on');
    FWI_Settings.currentSelection = 'modal';
    FWI_Settings.focusModal();
  },

  displayEnterAccessCode: function() {
    // Hide player and settings and enable solid background.
    $('.wrap_settings').hide();
    $('.wrap_player').hide();
    $('body').removeClass('transparentBackground');

    // Display access code modal dialog.
    $('.wrap_access_code').fadeIn();
    this.currentScreen = 'screen_access_code';
    $('.wrap_access_code .access_code_enter_modal').addClass('modal_active');
    FWI_App.enableModal();
  },

  displayInitErrorModal: function(paragraph) {
    // Hide player and access code dialog and enable solid background.
    $('.wrap_player').hide();
    $('body').removeClass('transparentBackground');
    $('.wrap_access_code').hide();

    // Show settings.
    $('.wrap_settings').show();
    $('.modal_takeover').fadeIn();

    $('.modal_takeover .hardware_firmware_lock_modal').addClass('modal_active');
    // FIXME: b2b is SSSP specific, update this
    $('.firmware_stage.b2berrors').show();

    $('html').addClass('modal_on_fware');
    FWI_Settings.currentSelection = 'modal';
    FWI_Settings.focusModal();

    if (paragraph) {
      $('.modal_takeover .hardware_firmware_lock_modal .b2berrors p').html(
        paragraph
      );
    }

    /* SSSP Firmware/SDK/API Issue Check, Seen rarely; */
    setTimeout(function() {
      if ($.trim($('.settings_clock .device_time_value').html()) === '') {
        FWI_App.log('No Network/API/Load Issue, Restarting Player');
        FWI_Hardware.publishOfflineNotificationReason(
          offlineCodes.UNKNOWN_REASON
        );
        HOST_DEVICE.reloadPlayer();
      }
    }, 20000);
  },

  /* Bind Global App Elements */
  bindAppElements: function() {
    /* Global Timeout */
    $.ajaxSetup({
      timeout: 60000
    });
  },
  // Initialize the app
  init: function() {
    // Set logging level.
    this.logLevel = (
      HOST_DEVICE.getSetting('logLevel') ||
      HOST_DEVICE.getSetting('fwi.log.level') ||
      'WARN'
    ).toUpperCase();

    this._accessToken = HOST_DEVICE.getSetting('accessToken');

    // Store Web Player iframe jQuery set.
    FWI_App.playerElement = $('.player_iframe');
    /* Bind Elements */
    this.bindAppElements();

    // Initialize device specific code.
    HOST_DEVICE.init();

    FWI_App.log(
      'Initializing application. Current local date & time: ' +
        new Date().toString() +
        '.',
      'DEBUG'
    );

    // Initialize remote, keyboard and mouse handling.
    FWI_Remote.init();

    // Device management.
    FWI_Provision.init();
  },

  // Updates the Cloud access token.
  setAccessToken: function(accessToken, callback) {
    // If the token has changed and the player is running, then let
    // it know to update its access token.
    if (this._accessToken !== accessToken) {
      FWI_App.log({
        message: 'Setting new access token: ' + accessToken,
        level: 'DEBUG',
        preventStoring: true
      });

      FWI_App.log('Setting new access token', 'DEBUG');
      HOST_DEVICE.setSetting('accessToken', accessToken);
      this._accessToken = accessToken;
      this.setHost();
      // update url setting when token changes, but don't pass to the iframe in order to prevent reloading.
      var currentURL = HOST_DEVICE.getSetting('link');

      if (currentURL && !FWI_Deploy.isLinkPublic) {
        var newURL = FWI_Helper.insertOrReplaceQueryParam(
          '_fwi_accessToken',
          accessToken,
          currentURL
        );

        if (newURL.toLowerCase().indexOf('cloudcompanyid')) {
          newURL = FWI_Helper.insertOrReplaceQueryParam(
            '_fwi_cloudCompanyId',
            FWI_Provision.tenant,
            newURL
          );
        }
        HOST_DEVICE.setSetting('link', newURL);
        FWI_Deploy.storageURL = newURL;
      }
    }
    callback && callback(accessToken);
  },

  // Sets the host for Web Player (or updates the information) by sending a message.
  setHost: function() {
    var contentWindow = FWI_App.playerElement
      ? FWI_App.playerElement[0].contentWindow
      : null; // Window hosting Web Player.

    if (contentWindow) {
      try {
        FWI_App.log('Passing information to embedded player.', 'DEBUG');

        var domain = FWI_Deploy.storageURL; // Sign URL domain.

        try {
          if (contentWindow.document.domain) {
            var time = HOST_DEVICE.getTime().getTime(); // Local time in milliseconds since epoch.
            var message = {
              command: 'setHost',
              deviceId: FWI_Provision.id,
              deviceName: FWI_App.deviceName,
              platform: HOST_DEVICE.getPlatform(), // Shim platform.
              hostVersion: '1.9.1', // Version of the hosting app.
              logLevel: FWI_App.logLevel,
              cloudAccessToken: FWI_App._accessToken,
              // NOTE: This compensates for a SSSP (tizen) specific bug
              time: time
            };

            FWI_App.log(
              'Sending message to embedded player. Device time: ' +
                new Date(time) +
                ', Target domain: ' +
                domain,
              'DEBUG'
            );
            contentWindow.postMessage(message, domain);
            FWI_App.log({
              message: "'setHost' message content: " + JSON.stringify(message),
              level: 'DEBUG'
            });
          }
        } catch (error) {
          FWI_App.log(
            'Error while sending message "' +
              JSON.stringify(message) +
              '" to embedded player: ' +
              error
          );
        }
      } catch (error) {
        FWI_App.log('Error initializing state of embedded player: ' + error);
      }
    }
  },

  // Summary: Posts a message to the embedded player.
  // Arguments: message - Object containing the message to send.
  postPlayerMessage: function(message) {
    var contentWindow = FWI_App.playerElement
      ? FWI_App.playerElement[0].contentWindow
      : null; // Window hosting Web Player.
    var domain = FWI_Helper.getUserFacingURL(FWI_Deploy.storageURL); // Sign URL domain.

    if (contentWindow) {
      try {
        if (contentWindow.document.domain) {
          FWI_App.log(
            'Sending message to embedded player. Target domain: ' + domain,
            'DEBUG'
          );
          contentWindow.postMessage(message, domain);
        }
      } catch (error) {
        FWI_App.log(
          'Error while sending message "' +
            JSON.stringify(message) +
            '" to embedded player: ' +
            error
        );
      }
    }
  },

  // Starts the application.
  start: function() {
    FWI_App.log('Starting shim...', 'DEBUG');
    if (this._started) {
      // Idempotency.
      FWI_App.log('Shim already started', 'DEBUG');
      return;
    }

    this._started = true;

    var url = HOST_DEVICE.getSetting('link');

    FWI_Custom.checkRebootSuccess();

    if (url) {
      this.alreadyDeployedStart();
    } else {
      FWI_PreDeploy.init();
    }

    // Send current values to update 'Properties' section in Device Management
    var onModelInfoRetrieved = function(modelInfo) {
      var playerType =
        modelInfo && modelInfo.manufacturer ? modelInfo.manufacturer : '';
      var makeModel = modelInfo && modelInfo.model ? modelInfo.model : '';
      var os = HOST_DEVICE.getFirmwareVersion();

      FWI_Provision.connection.mqtt.publish(
        'fwi/' + FWI_Provision.tenant + '/attributes',
        JSON.stringify({
          env: 'prod',
          deviceId: FWI_Provision.id,
          attributes: {
            playerType: playerType,
            makeModel: makeModel,
            os: os,
            playerVersion: '1.9.1'
          }
        })
      );
    };

    HOST_DEVICE.getDeviceModelInformation(
      onModelInfoRetrieved,
      onModelInfoRetrieved
    );

    // Initialize Shadow Settings
    FWI_Shadow.init();
  },

  alreadyDeployedStart: function(context) {
    var deviceName = HOST_DEVICE.getSetting('deviceName');

    if (deviceName != null) {
      FWI_App.deviceName = deviceName;
    }
    // Initialize settings.
    FWI_Settings.init();
    FWI_Deploy.init(); // Initialize deployment screen. This may start the player.

    if (FWI_App.dev) {
      FWI_Dev.init(); // Diagnostics.
    }

    FWI_Advanced.init(); // Must be called before initialization of the dependent modules, such as Monitoring.
    FWI_Software.init();

    FWI_Hardware.init();

    FWI_Monitoring.init();
    FWI_About.init();
    FWI_Scheduler.init(); // Event scheduler.

    // If player is not active, i.e. no deployment URL has been entered, then show settings.
    // Otherwise, keep showing player. Issue JI#CORE-3658.
    if (this.currentScreen !== 'screen_player' || context === 'pre_deploy') {
      FWI_App.displaySettings();
    }

    FWI_App.log('Shim', 'DEBUG');

    FWI_App.log(
      'Starting Content Player version 1.9.1 Build 19',
      'INFO'
    );
  },

  setLogLevel: function(newLevel) {
    var exactLevel = newLevel.toUpperCase();

    switch (exactLevel) {
      case 'TRACE':
      case 'DEBUG':
      case 'INFO':
      case 'WARN':
      case 'ERROR':
      case 'OFF':
        // Level is valid
        break;
      default:
        // Level is invalid, setting to WARN
        exactLevel = 'WARN';
        break;
    }

    this.logLevel = exactLevel;

    FWI_App.log('New log level: ' + exactLevel, exactLevel);

    HOST_DEVICE.setSetting('logLevel', exactLevel, function() {
      HOST_DEVICE.setSetting('fwi.log.level', exactLevel);
    });

    FWI_Shadow.updateShadow();
  }
};

$(document).ready(function() {
  FWI_App.log('Page loaded.', 'DEBUG');

  var onSuccess = function() {
    // Check if the host API is available.
    try {
      // Checks if the API is available and continues if so, otherwise
      // an error message is shown.
      var checkApi = function() {
        if (HOST_DEVICE.isApiAvailable()) {
          // Start storing logs right away so we don't lose logs
          setInterval(HOST_DEVICE.storeLogs, 5000);
          FWI_App.log('Host API loaded successfully.');
          FWI_App.init();
        } else {
          // NOTE: This log will never be written to disk
          FWI_App.log('Issue loading the host API.');
          FWI_App.displayInitErrorModal(
            'Error Loading host API<br>Attempting to reload app in 20 seconds.'
          );
        }
      };

      // Wait a few seconds for device to boot. Then check if API is now ready.
      setTimeout(checkApi, 4000);
    } catch (e) {
      // NOTE: This log will never be written to disk
      FWI_App.log(
        'Host API error: ' +
          e.code +
          ' name: ' +
          e.name +
          ' message: ' +
          e.message
      );
    }
  };
  HOST_DEVICE.initializeDevice(onSuccess, onSuccess);

  // add ESC key functionality to switch focus back to the shim if lost.
  document
    .getElementById('player_iframe')
    .contentWindow.addEventListener('keyup', function(e) {
      if (e.keyCode === BUTTON_ESC) {
        FWI_App.log('blurring iframe');
        parent.document.getElementById('player_iframe').blur();
      }
    });
});

window.onerror = function(message, source, lineNum, columnNum) {
  log(message + ' (' + lineNum + ', ' + columnNum + ') ' + source, 'ERROR');
};

function logLevelToNumber(level) {
  switch (level) {
    case 'TRACE':
      return 0;
    case 'DEBUG':
      return 1;
    case 'INFO':
      return 2;
    case 'WARN':
      return 3;
    case 'ERROR':
      return 4;
    case 'OFF':
      return 5;
    case 'ADMIN':
      return 6;
    default:
      return 3; // Warning level.
  }
}

function log(config, maybeLevel) {
  var date;
  var msg;
  var level;
  var logType;
  var preventStoring;

  if (typeof config === 'string') {
    date = new Date();
    msg = config;
    level = maybeLevel || 'DEBUG';
    logType = 'DeviceLog';
    preventStoring = false;
  } else {
    date = config.date ? new Date(config.date) : new Date();
    msg = config.msg;
    level = config.level || 'DEBUG';
    logType = config.logType || 'DeviceLog';
    preventStoring = !!config.preventStoring;
  }

  if (!msg) {
    return;
  }

  level = level.toString().toUpperCase();

  var levelNumeric = logLevelToNumber(level);
  var maxLoggingLevel = logLevelToNumber(FWI_App.logLevel);

  if (!preventStoring && levelNumeric >= maxLoggingLevel && !!msg) {
    HOST_DEVICE.writeCloudLog({
      timestamp: FWI_Helper.dateToISO8601(date),
      posixTime: FWI_Helper.dateToPosix(date),
      offset: date.getTimezoneOffset(),
      logLevel: level,
      logType: logType,
      message: msg
    });
    HOST_DEVICE.writeFWIServiceLog(
      date.toString() + ' ' + level + ' ' + logType + ' ' + msg + '\r\n'
    );
  }

  if (levelNumeric < maxLoggingLevel && !preventStoring) {
    return;
  }

  // If available, print logs to the console

  var text = level + ' | ' + date.toString() + ' | ' + logType + ' | ' + msg;

  /* eslint-disable no-console */
  if (console.debug && (levelNumeric === 0 || levelNumeric === 1)) {
    console.debug(text);
  } else if (console.warn && levelNumeric === 3) {
    console.warn(text);
  } else if (console.error && levelNumeric === 4) {
    console.error(text);
  } else if (console.log) {
    console.log(text);
  }
  /* eslint-enable */

  // Logs displayed in the debug panel

  var style = '';

  if (level === 'ERROR') {
    style += ' background-color: rgb(255, 128, 128);';
  } else if (preventStoring) {
    if (level === 'ERROR') {
      style += ' background-color: rgb(255, 128, 255);';
    } else {
      style += ' background-color: rgb(128, 128, 255);';
    }
  }

  // NOTE: Used for development and QA
  // if (preventStoring) {
  $('#debug_logs').prepend(
    "<li class='debug-log-item' style='" +
      style +
      "'>" +
      FWI_Helper.encodeHtml(msg) +
      '</li>'
  );
  // Cap the logs in the debug panel to 50
  $('li.debug-log-item').slice(50).remove();
  // }

  // Logs displayed in the settings view

  var logOutput = $('.post_messages');

  if (FWI_App.dev && logOutput.length) {
    logOutput.append(
      '<p><small>' +
        FWI_Helper.getTimestamp() +
        '</small> ' +
        FWI_Helper.encodeHtml(msg) +
        '</p>'
    );

    // Cap the logs in the settings screen to 100
    if ($('.post_messages p').length > 100) {
      $('.post_messages p').first().remove();
    }

    $('.wrap_pm').scrollTop(999999999);
  }
}
