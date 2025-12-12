var FWI_Software = {
  accessCode: null,
  softwareUrl: null,
  softwareUpdatesEnabled: false,
  softwareUpdatesTime: null,
  softwareUpdatesTimestamp: null,
  softwareUpdateDateTime: null, // Last time a software update check was performed (as an ISO 8601 string).

  /* Access Code */
  clearAccessCode: function() {
    this.accessCode = '';
    HOST_DEVICE.setSetting('access_code', '');
    this.accessCodeDisabled();
    FWI_Shadow.updateShadow();
    FWI_App.log('Access Code - access code is cleared');
  },
  /* Set Code after Successful Validate */
  setAccessCode: function(code) {
    this.accessCode = code;
    HOST_DEVICE.setSetting('access_code', code);
    this.accessCodeEnabled();
    FWI_Shadow.updateShadow();
    FWI_App.log('Access Code - access code is set + saved');
  },
  /* Toggle Code Buttons */
  accessCodeEnabled: function() {
    $('.code_is_not_set').hide();
    $('.code_is_set').show();
  },

  accessCodeDisabled: function() {
    $('.code_is_set').hide();
    $('.code_is_not_set').show();
  },
  /* Reset Inputs on clear-button press + modal close */
  clearAccessInputs: function() {
    $(
      '.modal_active .modal_settings_row input.modal_access_digit[data-remote-index]:visible:not(:disabled)'
    ).val('');
    $(
      '.modal_active .modal_settings_row input.modal_access_digit[data-remote-index]:visible:not(:disabled,:first)'
    ).prop('disabled', true);
  },

  /* Adds Code Error MSG */
  setModalMessage: function(msg) {
    $('.modal_active .modal_message').show();
    $('.modal_active .modal_message p').text(msg);
  },
  /* Disable Modal */
  disableModal: function() {
    $('.modal_active').removeClass('modal_active');
    $('html').removeClass('modal_on');
    $('.modal_message').hide();
    FWI_Settings.currentSelection = 'main';
    FWI_Settings.focusActiveRow();
  },
  /* Disable Modal/Clear Digits */
  disableAccessModal: function() {
    FWI_Software.clearAccessInputs();

    // Clear any error.
    $('.modal_active .modal_message p').text('');

    $('.modal_active').removeClass('modal_active');
    $('html').removeClass('modal_on');
    $('.modal_message').hide();
    FWI_Settings.currentSelection = 'main';
    FWI_Settings.focusActiveRow();
  },

  /* CheckSoftware */
  setSoftwareUrl: function(url) {
    if (url !== this.softwareUrl) {
      // Software URL changed
      this.softwareUrl = url;
      HOST_DEVICE.setSetting('software_url', url);
      HOST_DEVICE.removeSetting('softwareUpdateCheckTime'); // Remove last check time, since location changed.
    }

    $('input[name="software_updates_url"]').val(url);
    FWI_Shadow.updateShadow();
    FWI_App.log('Software Update - software_url is set + saved ' + url);
  },
  /* Verify URL, enable/disable Check Now */
  softwareUrlVerified: function() {
    this.setSoftwareUrl($('input[name="software_updates_url"]').val());
    $('.setting_software_url .require_verify')
      .prop('disabled', false)
      .removeAttr('disabled');
    $('.software_url_message')
      .parent()
      .addClass('success')
      .removeClass('icon_fail')
      .removeClass('need_validation');
  },
  softwareUrlNotVerified: function() {
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
  },
  /* software URL Changed */
  softwareUrlNeedsValidate: function() {
    $('.software_url_message')
      .parent()
      .addClass('need_validation')
      .removeClass('success')
      .removeClass('icon_fail');
  },

  validateSoftwareURL: function() {
    var url = $('input[name="software_updates_url"]').val();

    if (FWI_Validate.validateURL(url)) {
      var onSuccess = function() {
        FWI_Software.softwareUrlVerified();
        HOST_DEVICE.setLauncherURL(url);
        $('button.software_updates_url_verify').prop('disabled', false);
      };
      var onError = function() {
        FWI_Software.softwareUrlNotVerified();
        $('button.software_updates_url_verify').prop('disabled', false);
      };

      $('button.software_updates_url_verify').prop('disabled', true);
      HOST_DEVICE.validateSoftwareUpdate(url, onSuccess, onError);
    } else {
      FWI_Software.softwareUrlNotVerified();
    }
  }, 

  /* software Reset */
  softwareUrlReset: function() {
    if (FWI_Software.softwareUrl) {
      $('input[name="software_updates_url"]').val(FWI_Software.softwareUrl);
      $('.software_url_message')
        .parent()
        .addClass('success')
        .removeClass('need_validation')
        .removeClass('icon_fail');
    } else {
      $('input[name="software_updates_url"]').val('');
      $('.software_url_message')
        .parent()
        .removeClass('success')
        .removeClass('need_validation')
        .addClass('icon_fail');
    }
  },
  /* Set Message */
  setCheckSoftwareMsg: function(msg, status) {
    if (msg) {
      $('.software_timestamp').hide();
      $('.software_update_message').css('display', 'table-cell');

      if (status === 'success') {
        $('.software_update_message')
          .html(msg)
          .closest('.status_msg')
          .removeClass('error')
          .addClass('success');
        /* Remove after 7sec */
        setTimeout(function() {
          if ($('.status_msg.success .software_update_message').length) {
            $('.software_update_message')
              .html('')
              .hide();
            $('.software_timestamp').fadeIn();
          }
        }, 7000);
      } else {
        $('.software_update_message')
          .html(msg)
          .closest('.status_msg')
          .removeClass('success')
          .addClass('error');
      }
    }
    $('button.software_updates_url_checknow').prop('disabled', false);
    FWI_App.log('Software Update - Upgrade message: ' + msg);
  },
  /* Enable Auto Check */
  checkForUpdatesEnabled: function() {
    $('.setting_software_url .require_enable')
      .prop('disabled', false)
      .removeAttr('disabled');
    $('input#software_updates_enable')
      .prop('checked', true)
      .closest('label')
      .addClass('checkbox_label_checked');
    FWI_Software.softwareUpdatesEnabled = true;
    HOST_DEVICE.setSetting('software_updates_enable', true.toString());
    FWI_Shadow.updateShadow();
    FWI_App.log('Software checkForUpdatesEnabled - Success');
  },
  /* Disable Auto Check */
  checkForUpdatesDisabled: function() {
    $('.setting_software_url .require_enable')
      .attr('disabled', '')
      .prop('disabled', true);
    $('input#software_updates_enable')
      .prop('checked', false)
      .closest('label')
      .removeClass('checkbox_label_checked');
    FWI_Software.softwareUpdatesEnabled = false;
    HOST_DEVICE.setSetting('software_updates_enable', false.toString());
    FWI_Shadow.updateShadow();
    FWI_App.log('Software checkForUpdatesDisabled - Success');
  },
  /* Set Time after Validation */
  setUpdateTime: function(time) {
    FWI_Software.softwareUpdatesTime = time;
    HOST_DEVICE.setSetting(
      'software_updates_time',
      time ? time.toString() : null
    );

    FWI_Shadow.updateShadow();
  },
  /* Set Time for RemoteCMD */
  setUpdateTimeUpdNum: function(time) {
    $('.software_updates_time input[name="software_updates_hour1"]').val(
      time.charAt(0)
    );
    $('.software_updates_time input[name="software_updates_hour2"]').val(
      time.charAt(1)
    );
    $('.software_updates_time input[name="software_updates_minute1"]').val(
      time.charAt(3)
    );
    $('.software_updates_time input[name="software_updates_minute2"]').val(
      time.charAt(4)
    );

    if (time.indexOf('PM') !== -1) {
      $(
        '.setting_software_url .time_picker input[name="software_updates_ampm"]'
      ).prop('checked', true);
    } else {
      $(
        '.setting_software_url .time_picker input[name="software_updates_ampm"]'
      ).prop('checked', false);
    }

    FWI_Software.softwareUpdatesTime = time;
    HOST_DEVICE.setSetting(
      'software_updates_time',
      time ? time.toString() : null
    );

    FWI_Shadow.updateShadow();
  },
  resetTimers: function() {
    /* Remove validation errors, fill last validated time */
    $('.setting_software_url .time_picker input').removeClass('unfocus_error');

    if (this.softwareUpdatesTime && this.softwareUpdatesTime.length === 8) {
      // Enable cron timer
      $('.software_updates_time input[name="software_updates_hour1"]').val(
        this.softwareUpdatesTime.charAt(0)
      );
      $('.software_updates_time input[name="software_updates_hour2"]').val(
        this.softwareUpdatesTime.charAt(1)
      );
      $('.software_updates_time input[name="software_updates_minute1"]').val(
        this.softwareUpdatesTime.charAt(3)
      );
      $('.software_updates_time input[name="software_updates_minute2"]').val(
        this.softwareUpdatesTime.charAt(4)
      );

      if (this.softwareUpdatesTime.indexOf('PM') !== -1) {
        $(
          '.setting_software_url .time_picker input[name="software_updates_ampm"]'
        ).prop('checked', true);
      }
    }
  },

  bindSoftwareElements: function() {
    /* Set or Change Access Code */
    $('button.set_access_code, button.change_access_code').on(
      'click',
      function() {
        var modalHeading = $(this).text();

        $('.access_code_set_modal')
          .addClass('modal_active')
          .find('h2')
          .text(modalHeading);
        FWI_App.enableModal();
      }
    );
    $('.access_code_set_modal button.access_code_cancel').on(
      'click',
      function() {
        FWI_Software.disableAccessModal();
      }
    );
    $('.access_code_set_modal button.access_code_clear').on(
      'click',
      function() {
        FWI_Software.clearAccessInputs();
      }
    );
    $('.access_code_set_modal button.access_code_done').on('click', function() {
      if (FWI_Settings.checkAccessCode(true)) {
        FWI_Software.disableAccessModal();
      }
    });

    /* Remove Access Code */
    $('button.remove_access_code').on('click', function() {
      $('.access_code_remove_modal').addClass('modal_active');
      FWI_App.enableModal();
    });
    $('.access_code_remove_modal button.access_code_cancel').on(
      'click',
      function() {
        $('.modal_active').removeClass('modal_active');
        $('html').removeClass('modal_on');
        FWI_Software.disableAccessModal();
      }
    );
    $('.access_code_remove_modal button.access_code_remove').on(
      'click',
      function() {
        $('.modal_active').removeClass('modal_active');
        $('html').removeClass('modal_on');
        FWI_Software.clearAccessCode();
        FWI_Software.disableAccessModal();
      }
    );

    /* Software URL */
    /* Detect Input Change, revalidate */
    $('input[name="software_updates_url"]').on('input', function() {
      FWI_Software.softwareUrlNeedsValidate();
    });
    /* Detect checkbox */
    $('input#software_updates_enable').change(function() {
      $('.setting_software_url .time_picker input.time_digit:first').trigger(
        'change'
      );

      if ($(this).is(':checked')) {
        FWI_Software.checkForUpdatesEnabled();
      } else {
        FWI_Software.checkForUpdatesDisabled();
      }
    });
    /* Time inputs change function */
    $(
      '.setting_software_url .time_picker input.time_digit, .setting_software_url .time_picker input[name="software_updates_ampm"]'
    ).change(function() {
      var h1 = $(
        '.setting_software_url .time_picker input[name="software_updates_hour1"]'
      ).val();
      var h2 = $(
        '.setting_software_url .time_picker input[name="software_updates_hour2"]'
      ).val();
      var m1 = $(
        '.setting_software_url .time_picker input[name="software_updates_minute1"]'
      ).val();
      var m2 = $(
        '.setting_software_url .time_picker input[name="software_updates_minute2"]'
      ).val();
      var ampm = $(
        '.setting_software_url .time_picker input[name="software_updates_ampm"]:checked'
      ).length;

      if (ampm) {
        ampm = ' PM';
      } else {
        ampm = ' AM';
      }

      var format_time = h1 + h2 + ':' + m1 + m2 + ampm;

      if (FWI_Validate.softwareTime(h1, h2, m1, m2)) {
        FWI_Software.setUpdateTime(format_time);
        $('.setting_software_url .time_picker input').removeClass(
          'unfocus_error'
        );
        FWI_App.log(
          'Software Update - Software Time Validates, saving - ' + format_time
        );
      } else {
        $('.setting_software_url .time_picker input').addClass('unfocus_error');
        FWI_App.log(
          'Software Update - Software Time Does not Validate, saving - ' +
            format_time
        );
      }
    });

    /* Validate the url, set software update location */
    $('button.software_updates_url_verify').on('click', function() {
        FWI_Software.validateSoftwareURL();
    });
    /* Display Confirm/Cancel Update modal */
    $('button.software_updates_url_checknow').on('click', function() {
      $('.software_update_now_modal').addClass('modal_active');
      FWI_App.enableModal();
    });
    /* Cancel update */
    $('.software_update_now_modal .software_cancel').on('click', function() {
      FWI_Software.disableModal();
    });
    /* Confirm update */
    $('.software_update_now_modal .software_upgrade').on('click', function() {
      FWI_Software.setCheckSoftwareMsg('Checking Now...', 'success');
      $('button.software_updates_url_checknow').prop('disabled', true);

      FWI_Software.softwareUpdateDateTime = FWI_Helper.getDateIsoStr();
      HOST_DEVICE.checkSoftwareNow();
      FWI_Software.disableModal();
    });
  },

  tabUnfocus: function() {
    /* Clear validation / incomplete states */
    this.softwareUrlReset();
    this.resetTimers();
  },

  init: function() {
    FWI_App.log('Initializing Software', 'DEBUG');
    /* Bind Inputs */
    this.bindSoftwareElements();

    // Read settings.
    this.accessCode = HOST_DEVICE.getSetting('access_code');
    this.softwareUrl = HOST_DEVICE.getSetting('software_url');
    this.softwareUpdatesEnabled =
      HOST_DEVICE.getSetting('software_updates_enable') === true.toString();
    this.softwareUpdatesTime = HOST_DEVICE.getSetting('software_updates_time');
    this.softwareUpdatesTimestamp = HOST_DEVICE.getSetting(
      'software_updates_timestamp'
    );

    // Access code buttons
    if (this.accessCode) {
      this.accessCodeEnabled();
      FWI_App.log('Configuration access code: ' + FWI_Software.accessCode);
    } else {
      this.accessCodeDisabled();
    }

    // Hide software update section if the app doesn't support it.
    if (HOST_DEVICE.isSoftwareUpdateSupported()) {
      if (this.softwareUrl) {
        // Enable software update fields
        $('input[name="software_updates_url"]').val(this.softwareUrl);
        FWI_Software.softwareUrlVerified();
      }

      this.resetTimers();

      if (this.softwareUpdatesEnabled) {
        FWI_Software.checkForUpdatesEnabled();
      }

      if (this.softwareUpdatesTimestamp) {
        $('.software_timestamp').html(this.softwareUpdatesTimestamp);
      }
    } else {
      // Hide software update section and separator
      $('.setting_software_url').hide();
      $('.setting_software_url')
        .siblings('hr')
        .first()
        .hide();
    }
    FWI_App.log('Software initialized', 'DEBUG');
  }
};
