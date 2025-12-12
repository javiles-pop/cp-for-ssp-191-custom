var FWI_Monitoring = {
  // Helper function for consistent monitoring logging
  logDebug: function(message, level) {
    var logLevel = level || 'DEBUG';
    FWI_App.log('[MONITORING] ' + message, logLevel);
  },
  
  // Debug function to check current monitoring status
  debugStatus: function() {
    this.logDebug('=== MONITORING DEBUG STATUS ===', 'INFO');
    this.logDebug('Status Enabled: ' + this.monStatusEnabled, 'INFO');
    this.logDebug('Status Interval: ' + (this.monStatusTime || 'Not set') + ' (' + this.monStatusTimeSeconds + ' seconds)', 'INFO');
    this.logDebug('Player ID: ' + (FWI_Deploy.playerID || 'Not set'), 'INFO');
    this.logDebug('Advanced Services Enabled: ' + (FWI_Advanced.advEnabled || false), 'INFO');
    this.logDebug('Advanced Host: ' + (FWI_Advanced.advHost || 'Not set'), 'INFO');
    this.logDebug('Advanced Company: ' + (FWI_Advanced.advComp || 'Not set'), 'INFO');
    this.logDebug('Advanced User: ' + (FWI_Advanced.advUser || 'Not set'), 'INFO');
    this.logDebug('Device IP: ' + (FWI_Hardware.IP || 'Not available'), 'INFO');
    this.logDebug('Device MAC: ' + (FWI_Hardware.MAC || 'Not available'), 'INFO');
    this.logDebug('Device Serial: ' + (FWI_Hardware.Serial || 'Not available'), 'INFO');
    this.logDebug('Last Status Upload: ' + (this.monStatusTimestamp || 'Never'), 'INFO');
    this.logDebug('=== END DEBUG STATUS ===', 'INFO');
    
    // Check prerequisites and provide guidance
    if (!FWI_Advanced.advEnabled) {
      this.logDebug('ISSUE: FWI Services are not enabled. Go to Advanced tab and configure FWI Services.', 'WARN');
    }
    if (!FWI_Advanced.advHost) {
      this.logDebug('ISSUE: FWI Services host URL not configured.', 'WARN');
    }
    if (!FWI_Deploy.playerID) {
      this.logDebug('ISSUE: Player ID not available. This is needed for status uploads.', 'WARN');
    }
    if (!this.monStatusEnabled) {
      this.logDebug('ISSUE: Status monitoring is not enabled in the Monitoring tab.', 'WARN');
    }
  },
  
  // Helper function to enable monitoring for testing
  enableMonitoringForTesting: function() {
    this.logDebug('Attempting to enable monitoring for testing...', 'INFO');
    
    if (!FWI_Advanced.advEnabled) {
      this.logDebug('Cannot enable monitoring - FWI Services must be configured first', 'ERROR');
      this.logDebug('Please go to Advanced tab and set up FWI Services credentials', 'ERROR');
      return false;
    }
    
    // Enable status monitoring with a 30-second interval for testing
    this.enableStatus();
    this.setStatusTime('00:00:30');
    
    this.logDebug('Monitoring enabled for testing with 30-second interval', 'INFO');
    return true;
  },
  
  // Comprehensive test function
  testMonitoringSystem: function() {
    this.logDebug('=== COMPREHENSIVE MONITORING SYSTEM TEST ===', 'INFO');
    
    // Test 1: Check Services Configuration
    this.logDebug('TEST 1: Services Configuration', 'INFO');
    this.logDebug('- Advanced Enabled: ' + (FWI_Advanced.advEnabled || false), 'INFO');
    this.logDebug('- Advanced Host: ' + (FWI_Advanced.advHost || 'NOT SET'), 'INFO');
    this.logDebug('- Advanced Company: ' + (FWI_Advanced.advComp || 'NOT SET'), 'INFO');
    this.logDebug('- Advanced User: ' + (FWI_Advanced.advUser || 'NOT SET'), 'INFO');
    this.logDebug('- Player ID: ' + (FWI_Deploy.playerID || 'NOT SET'), 'INFO');
    
    // Test 2: Check UI Elements
    this.logDebug('TEST 2: UI Elements Availability', 'INFO');
    var logsCheckbox = $('input#monitor_logs_daily_enable');
    var statusCheckbox = $('input#monitor_status_enable');
    var screenshotCheckbox = $('input#monitor_screenshot_enable');
    
    this.logDebug('- Logs checkbox found: ' + (logsCheckbox.length > 0 ? 'YES' : 'NO'), 'INFO');
    this.logDebug('- Status checkbox found: ' + (statusCheckbox.length > 0 ? 'YES' : 'NO'), 'INFO');
    this.logDebug('- Screenshot checkbox found: ' + (screenshotCheckbox.length > 0 ? 'YES' : 'NO'), 'INFO');
    
    // Test 3: Check Current Tab
    this.logDebug('TEST 3: Current Tab Status', 'INFO');
    var monitoringTab = $('.setting_monitoring');
    var isVisible = monitoringTab.is(':visible');
    this.logDebug('- Monitoring tab visible: ' + (isVisible ? 'YES' : 'NO'), 'INFO');
    this.logDebug('- Current screen: ' + (FWI_App.currentScreen || 'UNKNOWN'), 'INFO');
    this.logDebug('- Current setting: ' + (FWI_Settings.currentSetting || 'UNKNOWN'), 'INFO');
    
    // Test 4: Manual UI Test
    this.logDebug('TEST 4: Manual UI Interaction Test', 'INFO');
    if (statusCheckbox.length > 0) {
      var wasChecked = statusCheckbox.is(':checked');
      this.logDebug('- Status checkbox current state: ' + (wasChecked ? 'CHECKED' : 'UNCHECKED'), 'INFO');
      
      // Try to trigger change event
      this.logDebug('- Attempting to trigger change event...', 'INFO');
      statusCheckbox.trigger('change');
      this.logDebug('- Change event triggered', 'INFO');
    } else {
      this.logDebug('- Cannot test UI - status checkbox not found', 'ERROR');
    }
    
    // Test 5: Force Rebind
    this.logDebug('TEST 5: Force Rebinding Elements', 'INFO');
    this.bindMonitoringElements();
    this.logDebug('- Rebinding completed', 'INFO');
    
    this.logDebug('=== END MONITORING SYSTEM TEST ===', 'INFO');
    
    // Return summary
    return {
      servicesEnabled: FWI_Advanced.advEnabled,
      playerID: FWI_Deploy.playerID,
      uiElementsFound: logsCheckbox.length + statusCheckbox.length + screenshotCheckbox.length,
      monitoringTabVisible: isVisible
    };
  },
  
  monLogsEnabled: false,
  monLogsTime: '12:00 AM', // Contains the start time for the logs upload window.
  monLogsTime2: '04:00 AM', // Contains the end time for the logs upload window.
  monLogsTimestamp: null,

  monStatusEnabled: false,
  monStatusTime: null,
  monStatusTimeSeconds: 0,
  monStatusTimestamp: null,

  monScreenshotEnabled: false,
  monScreenshotQuality: null,
  monScreenshotTime: null,
  monScreenshotTimeSeconds: 0,
  monScreenshotTimestamp: null,

  // Summary: Encodes reserved XML characters in the given text and returns the result.
  encodeXml: function(text) {
    if (text === null || text === undefined) {
      return '';
    }
    return text.toString().replace(/[<>&'"]/g, function(c) {
      switch (c) {
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '&':
          return '&amp;';
        case "'":
          return '&apos;';
        case '"':
          return '&quot;';
      }
    });
  },

  /* Enable Monitoring / Generate/Update Player ID */
  allowMonitoring: function() {
    FWI_App.log('Enabling monitoring functionality', 'INFO');
    $('.settings_scroll.wrap_advanced .require_advanced')
      .prop('disabled', false)
      .removeAttr('disabled');
    $('.monitor_disabled').hide();
    FWI_Monitoring.getPlayerID();
    FWI_App.log('Monitoring Tab Enabled', 'INFO');
    FWI_Scheduler.monitorLog('ON');
  },
  /* Disable Monitoring */
  disallowMonitoring: function() {
    FWI_App.log('Disabling monitoring functionality', 'INFO');
    $('.settings_scroll.wrap_advanced .require_advanced')
      .attr('disabled', '')
      .prop('disabled', true);
    $('.monitor_disabled').show();
    FWI_App.log('Monitoring Tab Disabled', 'INFO');
    FWI_Scheduler.monitorLog('OFF');
  },

  /* Get player public ID for screenshot uploads, FWI Rest call */
  getPlayerID: function() {
    FWI_App.log('Starting getPlayerID process', 'INFO');
    
    // FIXME: Verify this doesn't break SSSP
    // BrightSign
    // if (FWI_Advanced.advHost && FWI_Hardware.MAC) {
    // SSSP
    // if (FWI_Deploy.deployId && FWI_Advanced.advHost) {
    if (FWI_Advanced.advHost) {
      FWI_App.log('Advanced host configured: ' + FWI_Advanced.advHost, 'DEBUG');
      FWI_App.log('Building authentication for player ID request', 'DEBUG');
      var userpass = btoa(
        FWI_Advanced.advComp +
          '\\' +
          FWI_Advanced.advUser +
          ':' +
          FWI_Advanced.advPass
      );
      /* CREATE OR UPDATE PLAYER NAME */
      var url;
      var host = FWI_Advanced.advHost;

      if (host.match(/\/$/)) {
        url = host + 'players/';
      } else {
        url = host + '/players/';
      }
      
      FWI_App.log('Player ID request URL: ' + url, 'DEBUG');
      // /players/id/status
      /* IF this is set, update  */
      var sendHeaders = {
        Accept: 'application/json',
        Authorization: 'Basic ' + userpass
      };

      if (FWI_Deploy.playerID) {
        FWI_App.log('Existing player ID found: ' + FWI_Deploy.playerID, 'DEBUG');
        sendHeaders.playerpublicid = FWI_Deploy.playerID;
      } else {
        FWI_App.log('No existing player ID, will create new one', 'DEBUG');
      }

      var sendData = {
        Name: FWI_Provision.id,
        InstallGuid: null,
        TimeZoneId: 'Mountain Standard Time',
        PlayerPlatformId: HOST_DEVICE.getPlayerPlatformId(),
        DeviceProfiles: [
          {
            ProfileName: '',
            DeploymentId: FWI_Deploy.deployId ? FWI_Deploy.deployId : ''
          }
        ]
      };
      var url1 =
        url +
        '?name=' +
        encodeURIComponent(HOST_DEVICE.serialNumber) +
        '&format=json';

      $.ajax({
        type: 'POST',
        url: url1,
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(sendData),
        dataType: 'json',
        headers: sendHeaders,
        success: function(data, textStatus, xhr) {
          try {
            FWI_App.log('Player ID request successful - HTTP Status: ' + xhr.status, 'INFO');
            FWI_App.log('Player ID response data: ' + JSON.stringify(data), 'DEBUG');
            
            var pubID = data.PublicId;
            
            if (pubID) {
              FWI_Deploy.playerID = pubID;
              HOST_DEVICE.setSetting('player_id', pubID);
              FWI_App.log('Player ID successfully set/updated: ' + pubID, 'INFO');
            } else {
              FWI_App.log('No PublicId found in response data', 'ERROR');
            }
          } catch (err) {
            FWI_App.log('Error processing player ID response: ' + JSON.stringify(err), 'ERROR');
          }
        },
        error: function(jqXHR, textStatus, errorThrown) {
          var errorMsg = 'Player ID request failed - Status: ' + textStatus + ', Error: ' + errorThrown;
          if (jqXHR.status) {
            errorMsg += ', HTTP Status: ' + jqXHR.status;
          }
          if (jqXHR.responseText) {
            errorMsg += ', Response: ' + jqXHR.responseText.substring(0, 200);
          }
          FWI_App.log(errorMsg, 'ERROR');
          
          FWI_App.log('Player ID request URL was: ' + url1, 'ERROR');
          FWI_App.log('Check network connectivity and FWI Services configuration', 'WARN');
        }
      });
    } else {
      FWI_App.log(
        'Cannot get Player ID - Services not enabled. Deployment ID: ' +
          (FWI_Deploy.deployId || 'N/A') +
          ', Services URL: ' +
          (FWI_Advanced.advHost || 'N/A') +
          ', Advanced Enabled: ' +
          (FWI_Advanced.advEnabled || false),
        'WARN'
      );
    }
  },

  resetTimers: function() {
    /* Remove validation errors, fill last validated time */
    $('.setting_adv_logs .time_picker input').removeClass('unfocus_error');
    if (this.monLogsTime && this.monLogsTime.length === 8) {
      $('.setting_adv_logs input[name="monitor_logs1_hour1"]').val(
        this.monLogsTime.charAt(0)
      );
      $('.setting_adv_logs input[name="monitor_logs1_hour2"]').val(
        this.monLogsTime.charAt(1)
      );
      $('.setting_adv_logs input[name="monitor_logs1_minute1"]').val(
        this.monLogsTime.charAt(3)
      );
      $('.setting_adv_logs input[name="monitor_logs1_minute2"]').val(
        this.monLogsTime.charAt(4)
      );
      $('.setting_adv_logs input[name="monitor_logs1_ampm"]').prop(
        'checked',
        this.monLogsTime.charAt(6) === 'P'
      );
    }

    if (this.monLogsTime2 && this.monLogsTime2.length === 8) {
      $('.setting_adv_logs input[name="monitor_logs2_hour1"]').val(
        this.monLogsTime2.charAt(0)
      );
      $('.setting_adv_logs input[name="monitor_logs2_hour2"]').val(
        this.monLogsTime2.charAt(1)
      );
      $('.setting_adv_logs input[name="monitor_logs2_minute1"]').val(
        this.monLogsTime2.charAt(3)
      );
      $('.setting_adv_logs input[name="monitor_logs2_minute2"]').val(
        this.monLogsTime2.charAt(4)
      );
      $('.setting_adv_logs input[name="monitor_logs2_ampm"]').prop(
        'checked',
        this.monLogsTime2.charAt(6) === 'P'
      );
    }

    $('.setting_adv_status .time_picker input').removeClass('unfocus_error');
    if (this.monStatusTime && this.monStatusTime.length === 8) {
      $('.setting_adv_status input[name="monitor_status_hour1"]').val(
        this.monStatusTime.charAt(0)
      );
      $('.setting_adv_status input[name="monitor_status_hour2"]').val(
        this.monStatusTime.charAt(1)
      );
      $('.setting_adv_status input[name="monitor_status_minute1"]').val(
        this.monStatusTime.charAt(3)
      );
      $('.setting_adv_status input[name="monitor_status_minute2"]').val(
        this.monStatusTime.charAt(4)
      );
      $('.setting_adv_status input[name="monitor_status_second1"]').val(
        this.monStatusTime.charAt(6)
      );
      $('.setting_adv_status input[name="monitor_status_second2"]').val(
        this.monStatusTime.charAt(7)
      );
    }

    $('.setting_adv_screenshot .time_picker input').removeClass(
      'unfocus_error'
    );
    if (this.monScreenshotTime && this.monScreenshotTime.length === 8) {
      $('.setting_adv_screenshot input[name="monitor_screenshot_hour1"]').val(
        this.monScreenshotTime.charAt(0)
      );
      $('.setting_adv_screenshot input[name="monitor_screenshot_hour2"]').val(
        this.monScreenshotTime.charAt(1)
      );
      $('.setting_adv_screenshot input[name="monitor_screenshot_minute1"]').val(
        this.monScreenshotTime.charAt(3)
      );
      $('.setting_adv_screenshot input[name="monitor_screenshot_minute2"]').val(
        this.monScreenshotTime.charAt(4)
      );
      $('.setting_adv_screenshot input[name="monitor_screenshot_second1"]').val(
        this.monScreenshotTime.charAt(6)
      );
      $('.setting_adv_screenshot input[name="monitor_screenshot_second2"]').val(
        this.monScreenshotTime.charAt(7)
      );
    }
  },

  /* Monitor Logs */
  enableLogs: function() {
    $('.setting_adv_logs .require_enable')
      .prop('disabled', false)
      .removeAttr('disabled');
    $('input#monitor_logs_daily_enable')
      .prop('checked', true)
      .closest('label')
      .addClass('checkbox_label_checked');
    FWI_Monitoring.monLogsEnabled = true;
    HOST_DEVICE.setSetting('mon_logs_enabled', true.toString());
    FWI_Scheduler.monitorLog('ON');

    FWI_App.log('Enabled log uploads.', 'DEBUG');
  },

  disableLogs: function() {
    $('.setting_adv_logs .require_enable')
      .attr('disabled', '')
      .prop('disabled', true);
    $('input#monitor_logs_daily_enable')
      .prop('checked', false)
      .closest('label')
      .removeClass('checkbox_label_checked');
    FWI_Monitoring.monLogsEnabled = false;
    HOST_DEVICE.setSetting('mon_logs_enabled', false.toString());
    FWI_Scheduler.monitorLog('OFF');

    FWI_App.log('Disabled log uploads.', 'DEBUG');
  },

  /* Local Set time */
  setLogsTime: function(beginEnd, time) {
    if (beginEnd === 'begin') {
      FWI_App.log(
        'Setting log upload window start time to ' + time + '.',
        'DEBUG'
      );
      FWI_Monitoring.monLogsTime = time;
      HOST_DEVICE.setSetting('mon_logs_time', time);
    } else if (beginEnd === 'end') {
      FWI_App.log(
        'Setting log upload window end time to ' + time + '.',
        'DEBUG'
      );
      FWI_Monitoring.monLogsTime2 = time;
      HOST_DEVICE.setSetting('mon_logs_time2', time);
    }

    if (FWI_Monitoring.monLogsTime && FWI_Monitoring.monLogsTime2) {
      FWI_Scheduler.monitorLog(FWI_Monitoring.monLogsEnabled ? 'ON' : 'OFF');
    }
  },
  /* Set message */
  setLogsMsg: function(msg, status) {
    if (msg) {
      $('.log_timestamp').hide();
      $('.logs_up_message').css('display', 'table-cell');
      if (status === 'success') {
        $('.logs_up_message')
          .html(msg)
          .closest('.status_msg')
          .removeClass('error')
          .addClass('success');
        /* Remove after 7sec */
        setTimeout(function() {
          $('.logs_up_message')
            .html('')
            .hide();
          $('.log_timestamp').fadeIn();
        }, 7000);
      } else {
        $('.logs_up_message')
          .html(msg)
          .closest('.status_msg')
          .removeClass('success')
          .addClass('error');
      }
    }
  },
  /* Upload Logs, Scap callback calls uploadLogsEnd, FWI Services Soap */
  uploadLogsStart: function(onSuccess, onError) {
    $('.monitor_logs_daily_upload').prop('disabled', true);

    if (!FWI_Scheduler.logsWriting) {
      FWI_App.log('Starting log upload process.');
      HOST_DEVICE.uploadLogs(
        function() {
          FWI_Monitoring.resetLogUpload();
          // Send message to embedded player to upload its logs as well
          // if applicable.
          var message = {
            command: 'uploadLogs'
          };

          FWI_App.postPlayerMessage(message);

          if (onSuccess) {
            onSuccess();
          }
        },
        function(error) {
          FWI_Monitoring.resetLogUpload();
          onError && onError(error);
        }
      );
    } else {
      FWI_App.log('Waiting to upload until logs are finished writing');
      // Try again after a short while.
      setTimeout(function() {
        FWI_Monitoring.uploadLogsStart(onSuccess, onError);
      }, 1000);
    }
  },

  resetLogUpload: function() {
    HOST_DEVICE.logsReading = false;
    $('.monitor_logs_daily_upload').prop('disabled', false);
  },

  /* Monitor Status */
  enableStatus: function() {
    FWI_App.log('Enabling status monitoring', 'INFO');
    $('.setting_adv_status .require_enable')
      .prop('disabled', false)
      .removeAttr('disabled');
    $('input#monitor_status_enable')
      .prop('checked', true)
      .closest('label')
      .addClass('checkbox_label_checked');
    FWI_Monitoring.monStatusEnabled = true;
    HOST_DEVICE.setSetting('mon_status_enabled', true.toString());
    FWI_Scheduler.monitorStatus('ON');

    FWI_App.log('Status monitoring enabled successfully - Interval: ' + (FWI_Monitoring.monStatusTimeSeconds || 'Not set') + ' seconds', 'INFO');
  },

  disableStatus: function() {
    FWI_App.log('Disabling status monitoring', 'INFO');
    $('.setting_adv_status .require_enable')
      .attr('disabled', '')
      .prop('disabled', true);
    $('input#monitor_status_enable')
      .prop('checked', false)
      .closest('label')
      .removeClass('checkbox_label_checked');
    FWI_Monitoring.monStatusEnabled = false;
    HOST_DEVICE.setSetting('mon_status_enabled', false.toString());
    FWI_Scheduler.monitorStatus('OFF');

    FWI_App.log('Status monitoring disabled successfully', 'INFO');
  },
  /* Set time local */
  setStatusTime: function(time) {
    FWI_Monitoring.monStatusTime = time;
    HOST_DEVICE.setSetting('mon_status_time', time ? time.toString() : null);

    var seconds = FWI_Helper.hourMinSecToSeconds(time);
    FWI_Monitoring.monStatusTimeSeconds = seconds;

    FWI_App.log('Status Interval Set: ' + seconds);
    FWI_Scheduler.monitorStatus('ON');
  },
  /* Set Time For RemoteCMD */
  setStatusTimeUpdNum: function(time) {
    $('.setting_adv_status input[name="monitor_status_hour1"]').val(
      time.charAt(0)
    );
    $('.setting_adv_status input[name="monitor_status_hour2"]').val(
      time.charAt(1)
    );
    $('.setting_adv_status input[name="monitor_status_minute1"]').val(
      time.charAt(3)
    );
    $('.setting_adv_status input[name="monitor_status_minute2"]').val(
      time.charAt(4)
    );
    $('.setting_adv_status input[name="monitor_status_second1"]').val(
      time.charAt(6)
    );
    $('.setting_adv_status input[name="monitor_status_second2"]').val(
      time.charAt(7)
    );
    FWI_Monitoring.monStatusTime = time;
    HOST_DEVICE.setSetting('mon_status_time', time ? time.toString() : null);

    var seconds = FWI_Helper.hourMinSecToSeconds(time);

    FWI_Monitoring.monStatusTimeSeconds = seconds;

    FWI_App.log('Status Interval Set: ' + seconds);
    FWI_Scheduler.monitorStatus('ON');
  },
  /* Set message */
  setStatusMsg: function(msg, status) {
    if (msg) {
      $('.status_timestamp').hide();
      $('.status_up_message').css('display', 'table-cell');
      if (status === 'success') {
        $('.status_up_message')
          .html(msg)
          .closest('.status_msg')
          .removeClass('error')
          .addClass('success');
        /* Remove after 7sec */
        setTimeout(function() {
          $('.status_up_message')
            .html('')
            .hide();
          $('.status_timestamp').fadeIn();
        }, 7000);
      } else {
        $('.status_up_message')
          .html(msg)
          .closest('.status_msg')
          .removeClass('success')
          .addClass('error');
      }
    }
  },
  /* Upload status to FWI Services Rest */
  uploadStatus: function() {
    FWI_App.log('Starting device status upload process', 'INFO');
    $('.monitor_status_upload').prop('disabled', true);
    
    // Validate prerequisites
    if (!FWI_Advanced.advEnabled) {
      FWI_App.log('Status upload failed: FWI Services not enabled', 'ERROR');
      FWI_Monitoring.setStatusMsg('FWI Services not enabled', 'error');
      $('.monitor_status_upload').prop('disabled', false);
      return;
    }
    
    if (!FWI_Deploy.playerID) {
      FWI_App.log('Status upload failed: Player ID not available', 'ERROR');
      FWI_Monitoring.setStatusMsg('Player ID not available', 'error');
      $('.monitor_status_upload').prop('disabled', false);
      return;
    }
    
    FWI_App.log('Prerequisites validated - Player ID: ' + FWI_Deploy.playerID, 'DEBUG');
    
    // Get Volume
    HOST_DEVICE.getVolume(function(volume) {
      FWI_App.log('Retrieved device volume: ' + volume, 'DEBUG');
      FWI_App.log('Building authentication and URL for status upload', 'DEBUG');
      
      var userpass = btoa(
        FWI_Advanced.advComp +
          '\\' +
          FWI_Advanced.advUser +
          ':' +
          FWI_Advanced.advPass
      );
      var host = FWI_Advanced.advHost;
      var url;

      if (!host.match(/\/$/)) {
        host = host + '/';
      }

      url = host + 'players/' + FWI_Deploy.playerID + '/status';
      
      FWI_App.log('Status upload URL: ' + url, 'DEBUG');
      FWI_App.log('Using host: ' + host, 'DEBUG');
      FWI_App.log('Authentication configured for company: ' + FWI_Advanced.advComp + ', user: ' + FWI_Advanced.advUser, 'DEBUG');
      // url = host + 'players/' + HOST_DEVICE.getSerial() + '/status';

      // Set default value of certain dynamic properties that may change at any time.
      var isDisplayPoweredOn = true;
      var isDisplayConnected = true;
      var displayPort = 'HDMI'; // Default value.
      var displayType = '';
      // Summary: Called when we are ready to post the current status.
      var onReady = $.proxy(function() {
        FWI_App.log('Preparing status XML payload', 'DEBUG');
        
        var statusXml = '<?xml version="1.0" encoding="utf-8"?>' +
            '<SignageStatus>' +
            '<IsRunning>true</IsRunning>' +
            '<IdRaw>' +
            FWI_Monitoring.encodeXml(
              FWI_Deploy.deployId ? FWI_Deploy.deployId : ''
            ) +
            '</IdRaw>' +
            '<HostName>' +
            // FIXME: Should this be FWI_Provision.id?
            FWI_Monitoring.encodeXml(
              FWI_Hardware.Serial ? FWI_Hardware.Serial : ''
            ) +
            '</HostName>' +
            '<IpAddress>' +
            FWI_Monitoring.encodeXml(FWI_Hardware.IP ? FWI_Hardware.IP : '') +
            '</IpAddress>' +
            '<MacAddress>' +
            FWI_Monitoring.encodeXml(FWI_Hardware.MAC ? FWI_Hardware.MAC : '') +
            '</MacAddress>' +
            '<PlayerPlatform>' +
            FWI_Monitoring.encodeXml(HOST_DEVICE.getPlatform()) +
            '</PlayerPlatform>' +
            '<Version>' +
            FWI_Monitoring.encodeXml('1.9.1') +
            '</Version>' +
            '<DeviceDescription>' +
            FWI_Monitoring.encodeXml(navigator.userAgent) +
            '</DeviceDescription>' +
            (FWI_Deploy._deploymentReceived
              ? '<RemoteDeploymentLastDeploymentTime>' +
                FWI_Monitoring.encodeXml(
                  FWI_Deploy._deploymentReceived.toISOString()
                ) +
                '</RemoteDeploymentLastDeploymentTime>'
              : '') +
            '<AccessCode>' +
            FWI_Monitoring.encodeXml(
              FWI_Software.accessCode ? FWI_Software.accessCode : ''
            ) +
            '</AccessCode>' +
            '<UseFwiServices>' +
            FWI_Monitoring.encodeXml(FWI_Advanced.advEnabled ? '1' : '0') +
            '</UseFwiServices>' +
            '<FwiServicesConnectionProperties>' +
            '<Hostname>' +
            FWI_Monitoring.encodeXml(FWI_Advanced.advHost) +
            '</Hostname>' +
            '<Username>' +
            FWI_Monitoring.encodeXml(
              FWI_Advanced.advComp + '/' + FWI_Advanced.advUser
            ) +
            '</Username>' +
            '<Protocol>Fwi</Protocol>' +
            '</FwiServicesConnectionProperties>' +
            '<VolumeLevel>' +
            (typeof volume === 'number' ? volume : 0).toString() + // Volume is not supported by all devices.
            '</VolumeLevel>' +
            '<Orientation>' +
            FWI_Monitoring.encodeXml(HOST_DEVICE.orientation) +
            '</Orientation>' +
            (FWI_Deploy.storageURL
              ? '<ActiveChannelId>' +
                FWI_Monitoring.encodeXml(
                  FWI_Helper.removeQueryParam(
                    'v',
                    FWI_Helper.removeQueryParam(
                      '_fwi_accessToken',
                      FWI_Helper.removeQueryParam(
                        '_fwi_cloudCompanyId',
                        FWI_Deploy.storageURL
                      )
                    )
                  )
                ) +
                '</ActiveChannelId>'
              : '') +
            (FWI_Deploy.playerUrlChanged
              ? '<WhenActiveChannelChanged>' +
                FWI_Monitoring.encodeXml(FWI_Deploy.playerUrlChanged) +
                '</WhenActiveChannelChanged>'
              : '') +
            '<WantSendLogs>' +
            (FWI_Monitoring.monLogsEnabled
              ? true.toString()
              : false.toString()) +
            '</WantSendLogs>' +
            // Reboot.
            '<WantReboot>' +
            (FWI_Hardware.rebootEnabled ? true : false).toString() +
            '</WantReboot>' +
            (FWI_Hardware.rebootTime
              ? '<RebootTime>' +
                FWI_Monitoring.encodeXml(
                  FWI_Helper.time12toIsoLocal(FWI_Hardware.rebootTime)
                ) +
                '</RebootTime>'
              : '') +
            // Display.
            '<IsDisplayConnected>' +
            (isDisplayConnected ? true : false).toString() +
            '</IsDisplayConnected>' +
            '<IsDisplayPoweredOn>' +
            (isDisplayPoweredOn ? true : false).toString() +
            '</IsDisplayPoweredOn>' +
            '<DisplayType>' +
            FWI_Monitoring.encodeXml(displayType) +
            '</DisplayType>' +
            '<DisplayPort>' +
            FWI_Monitoring.encodeXml(displayPort) +
            '</DisplayPort>' +
            '<IsDisplayPowerManaged>' +
            (FWI_Hardware.onOffTimersEnabled &&
            FWI_Hardware.onOffTimers.length > 0
              ? true
              : false
            ).toString() +
            '</IsDisplayPowerManaged>' +
            // Screenshot.
            '<ScreenshotIntervalTicks>' +
            FWI_Helper.secondsToTicks(
              FWI_Monitoring.monScreenshotTimeSeconds
                ? FWI_Monitoring.monScreenshotTimeSeconds
                : 0
            ) +
            '</ScreenshotIntervalTicks>' +
            '<WantSendScreenshot>' +
            FWI_Monitoring.encodeXml(
              (FWI_Monitoring.monScreenshotEnabled ? true : false).toString()
            ) +
            '</WantSendScreenshot>' +
            '<IsScreenshotLogged>' +
            FWI_Monitoring.encodeXml(
              (FWI_Monitoring.monScreenshotEnabled ? true : false).toString()
            ) +
            '</IsScreenshotLogged>' +
            // Status.
            '<WhenUpdated>' +
            FWI_Monitoring.encodeXml(FWI_Helper.getDateIsoStr()) +
            '</WhenUpdated>' +
            '<WantSendStatus>' +
            FWI_Monitoring.encodeXml(
              FWI_Monitoring.monStatusEnabled
                ? true.toString()
                : false.toString()
            ) +
            '</WantSendStatus>' +
            '<SendStatusIntervalTicks>' +
            FWI_Helper.secondsToTicks(
              FWI_Monitoring.monStatusTimeSeconds
                ? FWI_Monitoring.monStatusTimeSeconds
                : 0
            ) +
            '</SendStatusIntervalTicks>' +
            // Software update.
            '<WantCheckForSoftwareUpdate>' +
            (FWI_Software.softwareUpdatesTime &&
            FWI_Software.softwareUpdatesEnabled
              ? true
              : false
            ).toString() +
            '</WantCheckForSoftwareUpdate>' +
            (FWI_Software.softwareUpdatesTime
              ? '<CheckForSoftwareUpdateTime>' +
                FWI_Monitoring.encodeXml(
                  FWI_Helper.time12toIso0000Offset(
                    FWI_Software.softwareUpdatesTime
                  )
                ) +
                '</CheckForSoftwareUpdateTime>'
              : '') +
            '<SoftwareUpdateConnectionProperties>' +
            '<Path>' +
            (FWI_Software.softwareUrl
              ? FWI_Monitoring.encodeXml(FWI_Software.softwareUrl)
              : '') +
            '</Path>' +
            '</SoftwareUpdateConnectionProperties>' +
            (FWI_Software.softwareUpdateDateTime
              ? '<WhenSoftwareUpdateLastChecked>' +
                FWI_Monitoring.encodeXml(FWI_Software.softwareUpdateDateTime) +
                '</WhenSoftwareUpdateLastChecked>'
              : '') +
            '</SignageStatus>';
        
        FWI_App.log('Status XML payload length: ' + statusXml.length + ' characters', 'DEBUG');
        FWI_App.log('Key status data - IP: ' + (FWI_Hardware.IP || 'N/A') + ', MAC: ' + (FWI_Hardware.MAC || 'N/A') + ', Serial: ' + (FWI_Hardware.Serial || 'N/A'), 'INFO');
        
        FWI_App.log('Initiating AJAX request to upload status', 'INFO');
        
        $.ajax({
          type: 'POST',
          url: url,
          contentType: 'text/xml; charset=utf-8',
          timeout: 30000,
          headers: {
            Authorization: 'Basic ' + userpass
          },
          data: statusXml,
          beforeSend: function(xhr, settings) {
            FWI_App.log('AJAX request about to be sent - URL: ' + settings.url, 'DEBUG');
            FWI_App.log('Request headers: ' + JSON.stringify(xhr.getAllResponseHeaders ? 'Available' : 'Not available'), 'DEBUG');
          },
          success: function(data, textStatus, xhr) {
            FWI_App.log('Status upload successful - HTTP Status: ' + xhr.status, 'INFO');
            FWI_App.log('Response data: ' + (data ? JSON.stringify(data).substring(0, 200) : 'No response data'), 'DEBUG');
            FWI_Monitoring.setStatusMsg('Status Uploaded!', 'success');
            FWI_Monitoring.monStatusTimestamp = FWI_Helper.getTimestamp();
            HOST_DEVICE.setSetting(
              'mon_status_timestamp',
              FWI_Monitoring.monStatusTimestamp
            );
            $('.status_timestamp').html(FWI_Monitoring.monStatusTimestamp);
            $('.monitor_status_upload').prop('disabled', false);
          },
          error: function(xhr, textStatus, errorThrown) {
            var errorMsg = 'Status upload failed - Status: ' + textStatus + ', Error: ' + errorThrown;
            if (xhr.status) {
              errorMsg += ', HTTP Status: ' + xhr.status;
            }
            if (xhr.responseText) {
              errorMsg += ', Response: ' + xhr.responseText.substring(0, 200);
            }
            FWI_App.log(errorMsg, 'ERROR');
            
            // Log additional debugging information
            FWI_App.log('Request URL was: ' + url, 'ERROR');
            FWI_App.log('Network connectivity check needed', 'WARN');
            
            FWI_Monitoring.setStatusMsg('Upload Failed: ' + textStatus, 'error');
            $('.monitor_status_upload').prop('disabled', false);
          }
        });
      }, this);
      // Get current status of certain dynamic properties.
      var onDisplayStatusSuccess = function(displayStatus) {
        FWI_App.log('Display status retrieved - Connected: ' + displayStatus.connected + ', Powered: ' + displayStatus.poweredOn + ', Port: ' + displayStatus.port, 'DEBUG');
        isDisplayPoweredOn = displayStatus.poweredOn;
        isDisplayConnected = displayStatus.connected;
        displayPort = displayStatus.port;
        displayType = displayStatus.type;
        onReady();
      };
      var onDisplayStatusError = function(error) {
        FWI_App.log('Failed to get display status, using defaults - Error: ' + (error || 'Unknown'), 'WARN');
        // Ignore error and use default value.
        onReady();
      };
      // Update certain properties to latest status before posting status document.
      FWI_App.log('Retrieving display status before upload', 'DEBUG');
      HOST_DEVICE.getDisplayStatus(
        onDisplayStatusSuccess,
        onDisplayStatusError
      );
    }, function(error) {
      FWI_App.log('Failed to get device volume - Error: ' + (error || 'Unknown'), 'WARN');
      FWI_Monitoring.setStatusMsg('Failed to get device info', 'error');
      $('.monitor_status_upload').prop('disabled', false);
    });
  },

  /* Monitor Screenshot */
  enableScreenshot: function() {
    $('.setting_adv_screenshot .require_enable')
      .prop('disabled', false)
      .removeAttr('disabled');
    $('input#monitor_screenshot_enable')
      .prop('checked', true)
      .closest('label')
      .addClass('checkbox_label_checked');
    FWI_Monitoring.monScreenshotEnabled = true;
    HOST_DEVICE.setSetting('mon_screenshot_enabled', true.toString());
    FWI_Monitoring.monScreenshotQuality = 'HD';
    HOST_DEVICE.setSetting('mon_screenshot_quality', 'HD');
    FWI_Scheduler.monitorScreenshot('ON');

    FWI_App.log('Monitoring enableScreenshot - Success');
  },

  disableScreenshot: function() {
    $('.setting_adv_screenshot .require_enable')
      .attr('disabled', '')
      .prop('disabled', true);
    $('input#monitor_screenshot_enable')
      .prop('checked', false)
      .closest('label')
      .removeClass('checkbox_label_checked');
    FWI_Monitoring.monScreenshotEnabled = false;
    HOST_DEVICE.setSetting('mon_screenshot_enabled', false.toString());
    FWI_Scheduler.monitorScreenshot('OFF');

    FWI_App.log('Monitoring disableScreenshot - Success');
  },
  /* Set time local */
  setScreenshotTime: function(time) {
    FWI_Monitoring.monScreenshotTime = time;
    HOST_DEVICE.setSetting(
      'mon_screenshot_time',
      time ? time.toString() : null
    );

    var seconds = FWI_Helper.hourMinSecToSeconds(time);
    FWI_Monitoring.monScreenshotTimeSeconds = seconds;

    FWI_App.log('Screenshot Interval Set: ' + seconds);
    FWI_Scheduler.monitorScreenshot('ON');
  },
  /* For RemoteCMD */
  setScreenshotTimeUpdNum: function(time) {
    $('.setting_adv_screenshot input[name="monitor_screenshot_hour1"]').val(
      time.charAt(0)
    );
    $('.setting_adv_screenshot input[name="monitor_screenshot_hour2"]').val(
      time.charAt(1)
    );
    $('.setting_adv_screenshot input[name="monitor_screenshot_minute1"]').val(
      time.charAt(3)
    );
    $('.setting_adv_screenshot input[name="monitor_screenshot_minute2"]').val(
      time.charAt(4)
    );
    $('.setting_adv_screenshot input[name="monitor_screenshot_second1"]').val(
      time.charAt(6)
    );
    $('.setting_adv_screenshot input[name="monitor_screenshot_second2"]').val(
      time.charAt(7)
    );
    FWI_Monitoring.monScreenshotTime = time;
    HOST_DEVICE.setSetting(
      'mon_screenshot_time',
      time ? time.toString() : null
    );

    var seconds = FWI_Helper.hourMinSecToSeconds(time);

    FWI_Monitoring.monScreenshotTimeSeconds = seconds;

    FWI_App.log('Screenshot Interval Set: ' + seconds);
    FWI_Scheduler.monitorScreenshot('ON');
  },
  /* Set Message */
  setScreenshotMsg: function(msg, status) {
    if (msg) {
      $('.screenshot_timestamp').hide();
      $('.screenshot_message').css('display', 'table-cell');
      if (status === 'success') {
        $('.screenshot_message')
          .html(msg)
          .closest('.status_msg')
          .removeClass('error')
          .addClass('success');
        /* Remove after 7sec */
        setTimeout(function() {
          $('.screenshot_message')
            .html('')
            .hide();
          $('.screenshot_timestamp').fadeIn();
        }, 7000);
      } else {
        $('.screenshot_message')
          .html(msg)
          .closest('.status_msg')
          .removeClass('success')
          .addClass('error');
      }
    }
  },

  captureScreen: function(url, body) {
    if (FWI_Hardware.firmwareActive) {
      FWI_App.log(
        'Canceled screenshot capture and upload due to firmware installation.',
        'INFO'
      );
      return;
    }

    if (!(FWI_Advanced.advEnabled || (url && body))) {
      FWI_App.log(
        'Canceled screenshot capture and upload due to missing FWI Services connection properties.',
        'INFO'
      );
      return;
    }

    $('.monitor_screenshot_upload').prop('disabled', true);
    FWI_App.log('[MONITORING] Starting screenshot capture process', 'INFO');

    var defaultURL;
    var host = FWI_Advanced.advHost;

    if (host && host.match(/\/$/)) {
      defaultURL = host + 'players/screenshot';
    } else {
      defaultURL = host + '/players/screenshot';
    }

    // IF DISPLAY OFF FROM TIMERS, CREATE PLACEHOLDER IMAGE INSTEAD.
    if (FWI_Hardware.display_on) {
      try {
        HOST_DEVICE.captureScreen(
          FWI_Monitoring.uploadScreenshot(url || defaultURL, body),
          function(error) {
            $('.monitor_screenshot_upload').prop('disabled', false);
            FWI_App.log('[MONITORING] Screen capture failed: ' + error, 'ERROR');
            FWI_Monitoring.setScreenshotMsg('Capture failed: ' + error, 'error');
          }
        );
      } catch (captureError) {
        $('.monitor_screenshot_upload').prop('disabled', false);
        FWI_App.log('[MONITORING] Screenshot capture exception: ' + captureError, 'ERROR');
        FWI_Monitoring.setScreenshotMsg('Capture exception: Device API error', 'error');
      }
    } else {
      FWI_App.log('[MONITORING] Display off - creating placeholder screenshot', 'DEBUG');

      try {
        //base64 dataURL encoded image
        var image = FWI_Helper.createImageFromCanvas();
        // transform dataurl => Blob
        fetch(image)
          .then(response => response.blob())
          .then(blob => {
            var uploadNow = FWI_Monitoring.uploadScreenshot(url || defaultURL, body);
            uploadNow(blob);
          })
          .catch(function(fetchError) {
            $('.monitor_screenshot_upload').prop('disabled', false);
            FWI_App.log('[MONITORING] Placeholder screenshot creation failed: ' + fetchError, 'ERROR');
            FWI_Monitoring.setScreenshotMsg('Placeholder creation failed', 'error');
          });

      } catch (error) {
        $('.monitor_screenshot_upload').prop('disabled', false);
        FWI_App.log('[MONITORING] Screenshot placeholder error: ' + error, 'ERROR');
        FWI_Monitoring.setScreenshotMsg('Screenshot failed: ' + error, 'error');
      }
    }
  },
  // Uploads the screenshot to FWI Services and displays the latest image on
  // the Monitoring screen.
  uploadScreenshot: function(url, body) {
    return function(screenshot) {
      // Build form data for upload.
      var fd = new FormData();

      if (body) {
        fd.append('key', body.key);
        fd.append('AWSAccessKeyId', body.AWSAccessKeyId);
        fd.append('x-amz-security-token', body['x-amz-security-token']);
        fd.append('policy', body.policy);
        fd.append('signature', body.signature);
        fd.append('file', screenshot, '06S4HCJJ600148A_thumb.jpg');
      } else {
        fd.append('data', screenshot, 'PepperAPIScreenCapture.jpg');
      }

      // Set time stamp.
      var whentaken = HOST_DEVICE.getTime()
        .toISOString()
        .slice(0, -1);

      whentaken = whentaken + '0000-00:00';

      FWI_App.log(
        'Uploading screenshot to "' +
          url +
          '". Screenshot time stamp: ' +
          whentaken +
          ', Public ID: "' +
          FWI_Deploy.playerID +
          '".',
        'INFO'
      );

      if (body) {
        $.ajax({
          type: 'POST',
          cache: false,
          contentType: false,
          processData: false,
          url: url,
          data: fd,
          success: function() {
            $('.monitor_screenshot_upload').prop('disabled', false);
            FWI_App.log(
              'Screenshot successfully uploaded to: ' + url + '.',
              'DEBUG'
            );
          },
          error: function(jqXHR, textStatus, errorThrown) {
            $('.monitor_screenshot_upload').prop('disabled', false);
            FWI_App.log(
              'Failed to upload screenshot to: ' +
                url +
                '. Error: ' +
                errorThrown,
              'ERROR'
            );
          }
        });
      } else {
        var userpass = btoa(
          FWI_Advanced.advComp +
            '\\' +
            FWI_Advanced.advUser +
            ':' +
            FWI_Advanced.advPass
        );

        $.ajax({
          type: 'POST',
          contentType: false,
          processData: false,
          url: url,
          data: fd,
          headers: {
            whentaken: whentaken,
            playerpublicid: FWI_Deploy.playerID,
            Authorization: 'Basic ' + userpass
          },
          success: function() {
            var screenshotUrl = URL.createObjectURL(screenshot);

            FWI_Monitoring.setScreenshotMsg('Screenshot Uploaded!', 'success');
            FWI_App.log('Screen Capture - Uploaded Screenshot');
            $('.monitor_screenshot_upload').prop('disabled', false);
            // Add screenshot to monitor page.
            var $screenshotSection = $('.recent_screenshot');
            var $screenshotImage = $screenshotSection.find('img');

            if ($screenshotImage.length) {
              // Remove any object URL.
              try {
                URL.revokeObjectURL($screenshotImage.attr('src'));
              } catch (e) {
                // Swallow.
              }
            } else {
              var $screenshotContainer = $(
                '<div class="settings_row"></div>'
              ).appendTo($screenshotSection);
              $screenshotImage = $('<img></img>').appendTo(
                $screenshotContainer
              );
            }

            $screenshotImage.attr('src', screenshotUrl);
            // Set time stamp.
            FWI_Monitoring.monScreenshotTimestamp = FWI_Helper.getTimestamp();
            HOST_DEVICE.setSetting(
              'mon_screenshot_timestamp',
              FWI_Monitoring.monScreenshotTimestamp
            );
            $('.screenshot_timestamp').html(
              FWI_Monitoring.monScreenshotTimestamp
            );
            // Scroll if user is on the Monitoring page.
            if (
              FWI_App.currentScreen === 'screen_settings' &&
              FWI_Settings.currentSetting === 'setting_monitoring' &&
              $('.monitor_screenshot_upload').hasClass('remote_selection')
            ) {
              FWI_Settings.focusActiveRow();
            }
          },
          error: function(jqXHR, textStatus, error) {
            $('.monitor_screenshot_upload').prop('disabled', false);
            FWI_App.log('Screenshot upload error: ' + error, 'ERROR');
          }
        });
      }
    };
  },

  // Summary: Sets the log window.
  setWindowTime: function() {
    var isValid = true;
    var h1 = $(
      '.setting_adv_logs .monitor_logs_time1 input[name="monitor_logs1_hour1"]'
    ).val();
    var h2 = $(
      '.setting_adv_logs .monitor_logs_time1 input[name="monitor_logs1_hour2"]'
    ).val();
    var m1 = $(
      '.setting_adv_logs .monitor_logs_time1 input[name="monitor_logs1_minute1"]'
    ).val();
    var m2 = $(
      '.setting_adv_logs .monitor_logs_time1 input[name="monitor_logs1_minute2"]'
    ).val();
    var ampm = $(
      '.setting_adv_logs .monitor_logs_time1 input[name="monitor_logs1_ampm"]:checked'
    ).length;

    if (ampm) {
      ampm = ' PM';
    } else {
      ampm = ' AM';
    }

    var startFormatTime = h1 + h2 + ':' + m1 + m2 + ampm;

    if (FWI_Validate.validateTime4(h1, h2, m1, m2)) {
      FWI_Monitoring.setLogsTime('begin', startFormatTime);
      $('.setting_adv_logs .monitor_logs_time1 input').removeClass(
        'unfocus_error'
      );
      FWI_App.log(
        'Log upload window start time validates. Saving value: "' +
          startFormatTime +
          '".',
        'DEBUG'
      );
    } else {
      $('.setting_adv_logs .monitor_logs_time1 input').addClass(
        'unfocus_error'
      );
      FWI_App.log(
        'Log upload window start time does not validate: "' +
          startFormatTime +
          '".',
        'WARN'
      );
      isValid = false;
    }

    h1 = $(
      '.setting_adv_logs .monitor_logs_time2 input[name="monitor_logs2_hour1"]'
    ).val();
    h2 = $(
      '.setting_adv_logs .monitor_logs_time2 input[name="monitor_logs2_hour2"]'
    ).val();
    m1 = $(
      '.setting_adv_logs .monitor_logs_time2 input[name="monitor_logs2_minute1"]'
    ).val();
    m2 = $(
      '.setting_adv_logs .monitor_logs_time2 input[name="monitor_logs2_minute2"]'
    ).val();
    ampm = $(
      '.setting_adv_logs .monitor_logs_time2 input[name="monitor_logs2_ampm"]:checked'
    ).length;

    if (ampm) {
      ampm = ' PM';
    } else {
      ampm = ' AM';
    }

    var endFormatTime = h1 + h2 + ':' + m1 + m2 + ampm;

    if (FWI_Validate.validateTime4(h1, h2, m1, m2)) {
      FWI_Monitoring.setLogsTime('end', endFormatTime);
      $('.setting_adv_logs .monitor_logs_time2 input').removeClass(
        'unfocus_error'
      );
      FWI_App.log(
        'Log upload window end time validates. Saving value: "' +
          endFormatTime +
          '".',
        'DEBUG'
      );
    } else {
      isValid = false;
      $('.setting_adv_logs .monitor_logs_time2 input').addClass(
        'unfocus_error'
      );
      FWI_App.log(
        'Log upload window end time does not validate: "' +
          endFormatTime +
          '".',
        'WARN'
      );
    }

    if (isValid) {
      // Start and end time cannot be the same.
      if (startFormatTime === endFormatTime) {
        isValid = false;
        FWI_App.log(
          'Log upload window time is empty, since start and end time are the same: ' +
            startFormatTime +
            '.',
          'WARN'
        );
      }
    }

    if (isValid) {
      // Update log upload window.
      if (FWI_Monitoring.monLogsEnabled) {
        FWI_Scheduler.monitorLog('ON');
        $('.log_window_message')
          .parent()
          .removeClass('icon_fail');
      }
    } else {
      $('.log_window_message')
        .parent()
        .addClass('icon_fail');
    }
  },

  /* Bind Elements */
  bindMonitoringElements: function() {
    FWI_App.log('[MONITORING] Starting bindMonitoringElements function', 'INFO');
    
    // Use a timeout to ensure DOM is ready
    setTimeout(function() {
      FWI_App.log('[MONITORING] DOM timeout reached, checking for elements', 'DEBUG');
      
      // Ensure elements exist before binding
      var logsCheckbox = $('input#monitor_logs_daily_enable');
      var statusCheckbox = $('input#monitor_status_enable');
      var screenshotCheckbox = $('input#monitor_screenshot_enable');
      
      FWI_App.log('[MONITORING] Element search results:', 'INFO');
      FWI_App.log('[MONITORING] - Logs checkbox: ' + logsCheckbox.length + ' found', 'INFO');
      FWI_App.log('[MONITORING] - Status checkbox: ' + statusCheckbox.length + ' found', 'INFO');
      FWI_App.log('[MONITORING] - Screenshot checkbox: ' + screenshotCheckbox.length + ' found', 'INFO');
      
      // Check if we're on the right tab
      var monitoringTab = $('.setting_monitoring');
      var isVisible = monitoringTab.is(':visible');
      FWI_App.log('[MONITORING] Monitoring tab found: ' + monitoringTab.length + ', visible: ' + isVisible, 'INFO');
      
      if (logsCheckbox.length === 0 && statusCheckbox.length === 0 && screenshotCheckbox.length === 0) {
        FWI_App.log('[MONITORING] ERROR: No monitoring elements found! DOM may not be ready or elements missing', 'ERROR');
        return;
      }
      
      /* Logs */
      if (logsCheckbox.length > 0) {
        FWI_App.log('[MONITORING] Binding logs checkbox change event', 'DEBUG');
        logsCheckbox.off('change').on('change', function() {
          FWI_App.log('[MONITORING] Logs checkbox changed - checked: ' + $(this).is(':checked'), 'INFO');
          $('.setting_adv_logs .monitor_logs_time1 input.time_digit:first').trigger(
            'change'
          );
          $('.setting_adv_logs .monitor_logs_time2 input.time_digit:first').trigger(
            'change'
          );

          if ($(this).is(':checked')) {
            FWI_Monitoring.enableLogs();
          } else {
            FWI_Monitoring.disableLogs();
          }
        });
      } else {
        FWI_App.log('[MONITORING] WARNING: Logs checkbox not found, skipping binding', 'WARN');
      }
      // Update and validate log upload window start time on change
      $('.setting_adv_logs .monitor_logs_time1 input.time_digit').off('change').on('change',
        FWI_Monitoring.setWindowTime
      );
      $(
        '.setting_adv_logs .monitor_logs_time1 input[name="monitor_logs1_ampm"]'
      ).off('change').on('change', FWI_Monitoring.setWindowTime);
      // Update and validate log upload window end time on change
      $('.setting_adv_logs .monitor_logs_time2 input.time_digit').off('change').on('change',
        FWI_Monitoring.setWindowTime
      );
      $(
        '.setting_adv_logs .monitor_logs_time2 input[name="monitor_logs2_ampm"]'
      ).off('change').on('change', FWI_Monitoring.setWindowTime);

      $('button.monitor_logs_daily_upload').off().on('click', function(e) {
        e.preventDefault();
        FWI_Monitoring.uploadLogsStart();
        return false;
      });

      /* Status */
      if (statusCheckbox.length > 0) {
        FWI_App.log('[MONITORING] Binding status checkbox change event', 'DEBUG');
        statusCheckbox.off('change').on('change', function() {
          FWI_App.log('[MONITORING] Status checkbox changed - checked: ' + $(this).is(':checked'), 'INFO');
          $('.setting_adv_status .time_picker input.time_digit:first').trigger(
            'change'
          );
          if ($(this).is(':checked')) {
            FWI_Monitoring.enableStatus();
          } else {
            FWI_Monitoring.disableStatus();
          }
        });
      } else {
        FWI_App.log('[MONITORING] WARNING: Status checkbox not found, skipping binding', 'WARN');
      }
      /* Update and validate time on change */
      $('.setting_adv_status .time_picker input.time_digit').off('change').on('change', function() {
        var h1 = $(
          '.setting_adv_status .time_picker input[name="monitor_status_hour1"]'
        ).val();
        var h2 = $(
          '.setting_adv_status .time_picker input[name="monitor_status_hour2"]'
        ).val();
        var m1 = $(
          '.setting_adv_status .time_picker input[name="monitor_status_minute1"]'
        ).val();
        var m2 = $(
          '.setting_adv_status .time_picker input[name="monitor_status_minute2"]'
        ).val();
        var s1 = $(
          '.setting_adv_status .time_picker input[name="monitor_status_second1"]'
        ).val();
        var s2 = $(
          '.setting_adv_status .time_picker input[name="monitor_status_second2"]'
        ).val();
        var format_time = h1 + h2 + ':' + m1 + m2 + ':' + s1 + s2;

        if (FWI_Validate.validateTime6Int(h1, h2, m1, m2, s1, s2)) {
          FWI_Monitoring.setStatusTime(format_time);
          $('.setting_adv_status .time_picker input').removeClass(
            'unfocus_error'
          );
          FWI_App.log('setStatusTime Validates, saving - ' + format_time);
        } else {
          $('.setting_adv_status .time_picker input').addClass('unfocus_error');
          FWI_App.log('setStatusTime Does not Validate - ' + format_time);
        }
      });

      $('button.monitor_status_upload').off().on('click', function(e) {
        e.preventDefault();
        FWI_Monitoring.logDebug('Manual status upload button clicked', 'INFO');
        FWI_Monitoring.uploadStatus();
      });

      /* Screenshot */
      if (screenshotCheckbox.length > 0) {
        FWI_App.log('[MONITORING] Binding screenshot checkbox change event', 'DEBUG');
        screenshotCheckbox.off('change').on('change', function() {
          FWI_App.log('[MONITORING] Screenshot checkbox changed - checked: ' + $(this).is(':checked'), 'INFO');
          $('.setting_adv_screenshot .time_picker input.time_digit:first').trigger(
            'change'
          );

          if ($(this).is(':checked')) {
            FWI_Monitoring.enableScreenshot();
          } else {
            FWI_Monitoring.disableScreenshot();
          }
        });
      } else {
        FWI_App.log('[MONITORING] WARNING: Screenshot checkbox not found, skipping binding', 'WARN');
      }
      /* Call Scap's Screen Capture, Send to FWI Services Rest */
      $('button.monitor_screenshot_upload').off().on('click', function(e) {
        e.preventDefault();
        FWI_Monitoring.captureScreen();
      });
      /* Update and validate time on change */
      $('.setting_adv_screenshot .time_picker input.time_digit').off('change').on('change',
        function() {
          var h1 = $(
            '.setting_adv_screenshot .time_picker input[name="monitor_screenshot_hour1"]'
          ).val();
          var h2 = $(
            '.setting_adv_screenshot .time_picker input[name="monitor_screenshot_hour2"]'
          ).val();
          var m1 = $(
            '.setting_adv_screenshot .time_picker input[name="monitor_screenshot_minute1"]'
          ).val();
          var m2 = $(
            '.setting_adv_screenshot .time_picker input[name="monitor_screenshot_minute2"]'
          ).val();
          var s1 = $(
            '.setting_adv_screenshot .time_picker input[name="monitor_screenshot_second1"]'
          ).val();
          var s2 = $(
            '.setting_adv_screenshot .time_picker input[name="monitor_screenshot_second2"]'
          ).val();
          var format_time = h1 + h2 + ':' + m1 + m2 + ':' + s1 + s2;

          if (FWI_Validate.validateTime6Int(h1, h2, m1, m2, s1, s2)) {
            FWI_Monitoring.setScreenshotTime(format_time);
            $('.setting_adv_screenshot .time_picker input').removeClass(
              'unfocus_error'
            );
            FWI_App.log('setScreenshotTime Validates, saving - ' + format_time);
          } else {
            $('.setting_adv_screenshot .time_picker input').addClass(
              'unfocus_error'
            );
            FWI_App.log('setScreenshotTime Does not Validate - ' + format_time);
          }
        }
      );
      /* Update Screenshot Quality */
      $('.row_screenshot label.radio_label').off().on('click', function(e) {
        e.preventDefault();
        $(this)
          .closest('div')
          .find('input[type="radio"]')
          .prop('checked', true);

        var qual = $('input[name="screensize-radio-group"]:checked').val();

        FWI_App.log('Screenshot Quality - ' + qual);
        FWI_Monitoring.monScreenshotQuality = qual;
        HOST_DEVICE.setSetting('mon_screenshot_quality', qual);
      });
      
      FWI_App.log('[MONITORING] UI elements binding completed successfully', 'INFO');
      
      // Test if bindings work by checking for existing events
      var logsEvents = logsCheckbox.length > 0 ? $._data(logsCheckbox[0], 'events') : null;
      var statusEvents = statusCheckbox.length > 0 ? $._data(statusCheckbox[0], 'events') : null;
      var screenshotEvents = screenshotCheckbox.length > 0 ? $._data(screenshotCheckbox[0], 'events') : null;
      
      FWI_App.log('[MONITORING] Event binding verification:', 'DEBUG');
      FWI_App.log('[MONITORING] - Logs events: ' + (logsEvents && logsEvents.change ? 'BOUND' : 'NOT BOUND'), 'DEBUG');
      FWI_App.log('[MONITORING] - Status events: ' + (statusEvents && statusEvents.change ? 'BOUND' : 'NOT BOUND'), 'DEBUG');
      FWI_App.log('[MONITORING] - Screenshot events: ' + (screenshotEvents && screenshotEvents.change ? 'BOUND' : 'NOT BOUND'), 'DEBUG');
      
    }, 100); // 100ms delay to ensure DOM is ready
  },

  tabUnfocus: function() {
    this.resetTimers();
  },

  init: function() {
    FWI_App.log('Initializing Monitoring module', 'INFO');
    /* Bind Inputs */
    this.bindMonitoringElements();
    
    // Fallback binding after a delay to ensure DOM is ready
    var self = this;
    setTimeout(function() {
      self.bindMonitoringElements();
    }, 500);

    // Read settings.
    this.monLogsEnabled =
      HOST_DEVICE.getSetting('mon_logs_enabled') === true.toString();
    this.monLogsTime = HOST_DEVICE.getSetting('mon_logs_time') || '12:00 AM';
    this.monLogsTime2 =
      HOST_DEVICE.getSetting('mon_logs_time2') || '04:00 AM';
    
    FWI_App.log('Monitoring settings loaded - Logs enabled: ' + this.monLogsEnabled + ', Log window: ' + this.monLogsTime + ' to ' + this.monLogsTime2, 'DEBUG');

    var previousLogUploadTimestamp = HOST_DEVICE.getSetting(
      'mon_logs_timestamp'
    );

    if (previousLogUploadTimestamp) {
      this.monLogsTimestamp = new Date(previousLogUploadTimestamp);
    }

    FWI_App.log('Initial monLogsTimestamp: ' + this.monLogsTimestamp, 'DEBUG');
    this.monStatusEnabled =
      HOST_DEVICE.getSetting('mon_status_enabled') === true.toString();
    this.monStatusTime = HOST_DEVICE.getSetting('mon_status_time');
    this.monStatusTimeSeconds = FWI_Helper.hourMinSecToSeconds(
      this.monStatusTime
    );
    this.monStatusTimestamp = HOST_DEVICE.getSetting('mon_status_timestamp');
    
    FWI_App.log('Status monitoring settings - Enabled: ' + this.monStatusEnabled + ', Interval: ' + (this.monStatusTime || 'Not set') + ' (' + this.monStatusTimeSeconds + ' seconds)', 'DEBUG');
    this.monScreenshotEnabled =
      HOST_DEVICE.getSetting('mon_screenshot_enabled') === true.toString();
    this.monScreenshotQuality = HOST_DEVICE.getSetting(
      'mon_screenshot_quality'
    );
    this.monScreenshotTime = HOST_DEVICE.getSetting('mon_screenshot_time');
    this.monScreenshotTimeSeconds = FWI_Helper.hourMinSecToSeconds(
      this.monScreenshotTime
    );
    this.monScreenshotTimestamp = HOST_DEVICE.getSetting(
      'mon_screenshot_timestamp'
    );
    
    FWI_App.log('Screenshot monitoring settings - Enabled: ' + this.monScreenshotEnabled + ', Quality: ' + (this.monScreenshotQuality || 'HD') + ', Interval: ' + (this.monScreenshotTime || 'Not set'), 'DEBUG');

    // Load timers.
    this.resetTimers();

    /* Logs */
    if (this.monLogsEnabled) {
      this.enableLogs();
    }

    if (this.monLogsTimestamp) {
      $('.log_timestamp').html(FWI_Helper.getTimestamp(this.monLogsTimestamp));
    }

    /* Status */
    if (this.monStatusEnabled) {
      this.enableStatus();
    }

    if (this.monStatusTimestamp) {
      $('.status_timestamp').html(this.monStatusTimestamp);
    }

    /* Screenshot */
    if (this.monScreenshotQuality === 'FHD') {
      $('input[name=screensize-radio-group][value=FHD').prop('checked', true);
    } else {
      $('input[name=screensize-radio-group][value=HD]').prop('checked', true);
    }

    if (this.monScreenshotEnabled) {
      this.enableScreenshot();
    }

    if (this.monScreenshotTimestamp) {
      $('.screenshot_timestamp').html(this.monScreenshotTimestamp);
    }
    FWI_App.log('Monitoring module initialization completed successfully', 'INFO');
    
    // Final binding attempt to ensure UI works
    var self = this;
    setTimeout(function() {
      self.bindMonitoringElements();
    }, 1000);
  }
};
