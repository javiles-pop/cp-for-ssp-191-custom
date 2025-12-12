/**
 * General Flow:
 * onInit the device will piggyback on FWI_Provision's mqtt connection, then subscribe to shadow
 * related topics. If a shadow does not yet exist, it will create one. When a setting in the shim
 * is updated, it will send a request to the shadow to update the cloud settings. the shadow
 * responds by sending back a delta state of anything that differs between the device's reported
 *  settings, and what the newly changed (desired) settings are. When the shim receives a delta,
 *  it looks for a function in this file with the name "update{{KeyName}}()", and send the payload
 * as it's argument. The function will change the device setting(s), and then report it's own
 * state. if something is still different on the shadow, it will continue sending delta messages
 *  until finally the reported and desired states match. In the event that the device's settings
 * are changed when offline, it will report the values stored on disk when the reconnect
 * event is fired, and the shadow can reconcile the changes. In the event of a conflict, the shadow
 *  will always win.
 */
var FWI_Shadow = {
  baseURL: '$aws/things/',
  snapshot: {}, // when we get a full shadow, it is stored here.

  init: function() {
    FWI_App.log('[SHADOW] Initializing device shadow settings...');

    // piggyback on the existing connection from FWI_Provision.
    FWI_Shadow.mqtt = FWI_Provision.connection.mqtt;

    FWI_Shadow._private._registerShadowEvents();
  },

  _private: {
    isInitialized: false,
    /**
     * subscribe to shadow topics and register EventListeners for key shadow events.
     */
    _registerShadowEvents: function() {
      var platform = HOST_DEVICE.getPlatform();

      // poll device volume every 15 mins since there's no exposed event to take care of this.
      if (platform === 'Samsung SSP' || platform === 'webOS') {
        window.checkVolumeInterval = setInterval(function() {
          FWI_App.log(
            '[SHADOW] polling device volume at 15min interval.',
            'DEBUG'
          );
          HOST_DEVICE.getVolume(function() {
            FWI_Shadow.updateShadow();
          });
        }, 15 * 1000 * 60); // 15 mins
      }

      //subscribe to all get channels
      FWI_Shadow.mqtt.subscribe(
        FWI_Shadow.baseURL + FWI_Provision.id + '/shadow/get/#',
        function() {
          FWI_App.log('[SHADOW] subscribed to get topics');
        }
      );

      // subscribe to all update channels
      FWI_Shadow.mqtt.subscribe(
        FWI_Shadow.baseURL + FWI_Provision.id + '/shadow/update/accepted',
        function() {
          FWI_App.log('[SHADOW] subscribed to update/accepted');
        }
      );
      FWI_Shadow.mqtt.subscribe(
        FWI_Shadow.baseURL + FWI_Provision.id + '/shadow/update/rejected',
        function() {
          FWI_App.log('[SHADOW] subscribed to update/rejected');
        }
      );

      FWI_Shadow.mqtt.subscribe(
        FWI_Shadow.baseURL + FWI_Provision.id + '/shadow/update/delta',
        function() {
          FWI_App.log('[SHADOW] subscribed to update/delta');
        }
      );

      FWI_Shadow.mqtt.subscribe(
        FWI_Shadow.baseURL + FWI_Provision.id + '/shadow/update/documents',
        function() {
          FWI_App.log('[SHADOW] subscribed to update/documents');
        }
      );

      // subscribe to company wide topic that notifies re-publishing of CMD Channels
      FWI_Shadow.mqtt.subscribe(
        'fwi/' + FWI_Provision.tenant + '/broadcast',
        function() {
          FWI_App.log('[SHADOW] subscribed to company broadcasts');
        }
      );

      FWI_Shadow.mqtt.on('offline', function() {
        // FWI_App.log('[SHADOW] mqtt offline');
        FWI_Shadow.online = false;
      });

      // handle what happens when the shadow is connected (not just for the first time).
      FWI_Shadow.mqtt.on('connect', function() {
        // FWI_App.log('[SHADOW] mqtt online');
        FWI_Shadow.online = true;
        if (!FWI_Shadow._private.isInitialized) {
          FWI_App.log('[SHADOW] creating blank device shadow...');
          FWI_Shadow.createShadow();
          FWI_Shadow._private.isInitialized = true;
        }
        FWI_Shadow._private._reportShadow();
      });

      FWI_Shadow.mqtt.on('reconnect', function() {
        FWI_Shadow.online = true;
        // FWI_App.log('[SHADOW] reconnected...');
        FWI_Shadow._private._reportShadow();
      });
    },

    /**
     * Compares the delta object from the shadow and calls appropriate functions to resolve values that don't match between the shadow and the device. In the event of a tie, the shadow will win the conflict.
     * @param {Object <ShadowState>} tempState this can be an object from the shadow OR from the device snapshot variable
     */
    _handleDelta: function(tempState) {
      FWI_App.log('_handleDelta tempState received');
      FWI_App.log(tempState);
      Object.keys(tempState).map(function(keyName) {
        if (typeof FWI_Shadow['update' + keyName] === 'function') {
          var fn = FWI_Shadow['update' + keyName];
          fn(tempState[keyName]);
        } else {
          FWI_App.log(
            '[SHADOW] update' +
              keyName +
              ' is not a function that can be called',
            'WARN'
          );
        }
      });
    },

    /**
     * reads all the stored settings from the device in order to send a complete snapshot to the shadow to resolve deltas.
     * @return {Object<ShadowState>}
     */
    _getAllSettings: function() {
      var reported = {
        DeploymentURL: FWI_Helper.getUserFacingURL(
          HOST_DEVICE.getSetting('link')
        ),
        AccessCode: FWI_Helper.getAccessCodeForShadow(),
        SoftwareUpdateURL: HOST_DEVICE.getSetting('software_url'),
        CheckForSoftwareUpdate: FWI_Helper.parseBool(
          HOST_DEVICE.getSetting('software_updates_enable')
        ),
        CheckForSoftwareUpdateTime: FWI_Helper.time12to24(
          HOST_DEVICE.getSetting('software_updates_time')
        ),
        Orientation: FWI_Helper.convertOrientationForShadow(
          HOST_DEVICE.orientation
        ),
        WantReboot: FWI_Helper.parseBool(
          HOST_DEVICE.getSetting('reboot_enabled')
        ),
        RebootTime: FWI_Helper.time12to24(
          HOST_DEVICE.getSetting('reboot_time')
        ),
        HardwareUpdateURL: HOST_DEVICE.getSetting('firmware_url'),
        CheckForHardwareUpdate: FWI_Helper.parseBool(
          HOST_DEVICE.getSetting('firmware_updates_enabled')
        ),
        CheckForHardwareUpdateTime: FWI_Helper.time12to24(
          HOST_DEVICE.getSetting('firmware_updates_time')
        ),
        EnableOnOffTimers: FWI_Helper.parseBool(
          HOST_DEVICE.getSetting('on_off_timers_enabled')
        ),
        OnOffTimers: FWI_Helper.formatTimersForShadow(FWI_Hardware.onOffTimers),
        FWIServicesEnabled: FWI_Helper.parseBool(
          HOST_DEVICE.getSetting('adv_enabled')
        ),
        LogLevel: FWI_App.logLevel,
        name: FWI_App.deviceName,
        WebPlayerURL: HOST_DEVICE.getSetting('webPlayerBaseURL'),
        CECEnabled: FWI_Helper.parseBool(HOST_DEVICE.getSetting('cec_enabled'))
      };
      switch (HOST_DEVICE.getPlatform()) {
        case 'BrightSign':
        case 'Dev - Browser':
          (reported.VolumeLevel = null), (reported.Orientation = null);
          reported.TimeZone = FWI_Helper.convertTimeZoneForShadow(
            HOST_DEVICE.getSetting('time_zone')
          );
          reported.TimeServer = HOST_DEVICE.getSetting('time_server')
            ? HOST_DEVICE.getSetting('time_server')
            : HOST_DEVICE.getDefaultTimeServer();
          break;

        case 'webOS':
          reported.VolumeLevel = FWI_Hardware.volumeLevel;
          break;

        case 'Samsung SSP':
          reported.VolumeLevel = FWI_Hardware.volumeLevel;
          break;
        default:
          break;
      }

      return reported;
    },

    /**
     * Sends the current snapshot of device state to the shadow. This will trigger a delta event to be sent back if something does not match.
     */
    _reportShadow: function() {
      var reported = FWI_Shadow._private._getAllSettings();

      FWI_Shadow.mqtt.publish(
        '$aws/things/' + FWI_Provision.id + '/shadow/update',
        JSON.stringify({
          state: {
            reported: reported
          }
        })
      );
    },

    _resolveDesiredState: function(document) {
      FWI_App.log('[SHADOW] resolving desired state');
      if (document.current.state.desired) {
        var newDesiredState = {};
        var desiredKeys = Object.keys(document.current.state.desired);
        var reported = FWI_Shadow._private._getAllSettings();

        desiredKeys.map(function(key) {
          // if key exists
          if (reported[key]) {
            // if it's an array
            if (Array.isArray(reported[key])) {
              // if values arrays && are equal
              if (
                JSON.stringify(reported[key]) ===
                JSON.stringify(document.current.state.desired[key])
              ) {
                newDesiredState[key] = null;
              }
            } else {
              // if values are not arrays && are equal
              if (
                newDesiredState[key] === document.current.state.desired[key]
              ) {
                newDesiredState[key] = null;
              }
            }
          }
        });

        newDesiredState =
          Object.keys(newDesiredState).length <= 0 ? null : newDesiredState;

        FWI_Shadow.mqtt.publish(
          '$aws/things/' + FWI_Provision.id + '/shadow/update',
          JSON.stringify({
            state: {
              desired: newDesiredState
            }
          })
        );
      }
    }
  },

  /**
   * Publishes a blank message to the shadow topic /update in order to create a shadow if it doesn't yet exist.
   */
  createShadow: function() {
    // create a shadow by publishing a blank message.
    FWI_Shadow.mqtt.publish(
      '$aws/things/' + FWI_Provision.id + '/shadow/update',
      JSON.stringify({
        state: {}
      })
    );
  },

  /**
   * Sets the log level for the Shim and Web Player.
   * @param {String} logLevel
   */
  updateLogLevel: function(logLevel) {
    if (logLevel !== FWI_App.logLevel) {
      FWI_App.log('[SHADOW] requesting to set new Log Level: ' + logLevel);

      FWI_App.setLogLevel(logLevel);
      FWI_App.setHost();
    }
  },

  /**
   * Controls the access code that allows user control of Device settings
   * @param {String} newAccessCode
   */
  updateAccessCode: function(newAccessCode) {
    if (newAccessCode !== HOST_DEVICE.getSetting('access_code')) {
      FWI_App.log(
        '[SHADOW] requesting to set new Access Code: ' + newAccessCode
      );
      newAccessCode.length > 0
        ? FWI_Software.setAccessCode(newAccessCode)
        : FWI_Software.clearAccessCode();
      // shadow update happens in the method above since it is also common code.
    }
  },

  updateCECEnabled: function(bool) {
    var oldSetting = FWI_Helper.parseBool(
      HOST_DEVICE.getSetting('cec_enabled')
    );
    if (bool !== oldSetting) {
      if (bool) {
        FWI_Hardware.useCECCommandsUI();
      } else {
        FWI_Hardware.useAVSignalUI();
      }
      HOST_DEVICE.setSetting('cec_enabled', bool.toString());
    }
  },

  /**
   * updates the time picker UI for daily firmware updates.
   * @param {String} newTime 24h timestamp HH:MM:ii which will be parsed to the device's preferred format.
   */
  updateCheckForHardwareUpdateTime: function(newTime) {
    var currentTime = HOST_DEVICE.getSetting('firmware_updates_time')
      ? HOST_DEVICE.getSetting('firmware_updates_time')
      : null;
    if (FWI_Helper.time24to12(newTime) !== currentTime) {
      FWI_App.log(
        '[SHADOW] requesting to change firmware update check time to ' + newTime
      );

      newTime = FWI_Helper.time24to12(newTime);
      FWI_Hardware.setFirmwareTimeUpdNum(newTime);
    }
  },

  /**
   * updates the time picker UI for daily software updates.
   * @param {String} newTime 24h timestamp HH:MM:ii which will be parsed to the device's preferred format.
   */
  updateCheckForSoftwareUpdateTime: function(newTime) {
    var currentTime = HOST_DEVICE.getSetting('software_updates_time')
      ? HOST_DEVICE.getSetting('software_updates_time')
      : null;
    if (FWI_Helper.time24to12(newTime) !== currentTime) {
      FWI_App.log(
        '[SHADOW] requesting to change software update check time to ' + newTime
      );

      newTime = FWI_Helper.time24to12(newTime);
      FWI_Software.setUpdateTimeUpdNum(newTime);
    }
  },

  /**
   * toggle UI switch for whether or not to check for daily software updates
   * @param {Boolean} bool
   */
  updateCheckForSoftwareUpdate: function(bool) {
    var oldSetting;
    try {
      oldSetting = JSON.parse(
        HOST_DEVICE.getSetting('software_updates_enable')
      );
    } catch (error) {
      oldSetting = false;
      FWI_App.log(
        'tried to get setting software_updates_enable, but it didnt exist. assuming false',
        'WARN'
      );
      HOST_DEVICE.setSetting('software_updates_enable', 'false');
    }

    if (bool != oldSetting) {
      FWI_App.log('[SHADOW] requesting to change Software updates to ' + bool);

      bool
        ? FWI_Software.checkForUpdatesEnabled()
        : FWI_Software.checkForUpdatesDisabled();
    }
  },

  updatecheckLabels: function(bool) {
    if (bool) {
      // post message to WP
      FWI_App.postPlayerMessage({ command: 'updateLabels' });
    }
  },

  /**
   * Sets the channel, but only if it's a super simple channel.
   * @param {Object} channelPayload an object sent from cloud containing id, version, channelType
   */
  updatechannel: function(channelPayload) {
    if (
      channelPayload &&
      channelPayload.channelType &&
      channelPayload.channelType === 'cloud'
    ) {
      FWI_App.log({
        msg:
          '[SHADOW] Deployment requesting change to Super Simple channel with ID of:' +
          channelPayload.id,
        level: 'INFO'
      });

      // if not defined or < "https://fwicloud.com".length
      if (
        !FWI_Deploy.webPlayerBaseURL ||
        FWI_Deploy.webPlayerBaseURL.length < 20
      ) {
        FWI_App.log({
          msg:
            "You have not specified a base URL for Content Player for Web. Please edit this device's configuration in FWI Cloud to include this address.",
          level: 'ERROR'
        });
        return;
      }

      // We need to build a url that contains the channel ID, width, height, access token, and company ID for web player.

      // set channel
      var builtURL = FWI_Helper.insertOrReplaceQueryParam(
        'channel',
        channelPayload.id,
        FWI_Deploy.webPlayerBaseURL
      );

      // set width
      builtURL = FWI_Helper.insertOrReplaceQueryParam(
        'width',
        window.innerWidth,
        builtURL
      );

      //set height
      builtURL = FWI_Helper.insertOrReplaceQueryParam(
        'height',
        window.innerHeight,
        builtURL
      );

      // set token
      builtURL = FWI_Helper.insertOrReplaceQueryParam(
        '_fwi_accessToken',
        FWI_App._accessToken,
        builtURL
      );

      // set company
      builtURL = FWI_Helper.insertOrReplaceQueryParam(
        '_fwi_cloudCompanyId',
        FWI_Provision.tenant,
        builtURL
      );

      // set the URL.
      FWI_Shadow.updateDeploymentURL(builtURL);
    }
  },

  /**
   * Sets the deployment URL (channel) of the device
   * @param {String<URL>} newDeploymentURL
   */
  updateDeploymentURL: function(newDeploymentURL) {
    // get rid of cache_busting on playerAccessURLs
    newDeploymentURL = newDeploymentURL.replace(/&_=[0-9]+/g, '');
    if (newDeploymentURL !== HOST_DEVICE.getSetting('link')) {
      FWI_App.log(
        '[SHADOW] requesting new deployment URL: ' + newDeploymentURL
      );
      // need to find out if this link is public or not.
      // FWI_Deploy.connectToWebPlayer(
      //   newDeploymentURL,
      //   function(isPublic, url) {
      //     // now that we have that data, we can set the URL. in the callback,
      //     FWI_Deploy.setURL(url, isPublic, function() {
      //       clearInterval(FWI_PreDeploy.onlineInterval);

      //       // hide pre-deploy screen.
      //       $('.device__pre-deployment__dialog').hide();
      //       $('#fwi_link').val(url);
      //       $('input[name="pre-deployment_url"]').val(url);
      //       FWI_App.alreadyDeployedStart();
      //     });
      //   })

      FWI_Deploy2.getFinalSignURL(newDeploymentURL).then((url) => {
        FWI_Deploy.connectSuccess(FWI_Deploy.isLinkPublic, url);
        clearInterval(FWI_PreDeploy.onlineInterval);
        // hide pre-deploy screen.
        $('.device__pre-deployment__dialog').hide();
        $('#fwi_link').val(url);
        $('input[name="pre-deployment_url"]').val(url);
        FWI_App.alreadyDeployedStart();
      })
      }
  },

  /**
   * enable or disable on/off timers on the device
   * @param {Boolean} newSetting
   */
  updateEnableOnOffTimers: function(newSetting) {
    var oldSetting;
    try {
      oldSetting = JSON.parse(HOST_DEVICE.getSetting('on_off_timers_enabled'));
    } catch (error) {
      oldSetting = false;
      FWI_App.log(
        'tried to get setting on_off_timers_enabled, but it didnt exist. assuming false',
        'WARN'
      );
      HOST_DEVICE.setSetting('on_off_timers_enabled', 'false');
    }
    if (newSetting != oldSetting) {
      FWI_App.log(
        '[SHADOW] requesting to change on/off timers to: ' + newSetting
      );
      newSetting
        ? FWI_Hardware.onOffTimersEnable()
        : FWI_Hardware.onOffTimersDisable();
    }
    // shadow update happens in the method(s) above since they are also common code.
  },

  /**
   * enable or disable FWI Services (optional). This setting is not changable from the Cloud interface
   * @param {Boolean} isEnabled
   */
  updateFWIServicesEnabled: function(isEnabled) {
    // NOTE: This property is marked as readonly in the schema, but that only refers to whether or not the field in the UI is enabled / disabled. So we still need to update the shadow if this changes.

    FWI_App.log(
      '[SHADOW] requesting to ' + isEnabled
        ? 'enable'
        : 'disable' + 'FWI Services'
    );
    isEnabled ? FWI_Advanced.enableServices() : FWI_Advanced.disableServices();
  },

  /**
   *  change the URL from which the device accesses hardware (firmware) updates.
   * @param {String<URL>} newURL
   */
  updateHardwareUpdateURL: function(newURL) {
    if (newURL !== HOST_DEVICE.getSetting('firmware_url')) {
      FWI_App.log(
        '[SHADOW] requesting to update new firmware url: ' + newURL,
        'DEBUG'
      );

      FWI_Hardware.setFirmwareUrl(newURL);
      if (HOST_DEVICE.isValidFirmwareURL(newURL)) {
        FWI_Hardware.firmwareUrlVerified();
      }
    }
  },

  /**
   *  set a new pattern of times and days to turn the device on / off.
   * @supports BrightSign only
   * @param {Object<TimerConfig>} newTimers see comment in this function for shape of the data.
   */
  updateOnOffTimers: function(newTimers) {
    FWI_App.log('[SHADOW] requesting new set of OnOffTimers...');
    var formattedTimers = [];
    // convert each object to the proper format that the device is expecting.
    newTimers.map(function(timer) {
      // don't modify original timer object.
      var formattedTimer = {};
      formattedTimer.days = FWI_Helper.convertDayofWeekArraytoBitwise(
        timer.days
      );
      formattedTimer.onTime = timer.onTime;
      formattedTimer.offTime = timer.offTime;
      formattedTimers.push(formattedTimer);
    });

    if (
      JSON.stringify(FWI_Helper.formatTimersForDevice(newTimers)) !==
      JSON.stringify(FWI_Hardware.onOffTimers)
    ) {
      // timers are out of sync.
      FWI_Hardware.deleteAllTimers();
      // create new timer set.
      formattedTimers.map(function(timer) {
        FWI_Hardware.createTimerSet(timer.onTime, timer.offTime, timer.days);
      });
      FWI_Shadow.updateShadow();
    }
  },

  /**
   *  set a new pattern of times and days to turn the device on / off FROM THE DEVICE.
   * @supports BrightSign only
   * @param {Object<TimerConfig>} newTimers see comment in this function for shape of the data.
   */
  updateOnOffTimersFromDevice: function() {
    //chances are a timer was just deleted, but to be safe, we're going to upload all timers again and let AWS figure out the delta.
    FWI_App.log(
      '[SHADOW] device modified the set of on / off timers. uploading all timers again'
    );
    var formattedTimers = FWI_Helper.formatTimersForShadow(
      FWI_Hardware.onOffTimers
    );
    FWI_Shadow.mqtt.publish(
      '$aws/things/' + FWI_Provision.id + '/shadow/update',
      JSON.stringify({
        state: {
          reported: {
            OnOffTimers: formattedTimers
          }
        }
      })
    );
  },

  /**
   * set the time of day that the device will reboot.
   * @param {String<Timestamp>} newUpdateTime
   */
  updateRebootTime: function(newRebootTime) {
    var rebootTime = HOST_DEVICE.getSetting('reboot_time');
    if (FWI_Helper.time24to12(newRebootTime) !== rebootTime) {
      FWI_App.log(
        FWI_Helper.time24to12(newRebootTime) + 'is not ' + rebootTime
      );
      FWI_App.log(
        '[SHADOW] requesting to change reboot time to ' + newRebootTime
      );
      newRebootTime = FWI_Helper.time24to12(newRebootTime);
      FWI_Hardware.setRebootTime(newRebootTime);
      FWI_Hardware.resetTimers();
    }
  },

  /**
   *  set the device orientation in degrees.
   * @param {String<unknown>} newRotation
   */
  updateOrientation: function(newRotation) {
    var oldSetting = HOST_DEVICE.getSetting('orientation');
    var normalizedOrientation = 'DEGREE_0';

    switch (newRotation) {
      case '90 Degrees':
      case 90:
      case 'PORTRAIT':
        normalizedOrientation = 'DEGREE_90';
        break;
      case '180 Degrees':
      case 180:
        normalizedOrientation = 'DEGREE_180';
        break;
      case '270 Degrees':
      case 270:
        normalizedOrientation = 'DEGREE_270';
        break;

      case 'LANDSCAPE':
      case 0:
      default:
        normalizedOrientation = 'DEGREE_0';
        break;
    }

    if (normalizedOrientation != oldSetting) {
      HOST_DEVICE.setOrientation(normalizedOrientation, function() {
        FWI_Shadow.updateShadow();
      });
    }
  },

  /**
   * set the software update URL
   * @param {String<URL>} newURL
   */
  updateSoftwareUpdateURL: function(newURL) {
    if (newURL !== HOST_DEVICE.getSetting('software_url')) {
      FWI_App.log(
        '[SHADOW] requesting to change softwareUpdateURL to:' + newURL
      );
      FWI_Software.setSoftwareUrl(newURL);
      FWI_Software.validateSoftwareURL();
    }
  },

  /**
   * set the URL from which the device gets it's time setting
   * @upports BrightSign only
   * @param {String<URL>} timeServerURL
   */
  updateTimeServer: function(timeServerURL) {
    if (
      HOST_DEVICE.isTimeConfigurationSupported() &&
      typeof timeServerURL === 'string'
    ) {
      if (timeServerURL !== HOST_DEVICE.getSetting('time_server')) {
        FWI_App.log(
          '[SHADOW] Requesting to update TimeServer URL to: ' + timeServerURL
        );
        var onSuccess = function() {
          FWI_App.log(
            'Time server set successfully to "' + timeServerURL + '".'
          );
          $('.advanced_time_server_message')
            .parent()
            .removeClass('need_validation')
            .addClass('success')
            .removeClass('icon_fail');
          $('.time_server').val(timeServerURL);
          FWI_Advanced.timeServer = timeServerURL;
          HOST_DEVICE.setSetting('time_server', timeServerURL);
          FWI_Shadow.updateShadow();
        };
        var onError = function(err) {
          FWI_App.log(
            'Unable to set time server to "' +
              timeServerURL +
              '". Error: ' +
              err
          );
          $('.advanced_time_test').prop('disabled', false);
          $('.advanced_time_server_message')
            .parent()
            .removeClass('success')
            .removeClass('need_validation')
            .addClass('icon_fail');
        };
        var timeInfo = { timeServer: timeServerURL };
        HOST_DEVICE.setTimeInfo(timeInfo, onSuccess, onError);
      }
    } else {
      FWI_App.log(
        '[SHADOW] This device does not support Time Configuration',
        'ERROR'
      );
    }
  },

  /**
   * change the device timezon
   * @supports BrightSign only
   * @param {String<TimeZoneString>} newTimeZoneString
   */
  updateTimeZone: function(newTimeZoneString) {
    FWI_App.log(
      '[SHADOW] Requesting to update Time Zone to: ' + newTimeZoneString
    );
    // cloud -> device
    var deviceTimeFmt = FWI_Helper.convertTimeZoneForDevice(newTimeZoneString);
    if (
      deviceTimeFmt !== HOST_DEVICE.getSetting('time_zone') &&
      HOST_DEVICE.isTimeConfigurationSupported()
    ) {
      HOST_DEVICE.setTimeInfo({ timeZone: deviceTimeFmt });
      FWI_Advanced.setTimeZone(deviceTimeFmt);
    }
  },

  /**
   * change the volume on the TV.
   * @supports LG, Samsung
   * @param {Number} newVolume range 0 - 100
   */
  updateVolumeLevel: function(newVolume) {
    HOST_DEVICE.getVolume(function(oldVol) {
      FWI_App.log('[SHADOW] old Volume : ' + oldVol + ', New: ' + newVolume);
      if (oldVol !== newVolume) {
        FWI_App.log('[SHADOW] requesting new device volume: ' + newVolume);
        //volume must in range 0..100
        HOST_DEVICE.setVolume(newVolume);
        // shadow updates from device callback
      }
    });
  },

  /**
   * @param {Boolean} bool
   * @returns
   */
  updateCheckForHardwareUpdate: function(bool) {
    var oldSetting;
    try {
      oldSetting = JSON.parse(
        HOST_DEVICE.getSetting('firmware_updates_enabled')
      );
    } catch (error) {
      oldSetting = false;
      FWI_App.log(
        'tried to get setting firmware_updates_enabled, but it didnt exist. assuming false',
        'WARN'
      );
      HOST_DEVICE.setSetting('firmware_updates_enabled', 'false');
    }

    if (bool != oldSetting) {
      FWI_App.log(
        '[SHADOW] requesting to change Hardware (Firmware) updates to ' + bool
      );

      bool
        ? FWI_Hardware.checkForFirmwareUpdatesEnabled()
        : FWI_Hardware.checkForFirmwareUpdatesDisabled();
    }
  },

  /**
   * updates the UI based on wether or not the device should honor the on/off reboot cycle every night
   * @param {Boolean} bool
   */
  updateWantReboot: function(bool) {
    var oldSetting;
    try {
      oldSetting = JSON.parse(HOST_DEVICE.getSetting('reboot_enabled'));
    } catch (error) {
      oldSetting = false;
      FWI_App.log(
        'tried to get setting reboot_enabled, but it didnt exist. assuming false',
        'WARN'
      );
      HOST_DEVICE.setSetting('reboot_enabled', 'false');
    }
    if (bool !== oldSetting) {
      bool
        ? FWI_Hardware.hardwareRebootEnabled()
        : FWI_Hardware.hardwareRebootDisabled();
    }
  },

  /**
   * updates the base URL used by web player. only relevant for v 5.12+ in use of simple channels.
   * @param {String} newURL the url for web player
   */
  updateWebPlayerURL: function(newURL) {
    if (!!newURL && newURL[newURL.length - 1] !== '/') {
      newURL += '/';
    }

    FWI_Deploy.webPlayerBaseURL = newURL;
    HOST_DEVICE.setSetting('webPlayerBaseURL', newURL, FWI_Shadow.updateShadow);
  },

  updatename: function(newName) {
    FWI_App.deviceName = newName;
    HOST_DEVICE.setSetting('deviceName', newName);
    FWI_App.log('[SHADOW] updating device name to: ' + newName);
  },

  /**
   * update the device's shadow in AWS IoT Core.
   * @param {String} key
   * @param {Any} value
   */
  updateShadow: function() {
    if (FWI_Shadow.online) {
      FWI_Shadow.mqtt.publish(
        '$aws/things/' + FWI_Provision.id + '/shadow/update',
        JSON.stringify({
          state: {
            // desired: payload
            reported: FWI_Shadow._private._getAllSettings()
          }
        })
      );
    } else {
      // FWI_App.log(
      //   '[SHADOW] device is currently offline. Will upload settings when back online.'
      // );
    }
  },

  /**
   * Gets a copy of the device state and saves it to FWI_Shadow.snapshot
   * @return {void}
   */
  getShadow: function() {
    FWI_Shadow.mqtt.publish(
      FWI_Shadow.baseURL + FWI_Provision.id + '/shadow/get',
      JSON.stringify({})
    );
  },

  /**
   * Gathers MQTT messages and decides what we should do with the message in respect to the shadow.
   * @param {String} fullTopic the topic on which a message was received.
   * @param {String<JSON>} message the payload from the MQTT message.
   */
  parseMqttMessage: function(fullTopic, message) {
    FWI_App.log('[SHADOW] MQTT message for shadow recieved on ' + fullTopic);
    // Get only the part of the topic name that matters. e.g "update/delta", "get/accepted"
    var topic = fullTopic.substring(
      fullTopic.indexOf('/shadow/') + 8, // 8 is number of chars in that string
      fullTopic.length
    );

    switch (topic) {
      /* eslint-disable no-console */
      case 'update/delta':
        var tempState = JSON.parse(message).state;
        console.log('[SHADOW] delta state: ', tempState);
        FWI_App.log('[SHADOW] delta state: ' + JSON.stringify(tempState));
        FWI_Shadow._private._handleDelta(tempState);
        break;

      case 'update/documents':
        // console.log('[SHADOW] document: ', JSON.parse(message));
        FWI_Shadow._private._resolveDesiredState(JSON.parse(message));
        break;
      case 'update/accepted':
        break;

      case 'update/rejected':
        var reason = JSON.parse(message);
        FWI_App.log('[SHADOW] REJECTED UPDATE: ' + reason.message, 'WARN');
        if (message.code == 404) {
          console.error(
            'update shadow failed because the shadow does not exist yet. creating one now...'
          );
          FWI_Shadow.createShadow();
          FWI_Shadow.updateShadow();
        }
        break;

      case 'get/accepted':
        FWI_App.log('[SHADOW] saving shadow to FWI_Shadow.snapshot');
        FWI_App.log(JSON.parse(message));
        FWI_Shadow.snapshot = JSON.parse(message);
        break;

      case 'get/rejected':
        if (message.code == 404) {
          console.error('shadow does not exist yet. creating one now...');
          FWI_Shadow.createShadow();
        } else {
          FWI_App.log(
            '[SHADOW] REJECTED UPDATE ' + JSON.parse(message).message,
            'WARN'
          );
        }
        break;

      default:
        FWI_App.log(
          '[SHADOW] Uncaught case "' + topic + '" parsing MQTT MESSAGE',
          'WARN'
        );
        FWI_App.log('[SHADOW]' + JSON.parse(message), 'DEBUG');
        break;
      /* eslint-enable no-console */
    }
  }
};
