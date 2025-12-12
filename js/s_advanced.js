var FWI_Advanced = {
  advEnabled: false,
  advHost: null, // Contains the URL of the FWI Services host.
  advComp: null, // Contains the name of the company for the FWI Services connection.
  advUser: null, // Contains the user name in the company for the FWI Services connection.
  advPass: null, // Contains the password for the user in the company for the FWI Services connection.
  staticIpEnabled: false, // Determines whether the device is using a static IP as opposed to DHCP.
  networkInfo: {},
  timeZone: '', // Holds the selected time zone value.

  /* Enable or Disable Services, Turns on/off Monitoring */
  enableServices: function() {
    FWI_Advanced.advEnabled = true;
    HOST_DEVICE.setSetting('adv_enabled', true.toString());

    if (FWI_Advanced.advHost) {
      /* Monitoring Enable function */
      FWI_Monitoring.allowMonitoring();
    }

    FWI_Shadow.updateShadow();
  },

  disableServices: function() {
    FWI_Advanced.advEnabled = false;
    HOST_DEVICE.setSetting('adv_enabled', false.toString());

    FWI_Monitoring.disallowMonitoring();
    FWI_Shadow.updateShadow();
  },
  /* Set Message */
  setAdvMsg: function(msg, status) {
    if (msg) {
      if (status === 'success') {
        $('.soap_msg')
          .html(msg)
          .closest('.status_msg')
          .removeClass('error')
          .addClass('success');
        /* Remove after 7sec */
        setTimeout(function() {
          if ($('.status_msg.success .soap_msg').length) {
            $('.soap_msg').html('');
          }
        }, 7000);
      } else {
        $('.soap_msg')
          .html(msg)
          .closest('.status_msg')
          .removeClass('success')
          .addClass('error');
      }
    }
  },
  // Summary: Displays a validation message on the screen for the static IP address.
  setStaticIpMessage: function(msg, status) {
    clearTimeout(FWI_Advanced.messageHandler);
    if (typeof msg === 'string') {
      if (status === 'success') {
        $('.static_ip_test_msg')
          .text(msg)
          .closest('.status_msg')
          .removeClass('error')
          .addClass('success');
        // Remove automatically after a short while.
        FWI_Advanced.messageHandler = setTimeout(function() {
          if ($('.status_msg.success .static_ip_test_msg').length) {
            $('.static_ip_test_msg').text('');
          }
        }, 7000);
      } else {
        $('.static_ip_test_msg')
          .text(msg)
          .closest('.status_msg')
          .removeClass('success')
          .addClass('error');
      }
    }
  },
  /* Error/Success messages */
  preSoapError: function() {
    FWI_Advanced.setAdvMsg(
      FWI_Localization.getResource(
        'browserBased',
        'deploy_message_incorrectCredentials',
        'Username/Password Credentials are Incorrect.'
      ),
      'error'
    );
  },

  soapError: function(msg) {
    if (!msg) {
      msg = FWI_Localization.getResource(
        'browserBased',
        'deploy_message_incorrectCredentials',
        'Username/Password Credentials are Incorrect.'
      );
    }
    FWI_Advanced.setAdvMsg(msg, 'error');
  },

  soapSuccess: function(host, comp, user, pass) {
    FWI_Advanced.setAdvMsg(
      FWI_Localization.getResource(
        'browserBased',
        'message_servicesEnabled',
        'FWI Services Enabled.'
      ),
      'success'
    );

    /* Update fields for Remote CMD */
    $('.advanced_setting_group input[name="advanced_connect_fwi_host"]').val(
      host
    );
    $('.advanced_setting_group input[name="advanced_connect_fwi_comp"]').val(
      comp
    );
    $('.advanced_setting_group input[name="advanced_connect_fwi_user"]').val(
      user
    );
    $('.advanced_setting_group input[name="advanced_connect_fwi_pass"]').val(
      pass
    );

    /* Cache Creds */
    FWI_Advanced.advHost = host;
    HOST_DEVICE.setSetting('adv_host', host);
    FWI_Advanced.advComp = comp;
    HOST_DEVICE.setSetting('adv_comp', comp);
    FWI_Advanced.advUser = user;
    HOST_DEVICE.setSetting('adv_user', user);
    FWI_Advanced.advPass = pass;
    HOST_DEVICE.setSetting(
      'adv_pass',
      FWI_Helper.encrypt(pass, HOST_DEVICE.getDeviceId())
    );
    FWI_Advanced.enableServices();
  },
  /* Validates creds with FWI Soap service */
  validateCreds: function(host, comp, user, pass, onSuccess, onFailure) {
    var url;

    if (!FWI_Validate.validateURL(host)) {
      onFailure('Malformed URL');
      return;
    }

    // make sure that we have all the required fields before sending a request.
    var fieldNames = ['FWI Services URL', 'Company', 'Username', 'Password'];
    if (!host || !comp || !user || !pass) {
      [ host, comp, user, pass ].map(function(field, i) {
        if (!field) {
          onFailure(fieldNames[i] + ' is a required field');
        }
      });
      return;
    }

    if (host.match(/\/$/)) {
      url = host + 'filetransfer/testauth';
    } else {
      url = host + '/filetransfer/testauth';
    }

    $.ajax({
      type: 'GET',
      url: url,
      headers: {
        Accept: 'application/json',
        Authorization: 'Basic ' + btoa(comp + '\\' + user + ':' + pass)
      },

      success: function(data, status, req) {
        if (req.status == 200) {
          FWI_App.log('FWI Services Auth - REST success');
          onSuccess && onSuccess();
        } else {
          FWI_App.log(
            'FWI Services Auth - Error Attempting to Authenticate: ' + data,
            'ERROR'
          );
          onFailure &&
            onFailure(
              FWI_Localization.getResource(
                'browserBased',
                'deploy_message_incorrectCredentials',
                'Username/Password Credentials are Incorrect.'
              )
            );
        }
      },

      error: function(error) {
        if (error.status && (error.status === 401 || error.status === 403)) {
          FWI_App.log({
            msg: 'FWI Services Username/Password Credentials are Incorrect.',
            level: 'ERROR'
          });
          onFailure &&
            onFailure(
              FWI_Localization.getResource(
                'browserBased',
                'deploy_message_incorrectCredentials',
                'Username/Password Credentials are Incorrect.'
              )
            );
        } else {
          FWI_App.log(
            'FWI Services Auth - Error With Connection. ' + error,
            'ERROR'
          );
          onFailure &&
            onFailure(
              FWI_Localization.getResource(
                'browserBased',
                'advanced_message_connectionError',
                'Error with Connection.'
              )
            );
        }
      }
    });
  },

  resetInputs: function() {
    /* Remove validation errors */
    $('.soap_msg').html('');
    /* Populate Saved/Cached creds */
    if (this.advHost) {
      $('.advanced_setting_group input[name="advanced_connect_fwi_host"]').val(
        this.advHost
      );
      $('.advanced_setting_group input[name="advanced_connect_fwi_comp"]').val(
        this.advComp
      );
      $('.advanced_setting_group input[name="advanced_connect_fwi_user"]').val(
        this.advUser
      );
      $('.advanced_setting_group input[name="advanced_connect_fwi_pass"]').val(
        this.advPass
      );
    } else {
      $('.advanced_setting_group input[name="advanced_connect_fwi_host"]').val(
        ''
      );
      $('.advanced_setting_group input[name="advanced_connect_fwi_comp"]').val(
        ''
      );
      $('.advanced_setting_group input[name="advanced_connect_fwi_user"]').val(
        ''
      );
      $('.advanced_setting_group input[name="advanced_connect_fwi_pass"]').val(
        ''
      );
    }

    // Update fields in static IP address section.
    if (FWI_Advanced.staticIpEnabled) {
      FWI_Advanced.checkForStaticIpEnabled();
    } else {
      FWI_Advanced.checkForStaticIpDisabled();
    }

    $('.advanced_setting_group input[name="advanced_static_ip_address"]').val(
      this.networkInfo.ipAddress || ''
    );
    $(
      '.advanced_setting_group input[name="advanced_static_ip_subnet_mask"]'
    ).val(this.networkInfo.subnetMask || '');
    $(
      '.advanced_setting_group input[name="advanced_static_ip_default_gateway"]'
    ).val(this.networkInfo.defaultGateway || '');
    $('.advanced_setting_group input[name="advanced_static_ip_dns_1"]').val(
      this.networkInfo.dnsServers ? this.networkInfo.dnsServers[0] || '' : ''
    );
    $('.advanced_setting_group input[name="advanced_static_ip_dns_2"]').val(
      this.networkInfo.dnsServers ? this.networkInfo.dnsServers[1] || '' : ''
    );
    $('.advanced_setting_group input[name="advanced_static_ip_dns_3"]').val(
      this.networkInfo.dnsServers ? this.networkInfo.dnsServers[2] || '' : ''
    );

    // Update fields in time configuration section.
    var timeZone = FWI_Advanced.timeZone || 'MST';
    var timeZoneLabel = FWI_Localization.getResource(
      'browserBased',
      'timeZone_' + timeZone,
      timeZone
    );
    $('#fwi_timezone').text(timeZoneLabel);

    // Update time server URL.
    if (FWI_Advanced.timeServer) {
      $('input[name="time_server"]').val(FWI_Advanced.timeServer);
      $('.advanced_time_server_message')
        .parent()
        .addClass('success')
        .removeClass('need_validation')
        .removeClass('icon_fail');
      $('.advanced_time_test').prop('disabled', true); // Disable "Verify" button, since we already have a valid selection.
    } else {
      // Clear input.
      // A time server URL can be empty, so we don't add any fail icon.
      $('input[name="time_server"]').val('');
    }
  },
  // Summary: Enables static IP fields.
  checkForStaticIpEnabled: function() {
    $('.static_ip_section .require_enable')
      .prop('disabled', false)
      .removeAttr('disabled');
    $('input#advanced_enable_static_ip')
      .prop('checked', true)
      .closest('label')
      .addClass('checkbox_label_checked');
    FWI_Advanced.staticIpEnabled = true;
    HOST_DEVICE.setSetting('static_ip_enable', true.toString());
    FWI_App.log('Static IP address enabled.', 'DEBUG');
  },
  // Disables static IP fields.
  checkForStaticIpDisabled: function() {
    $('.static_ip_section .require_enable')
      .attr('disabled', '')
      .prop('disabled', true);
    $('input#advanced_enable_static_ip')
      .prop('checked', false)
      .closest('label')
      .removeClass('checkbox_label_checked');

    // Set network configuration without an IP address to use DHCP.
    if (this.networkInfo.ipAddress) {
      // Switch to using DCHP by updating the network configuration.
      var networkInfo = {};
      $.extend(true, networkInfo, this.networkInfo);
      networkInfo.useStaticIpAddress = false;
      FWI_Advanced._setNetworkConfiguration(networkInfo);
    }
    FWI_Advanced.staticIpEnabled = false;
    HOST_DEVICE.setSetting('static_ip_enable', false.toString());
    FWI_App.log('Static IP address disabled. Using DHCP.');
  },

  bindAdvancedElements: function() {
    // Detect checkbox state change for static IP address.
    $('input#advanced_enable_static_ip').change(function() {
      if ($(this).is(':checked')) {
        FWI_Advanced.checkForStaticIpEnabled();
      } else {
        FWI_Advanced.checkForStaticIpDisabled();
      }
    });

    // Validate the entered IP addresses.
    $('.advanced_setting_group button.advanced_static_ip_test').on(
      'click',
      function() {
        var ip4Regex = /\b((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|$)){4}\b/;
        var staticIp = $(
          '.advanced_setting_group input[name="advanced_static_ip_address"]'
        ).val();
        var subnetMask = $(
          '.advanced_setting_group input[name="advanced_static_ip_subnet_mask"]'
        ).val();
        var defaultGateway = $(
          '.advanced_setting_group input[name="advanced_static_ip_default_gateway"]'
        ).val();
        var dns1 = $(
          '.advanced_setting_group input[name="advanced_static_ip_dns_1"]'
        ).val();
        var dns2 = $(
          '.advanced_setting_group input[name="advanced_static_ip_dns_2"]'
        ).val();
        var dns3 = $(
          '.advanced_setting_group input[name="advanced_static_ip_dns_3"]'
        ).val();
        if (!ip4Regex.test(staticIp)) {
          // Show error that IP address is invalid.
          FWI_Advanced.setStaticIpMessage(
            FWI_Localization.getResource(
              'browserBased',
              'message_invalidStaticIpAddress',
              'Static IP Address Invalid'
            ),
            'error'
          );
        } else if (!ip4Regex.test(subnetMask)) {
          // Show error that default subnet mask is invalid.
          FWI_Advanced.setStaticIpMessage(
            FWI_Localization.getResource(
              'browserBased',
              'message_invalidSubnetMask',
              'Subnet Mask Invalid'
            ),
            'error'
          );
        } else if (!ip4Regex.test(defaultGateway)) {
          // Show error that default gateway address is invalid.
          FWI_Advanced.setStaticIpMessage(
            FWI_Localization.getResource(
              'browserBased',
              'message_invalidDefaultGatewayAddress',
              'Default Gateway Address Invalid'
            ),
            'error'
          );
        } else if (!ip4Regex.test(dns1)) {
          // Show error that DNS address is invalid.
          FWI_Advanced.setStaticIpMessage(
            FWI_Localization.getResource(
              'browserBased',
              'message_invalidDNS1Address',
              'DNS 1 Address Invalid'
            ),
            'error'
          );
        } else if ((dns2 || dns3) && !ip4Regex.test(dns2)) {
          // Show error that DNS address is invalid.
          FWI_Advanced.setStaticIpMessage(
            FWI_Localization.getResource(
              'browserBased',
              'message_invalidDNS2Address',
              'DNS 2 Address Invalid'
            ),
            'error'
          );
        } else if (dns3 && !ip4Regex.test(dns3)) {
          // Show error that DNS address is invalid.
          FWI_Advanced.setStaticIpMessage(
            FWI_Localization.getResource(
              'browserBased',
              'message_invalidDNS3Address',
              'DNS 3 Address Invalid'
            ),
            'error'
          );
        } else {
          // Update network configuration with static IP address.
          FWI_Advanced.setStaticIpMessage('', 'success'); // Clear any errors.
          var dnsServers = [dns1];
          if (dns2) {
            dnsServers.push(dns2);
            if (dns3) {
              dnsServers.push(dns3);
            }
          }
          var networkInfo = {
            useStaticIpAddress: true,
            ipAddress: staticIp,
            subnetMask: subnetMask,
            defaultGateway: defaultGateway,
            dnsServers: dnsServers
          };
          FWI_Advanced._setNetworkConfiguration(networkInfo);
        }
      }
    );

    // Detect time server URL change.
    $('input[name="time_server"]').on('input', function() {
      var timeServer = $(
        '.advanced_setting_group input[name="time_server"]'
      ).val();
      if (timeServer === FWI_Advanced.timeServer) {
        // Value hasn't changed.
        $('.advanced_time_server_message')
          .parent()
          .removeClass('need_validation')
          .addClass('success')
          .removeClass('icon_fail');
        $('.advanced_time_test').prop('disabled', true);
      } else {
        FWI_Advanced.timeServerUrlNeedsValidate();
      }
    });

    // Validate time server URL.
    $('.advanced_setting_group button.advanced_time_test').on(
      'click',
      function() {
        var timeServer = $(
          '.advanced_setting_group input[name="time_server"]'
        ).val();
        if (timeServer === FWI_Advanced.timeServer) {
          // Value hasn't changed.
          $('.advanced_time_server_message')
            .parent()
            .removeClass('need_validation')
            .addClass('success')
            .removeClass('icon_fail');
          return;
        }

        // Check that the URL is valid. Then set the new value.
        $('.advanced_time_test').prop('disabled', true);
        if (
          timeServer === '' ||
          FWI_Validate.validateTimeServerURL(timeServer)
        ) {
          var onSuccess = function() {
            FWI_App.log(
              'Time server set successfully to "' + timeServer + '".'
            );
            $('.advanced_time_server_message')
              .parent()
              .removeClass('need_validation')
              .addClass('success')
              .removeClass('icon_fail');
            FWI_Advanced.timeServer = timeServer;
            HOST_DEVICE.setSetting('time_server', timeServer);
            FWI_Shadow.updateShadow();
          };
          var onError = function(err) {
            FWI_App.log(
              'Unable to set time server to "' + timeServer + '". Error: ' + err
            );
            $('.advanced_time_test').prop('disabled', false);
            $('.advanced_time_server_message')
              .parent()
              .removeClass('success')
              .removeClass('need_validation')
              .addClass('icon_fail');
          };
          var timeInfo = { timeServer: timeServer };
          HOST_DEVICE.setTimeInfo(timeInfo, onSuccess, onError);
        } else {
          // Time server URL is invalid.
          FWI_App.log(
            'Error validating time server URL "' +
              timeServer +
              '". Keeping existing value ("' +
              FWI_Advanced.timeServer +
              '".'
          );
          $('.advanced_time_server_message')
            .parent()
            .removeClass('success')
            .removeClass('need_validation')
            .addClass('icon_fail');
        }
      }
    );

    /* Validate the entered FWI Service Creds */
    $('.advanced_setting_group button.advanced_connect_fwi_test').on(
      'click',
      function() {
        var host = $(
          '.advanced_setting_group input[name="advanced_connect_fwi_host"]'
        ).val();
        var comp = $(
          '.advanced_setting_group input[name="advanced_connect_fwi_comp"]'
        ).val();
        var user = $(
          '.advanced_setting_group input[name="advanced_connect_fwi_user"]'
        ).val();
        var pass = $(
          '.advanced_setting_group input[name="advanced_connect_fwi_pass"]'
        ).val();

        if (host || comp || user || pass) {
          $('.advanced_connect_fwi_test').prop('disabled', true);
          FWI_Advanced.validateCreds(
            host,
            comp,
            user,
            pass,
            function() {
              $('.advanced_connect_fwi_test').prop('disabled', false);
              FWI_Advanced.soapSuccess(host, comp, user, pass);
            },
            function(msg) {
              $('.advanced_connect_fwi_test').prop('disabled', false);
              FWI_Advanced.soapError(msg);
            }
          );
        } else {
          FWI_Advanced.preSoapError();
        }
      }
    );

    // Time zone selection.
    $('.advanced_setting_group .fwi_dropdown').on('click', function() {
      // Open modal dialog for time zone selection.
      FWI_Advanced._displayTimeZoneSelection();
    });
  },

  // Summary: Cancel the time zone dialog.
  cancelTimeZoneDialog: function() {
    FWI_Advanced._closeModelDialog();
  },

  // Summary: Execute time zone dialog.
  executeTimeZoneDialog: function() {
    var timeZone = $('.time_zone_modal li.current_selection').attr(
      'data-setting'
    );
    if (timeZone !== this.timeZone) {
      var onSuccess = function() {
        // Update the time zone setting and control.
        FWI_Advanced.setTimeZone(timeZone, function() {
          var timeZoneLabel = FWI_Localization.getResource(
            'browserBased',
            'timeZone_' + timeZone,
            timeZone
          );

          $('#fwi_timezone').text(timeZoneLabel);
        });
      };
      var onError = function(err) {
        // This is unlikely to fail, so we'll just log an error.
        FWI_App.log(
          'Error setting time zone to "' +
            timeZone +
            '". Keeping existing value ("' +
            FWI_Advanced.timeZone +
            '"). Error: ' +
            err
        );
      };
      var timeInfo = { timeZone: timeZone };

      HOST_DEVICE.setTimeInfo(timeInfo, onSuccess, onError);
    }
    FWI_Advanced._closeModelDialog();
  },

  // Summary - change the time zone setting.
  setTimeZone: function(newTimeZone, optionalCallback) {
    var cb = typeof optionalCallback === 'function' ? optionalCallback : null;

    HOST_DEVICE.setSetting('time_zone', newTimeZone, cb);
    FWI_Advanced.timeZone = newTimeZone;
    FWI_Shadow.updateShadow();
    FWI_Hardware.publishOfflineNotificationReason(offlineCodes.UNKNOWN_REASON);
    HOST_DEVICE.rebootDevice();
  },

  // Summary: Time server URL changed.
  timeServerUrlNeedsValidate: function() {
    $('.advanced_time_test').prop('disabled', false);
    $('.advanced_time_server_message')
      .parent()
      .addClass('need_validation')
      .removeClass('success')
      .removeClass('icon_fail');
  },

  // Summary: Closes the modal dialog.
  _closeModelDialog: function() {
    var $modal = $('.modal_active');
    $modal.find('.active_row').removeClass('active_row'); // So we don't messup keyboard navigation.
    $modal.removeClass('modal_active');
    $('html').removeClass('modal_on');
    $('.modal_message').hide();
    FWI_App.currentScreen = 'screen_settings';
    FWI_Settings.currentSelection = 'main';
    FWI_Settings.focusActiveRow();
  },

  // Summary: Displays the time zone selection dialog.
  _displayTimeZoneSelection: function() {
    // Open modal dialog for time zone selection.
    var $dialog = $('.time_zone_modal');

    $dialog.addClass('modal_active');

    var $doneButton = $dialog.find('button.time_zone_done');
    var $cancelButton = $dialog.find('button.time_zone_cancel');

    FWI_App.enableModal();

    // The call above will put focus on the first button, which we don't want in this case.
    $doneButton.removeClass('remote_selection');
    $cancelButton.removeClass('remote_selection');
    FWI_App.currentScreen = 'time_zone_selection';

    // Highlight the selected time zone.
    if (this.timeZone) {
      // Deselect any previous selection. It could be that it was never able to be set properly.
      var $timeZoneDialog = $('.time_zone_modal');
      $timeZoneDialog
        .find('li.current_selection')
        .removeClass('current_selection');

      // Then find the current selection.
      var $timeZone = $timeZoneDialog.find(
        "li[data-setting='" + FWI_Helper.encodeHtml(this.timeZone) + "']"
      );

      if ($timeZone.length > 0) {
        $timeZone.addClass('current_selection');
        $timeZone[0].scrollIntoView();
        $timeZone.addClass('active_row'); // Starting point of navigation.
      } else {
        // Since no time zone was selected, use first item as starting point.
        $timeZoneDialog
          .find('li[data-setting]')
          .first()
          .addClass('active_row'); // Starting point of navigation.
      }
    }
  },

  // Summary: Receive key press event and process.
  settingsKeypress: function(key) {
    var keyCode = key.keyCode;
    var $dialog = $('.modal_active');
    var $options = $dialog.find('ul li');
    var $highlighted = $options.filter('.active_row').first();
    var $currentSelection = $options.filter('.current_selection').first();
    var $doneButton = $dialog.find('button.time_zone_done');
    var $cancelButton = $dialog.find('button.time_zone_cancel');
    var selectionRowIndex = $options.index($highlighted);

    if (keyCode === BUTTON_DOWN || keyCode === BUTTON_UP) {
      if ($highlighted.length === 0 && $currentSelection.length > 0) {
        // If there is no option currently highlighted, go to the current selection.
        $highlighted = $currentSelection;
        $highlighted.addClass('active_row');

        return false;
      }

      // Put focus on next selection, possibly wrapping.
      if (keyCode === BUTTON_DOWN) {
        ++selectionRowIndex;

        if (selectionRowIndex === $options.length) {
          selectionRowIndex = 0;
        }
      } else {
        --selectionRowIndex;

        if (selectionRowIndex < 0) {
          selectionRowIndex = $options.length - 1;
        }
      }

      $highlighted.removeClass('active_row');
      $highlighted = $($options[selectionRowIndex]);
      $highlighted.addClass('active_row');
      $highlighted[0].scrollIntoView();

      return false;
    } else if (keyCode === BUTTON_TAB) {
      // If we have a selection, put focus on "Select" button. If dialog
      // buttons are in focus, go back to time zone selection.
      if (
        $doneButton.is(':focus') ||
        $doneButton.hasClass('remote_selection') ||
        $cancelButton.is(':focus') ||
        $cancelButton.hasClass('remote_selection')
      ) {
        // Move focus to back to time zone selection.
        $doneButton.removeClass('remote_selection');
        $cancelButton.removeClass('remote_selection');
        $highlighted = $currentSelection;

        if ($highlighted.length === 0) {
          // Pick the first one.
          $highlighted = $options.first();
        }

        $highlighted.addClass('active_row').focus();

        return false;
      } else if ($currentSelection.length > 0) {
        $doneButton.removeClass('remote_selection');
        $highlighted.removeClass('active_row');
        $cancelButton.addClass('remote_selection').focus();
      }

      return false;
    } else if (keyCode === BUTTON_LEFT || keyCode === BUTTON_RIGHT) {
      // If one of the dialog buttons is in focus, we should execute the proper action.
      if (
        $doneButton.is(':focus') ||
        $doneButton.hasClass('remote_selection')
      ) {
        // Move focus to other dialog button.
        $doneButton.removeClass('remote_selection');
        $cancelButton.addClass('remote_selection').focus();
        return false;
      } else if (
        $cancelButton.is(':focus') ||
        $cancelButton.hasClass('remote_selection')
      ) {
        // Move focus to other dialog button.
        $cancelButton.removeClass('remote_selection');
        $doneButton.addClass('remote_selection').focus();
        return false;
      }
    } else if (keyCode === BUTTON_OK) {
      // If one of the dialog buttons is in focus, we should execute the proper action.
      if (
        $doneButton.is(':focus') ||
        $doneButton.hasClass('remote_selection')
      ) {
        // Execute dialog.
        FWI_Advanced.executeTimeZoneDialog();
      } else if (
        $cancelButton.is(':focus') ||
        $cancelButton.hasClass('remote_selection')
      ) {
        // Cancel dialog.
        FWI_Advanced.cancelTimeZoneDialog();
      } else {
        // Select current active option.
        if ($currentSelection[0] !== $highlighted[0]) {
          $currentSelection.removeClass('current_selection');
          $highlighted.addClass('current_selection');
        }

        // Put focus on "Select" button.
        $highlighted.removeClass('active_row');
        $cancelButton.removeClass('remote_selection');
        $doneButton.addClass('remote_selection').focus();
      }

      return false;
    } else if (keyCode === BUTTON_CANCEL || keyCode === BUTTON_ESC) {
      // Close dialog.
      FWI_Advanced.cancelTimeZoneDialog();

      return false;
    } else {
      return true;
    }
  },

  // Sets the network configuration and updates the UI with a message.
  _setNetworkConfiguration: function(networkInfo) {
    var onError = function() {
      FWI_Advanced.setStaticIpMessage(
        FWI_Localization.getResource(
          'browserBased',
          'message_errorUpdatingNetworkConfiguration',
          'Error Updating Network Configuration'
        ),
        'error'
      );
    };
    var onSuccess = function() {
      FWI_Advanced.setStaticIpMessage(
        FWI_Localization.getResource(
          'browserBased',
          'message_networkConfigurationUpdated',
          'Network Configuration Updated'
        ),
        'success'
      );

      // Update network configuration settings.
      this.networkInfo = networkInfo;
      HOST_DEVICE.setSetting('network_info', JSON.stringify(networkInfo));
    };

    HOST_DEVICE.setNetworkConfiguration(networkInfo, onSuccess, onError);
  },

  tabUnfocus: function() {
    this.resetInputs();
  },

  init: function() {
    FWI_App.log('Initializing Advanced', 'DEBUG');
    FWI_App.log('Advanced bind elements', 'DEBUG');

    var previousLogUploadTimestamp = HOST_DEVICE.getSetting(
      'mon_logs_timestamp'
    );

    if (previousLogUploadTimestamp) {
      FWI_Monitoring.monLogsTimestamp = new Date(previousLogUploadTimestamp);
    }
    FWI_App.log(
      'Initial advanced init monLogsTimestamp: ' +
        FWI_Monitoring.monLogsTimestamp,
      'DEBUG'
    );
    // Bind Inputs
    this.bindAdvancedElements();
    FWI_App.log('Advanced labels', 'DEBUG');
    // Update labels.
    $('#advanced_static_ip_use_static_ip').text(
      FWI_Localization.getResource(
        'browserBased',
        'label_useStaticIpAddress',
        'Use a static IP address'
      )
    );
    $('#advanced_static_ip_ip_address').text(
      FWI_Localization.getResource(
        'browserBased',
        'label_ipAddress',
        'IP address'
      )
    );
    $('#advanced_static_ip_subnet_mask').text(
      FWI_Localization.getResource(
        'browserBased',
        'label_subnetMask',
        'Subnet mask'
      )
    );
    $('#advanced_static_ip_default_gateway').text(
      FWI_Localization.getResource(
        'browserBased',
        'label_defaultGateway',
        'Def. gateway'
      )
    );
    $('#advanced_static_ip_dns_1').text(
      FWI_Localization.getResource('browserBased', 'label_dns1', 'DNS 1')
    );
    $('#advanced_static_ip_dns_2').text(
      FWI_Localization.getResource('browserBased', 'label_dns2', 'DNS 3')
    );
    $('#advanced_static_ip_dns_3').text(
      FWI_Localization.getResource('browserBased', 'label_dns3', 'DNS 2')
    );
    $('#advanced_time_zone').text(
      FWI_Localization.getResource(
        'browserBased',
        'label_timeZone',
        'Time Zone'
      )
    );
    $('#advanced_time_server').text(
      FWI_Localization.getResource(
        'browserBased',
        'label_timeServer',
        'Time Server'
      )
    );
    FWI_App.log('Advanced time configuration support', 'DEBUG');
    if (HOST_DEVICE.isTimeConfigurationSupported()) {
      var timeZones = HOST_DEVICE.getSupportedTimeZones();
      var $timeZoneArea = $('.time_zone_modal .time_zone_options ul');

      for (var index = 0; index < timeZones.length; ++index) {
        var timeZone = timeZones[index];
        var timeZoneLabel = FWI_Localization.getResource(
          'browserBased',
          'timeZone_' + timeZone,
          timeZone
        );
        var $timeZone = $(
          '<li data-remote-index="y" data-setting="' +
            FWI_Helper.encodeHtml(timeZone) +
            '"></li>'
        );

        $timeZone.text(timeZoneLabel);
        $timeZone.appendTo($timeZoneArea);
        $timeZone.on(
          'click',
          $.proxy(
            function($elt) {
              // Select new time zone unless already selected.
              if (!$elt.hasClass('current_selection')) {
                // Deselect previous selection.
                $elt
                  .parent()
                  .find('li.current_selection')
                  .removeClass('current_selection');
                $elt.addClass('current_selection');
              }
            },
            null,
            $timeZone
          )
        );
      }

      this.timeServer = HOST_DEVICE.getSetting('time_server');

      if (typeof this.timeServer !== 'string') {
        // We allow an empty string but use a default time server initially.
        this.timeServer = HOST_DEVICE.getDefaultTimeServer();
      }

      this.timeZone = HOST_DEVICE.getSetting('time_zone');
    } else {
      $('.time_section').hide();
    }
    FWI_App.log('Advanced more labels', 'DEBUG');

    // Read settings.
    this.advEnabled = HOST_DEVICE.getSetting('adv_enabled') === true.toString();
    this.advHost = HOST_DEVICE.getSetting('adv_host');
    this.advComp = HOST_DEVICE.getSetting('adv_comp');
    this.advUser = HOST_DEVICE.getSetting('adv_user');
    this.advPass = FWI_Helper.decrypt(
      HOST_DEVICE.getSetting('adv_pass'),
      HOST_DEVICE.getDeviceId()
    );
    FWI_App.log('Advanced check static IP support', 'DEBUG');
    // Check for static IP address support.
    if (HOST_DEVICE.isStaticIpSupported()) {
      var networkInfo = HOST_DEVICE.getSetting('network_info');

      this.networkInfo = networkInfo ? JSON.parse(networkInfo) : {};
      this.staticIpEnabled = this.networkInfo.useStaticIpAddress;
    } else {
      $('.static_ip_section').hide();
    }
    FWI_App.log('Advanced reset inputs', 'DEBUG');
    // Reset inputs to stored values.
    this.resetInputs();
    FWI_App.log('Advanced enable/disable services', 'DEBUG');
    /* Cached soap creds Init */
    if (this.advUser) {
      this.enableServices();
    } else {
      this.disableServices();
    }
    FWI_App.log('Advanced initialized', 'DEBUG');
  }
};
