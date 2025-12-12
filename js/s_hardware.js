var FWI_Hardware = {
  freeSpace: null,
  IP: null,
  IPHost: null,
  Alias: null,
  MAC: null,
  MACHost: null,
  Serial: null,
  deviceOrientation: null,
  deviceOrientationChanged: false,
  volumeLevel: 0,

  firmwareURL: null,
  firmwareUpdatesEnabled: false,
  firmwareUpdatesTime: null,
  firmwareUpdatesTimestamp: null,
  firmwareActive: false,

  rebootEnabled: false,
  rebootTime: null,

  onOffTimersEnabled: false,
  onOffTimers: null,
  timerListOn: '',
  timerListOff: '',
  display_on: true,

  /* Rotate With Native Portrait - Use Hardware Screen or Yellow Remote Button */
  changeDeviceOrientation: function(changeTo) {
    if (
      changeTo &&
      (changeTo == '0' ||
        changeTo == '90' ||
        changeTo == '180' ||
        changeTo == '270')
    ) {
      /* Change to specific value */
      HOST_DEVICE.setOrientation('DEGREE_' + changeTo);
      FWI_Shadow.updateShadow(
        'Orientation',
        FWI_Helper.convertOrientationForShadow('DEGREE_' + changeTo)
      );
    } else {
      /* Toggle */
      var nextOrientation;
      switch (HOST_DEVICE.getSetting('orientation')) {
        case 'DEGREE_0':
          nextOrientation = 'DEGREE_90';
          break;
        case 'DEGREE_90':
          nextOrientation = 'DEGREE_180';
          break;
        case 'DEGREE_180':
          nextOrientation = 'DEGREE_270';
          break;
        case 'DEGREE_270':
          nextOrientation = 'DEGREE_0';
          break;
        default:
          nextOrientation = 'DEGREE_90';
          break;
      }
      HOST_DEVICE.setOrientation(nextOrientation);

      FWI_Shadow.updateShadow(
        'Orientation',
        FWI_Helper.convertOrientationForShadow(nextOrientation)
      );
    }
  },
  // Summary: Updates the progress od the firmware download on the screen.
  reportFirmwareDownloadProgress: function(progressPercent) {
    $('.firmware_progress_message .prog_bar .prog_bar_dl')
      .width(progressPercent + '%')
      .html(progressPercent + '%');
  },

  resetTimers: function() {
    /* Remove validation errors, fill last validated time; resets Reboot + Firmware */
    $('.setting_hardware_reboot .time_picker input').removeClass(
      'unfocus_error'
    );

    if (this.rebootTime && this.rebootTime.length === 8) {
      $('.setting_hardware_reboot input[name="hardware_reboot_hour1"]').val(
        this.rebootTime.charAt(0)
      );
      $('.setting_hardware_reboot input[name="hardware_reboot_hour2"]').val(
        this.rebootTime.charAt(1)
      );
      $('.setting_hardware_reboot input[name="hardware_reboot_minute1"]').val(
        this.rebootTime.charAt(3)
      );
      $('.setting_hardware_reboot input[name="hardware_reboot_minute2"]').val(
        this.rebootTime.charAt(4)
      );

      if (this.rebootTime.indexOf('PM') !== -1) {
        $(
          '.setting_hardware_reboot .time_picker input[name="hardware_reboot_ampm"]'
        ).prop('checked', true);
      }
    }

    $('.setting_firmware_update .time_picker input').removeClass(
      'unfocus_error'
    );

    if (this.firmwareUpdatesTime && this.firmwareUpdatesTime !== '') {
      if (this.firmwareUpdatesTime.length == 8) {
        $('.hardware_firmware_time input[name="hardware_firmware_hour1"]').val(
          this.firmwareUpdatesTime.charAt(0)
        );
        $('.hardware_firmware_time input[name="hardware_firmware_hour2"]').val(
          this.firmwareUpdatesTime.charAt(1)
        );
        $(
          '.hardware_firmware_time input[name="hardware_firmware_minute1"]'
        ).val(this.firmwareUpdatesTime.charAt(3));
        $(
          '.hardware_firmware_time input[name="hardware_firmware_minute2"]'
        ).val(this.firmwareUpdatesTime.charAt(4));
        if (this.firmwareUpdatesTime.indexOf('PM') !== -1) {
          $(
            '.hardware_firmware_time .time_picker input[name="hardware_firmware_ampm"]'
          ).prop('checked', true);
        }
      }
    }
  },

  /* Reboot Enable */
  hardwareRebootEnabled: function() {
    $('.setting_hardware_reboot .require_enable')
      .prop('disabled', false)
      .removeAttr('disabled');
    $('input#hardware_reboot_enable')
      .prop('checked', true)
      .closest('label')
      .addClass('checkbox_label_checked');
    $('.reboot-helper').css('visibility', 'visible');
    FWI_Hardware.rebootEnabled = true;
    HOST_DEVICE.setSetting('reboot_enabled', true.toString());
    FWI_Shadow.updateShadow();
    FWI_App.log('hardwareRebootEnabled - Success');
  },
  /* Reboot Disable */
  hardwareRebootDisabled: function() {
    $('.setting_hardware_reboot .require_enable')
      .attr('disabled', '')
      .prop('disabled', true);
    $('input#hardware_reboot_enable')
      .prop('checked', false)
      .closest('label')
      .removeClass('checkbox_label_checked');
    $('.reboot-helper').css('visibility', 'hidden');
    FWI_Hardware.rebootEnabled = false;
    HOST_DEVICE.setSetting('reboot_enabled', false.toString());
    FWI_Shadow.updateShadow();
    FWI_App.log('hardwareRebootDisabled - Success');
  },

  /* Set Time Locally */
  setRebootTime: function(time) {
    FWI_Hardware.rebootTime = time;
    var rebootWindowOffset = 60; //mins
    var logLevel = 'INFO';

    //eslint-disable-next-line
    if ('19' === 'dev') {
      rebootWindowOffset = 5;
      logLevel = 'WARN';
    }

    var rebootWindowStartTime = FWI_Helper.timeStringToDate(time);
    var rebootWindowEndTime = dateFns.format(
      dateFns.addMinutes(rebootWindowStartTime, rebootWindowOffset),
      'h:mm A'
    );

    var randomOffset = Math.floor(Math.random() * rebootWindowOffset);

    FWI_Hardware.randomRebootTime = dateFns.addMinutes(
      rebootWindowStartTime,
      randomOffset
    );

    FWI_App.log({
      msg:
        'Randomized reboot time set to ' +
        FWI_Hardware.randomRebootTime +
        ' based on offset of up to ' +
        rebootWindowOffset +
        ' min.',
      level: logLevel
    });

    HOST_DEVICE.setSetting('reboot_time', time.toString());
    $('.reboot-start-window').text(FWI_Hardware.rebootTime);
    $('.reboot-end-window').text(rebootWindowEndTime);
    FWI_Shadow.updateShadow(
      'RebootTime',
      FWI_Helper.time12to24(time.toString())
    );
  },
  /* Update numbers - for Remote CMD */
  setRebootTimeUpdNum: function(time) {
    $('.setting_hardware_reboot input[name="hardware_reboot_hour1"]').val(
      time.charAt(0)
    );
    $('.setting_hardware_reboot input[name="hardware_reboot_hour2"]').val(
      time.charAt(1)
    );
    $('.setting_hardware_reboot input[name="hardware_reboot_minute1"]').val(
      time.charAt(3)
    );
    $('.setting_hardware_reboot input[name="hardware_reboot_minute2"]').val(
      time.charAt(4)
    );

    if (time.indexOf('PM') !== -1) {
      $(
        '.setting_hardware_reboot .time_picker input[name="hardware_reboot_ampm"]'
      ).prop('checked', true);
    } else {
      $(
        '.setting_hardware_reboot .time_picker input[name="hardware_reboot_ampm"]'
      ).prop('checked', false);
    }

    FWI_Hardware.setRebootTime(time.toString());
    FWI_Shadow.updateShadow();
  },

  // TODO: Is this needed? I can't find it being used anywhere.
  setSetting: function() {
    var url = $('input[name="firmware_updates_url"]').val();

    this.firmwareURL = url;
    HOST_DEVICE.setSetting('firmware_url', url);
    FWI_App.log('Firmware Url - is set + saved: ' + url);
    $('.setting_firmware_update .require_verify')
      .prop('disabled', false)
      .removeAttr('disabled');
    $('.firmware_url_message')
      .parent()
      .addClass('success')
      .removeClass('icon_fail')
      .removeClass('need_validation');
  },

  setFirmwareUrl: function(url) {
    this.firmwareURL = url;
    HOST_DEVICE.setSetting('firmware_url', url, function() {
      FWI_App.log('Firmware Url - is set + saved: ' + url);
    });

    FWI_Shadow.updateShadow();
    $('input[name="firmware_updates_url"]').val(url);
    //TODO: enable the check for update button too.
  },

  firmwareUrlVerified: function() {
    this.setFirmwareUrl($('input[name="firmware_updates_url"]').val());
    $('.setting_firmware_update .require_verify')
      .prop('disabled', false)
      .removeAttr('disabled');
    $('.firmware_url_message')
      .parent()
      .addClass('success')
      .removeClass('icon_fail')
      .removeClass('need_validation');
  },

  firmwareUrlNotVerified: function() {
    if (!FWI_Hardware.firmwareURL) {
      $('.setting_firmware_update .require_verify')
        .attr('disabled', '')
        .prop('disabled', true);
      FWI_Hardware.checkForFirmwareUpdatesDisabled();
    }

    $('.firmware_url_message')
      .parent()
      .removeClass('success')
      .removeClass('need_validation')
      .addClass('icon_fail');
  },
  /* Firmware URL Changed */
  firmwareUrlNeedsValidate: function() {
    $('.firmware_url_message')
      .parent()
      .addClass('need_validation')
      .removeClass('success')
      .removeClass('icon_fail');
  },
  /* Firmware Reset */
  firmwareUrlReset: function() {
    if (FWI_Hardware.firmwareURL) {
      $('input[name="firmware_updates_url"]').val(FWI_Hardware.firmwareURL);
      $('.firmware_url_message')
        .parent()
        .addClass('success')
        .removeClass('need_validation')
        .removeClass('icon_fail');
    } else {
      $('input[name="firmware_updates_url"]').val('');
      $('.firmware_url_message')
        .parent()
        .removeClass('success')
        .removeClass('need_validation')
        .addClass('icon_fail');
    }
  },
  /* Enable Updated */
  checkForFirmwareUpdatesEnabled: function() {
    $('.setting_firmware_update .require_enable')
      .prop('disabled', false)
      .removeAttr('disabled');
    $('input#hardware_firmware_enable')
      .prop('checked', true)
      .closest('label')
      .addClass('checkbox_label_checked');
    FWI_Hardware.firmwareUpdatesEnabled = true;
    HOST_DEVICE.setSetting('firmware_updates_enabled', true.toString());
    FWI_Shadow.updateShadow();
    FWI_App.log('checkForFirmwareUpdatesEnabled - Success');
  },
  /* Disable Updated */
  checkForFirmwareUpdatesDisabled: function() {
    $('.setting_firmware_update .require_enable')
      .attr('disabled', '')
      .prop('disabled', true);
    $('input#hardware_firmware_enable')
      .prop('checked', false)
      .closest('label')
      .removeClass('checkbox_label_checked');
    FWI_Hardware.firmwareUpdatesEnabled = false;
    HOST_DEVICE.setSetting('firmware_updates_enabled', false.toString());
    FWI_Shadow.updateShadow();
    FWI_App.log('checkForFirmwareUpdatesDisabled - Success');
  },
  /* Begin Download and Update, make sure at least 650mb avail */
  checkFirmwareNow: function() {
    FWI_Hardware.updateCheckFirmwareMsg('Checking Now...', 'success');
    $('button.hardware_firmware_url_checknow').prop('disabled', true);
    HOST_DEVICE.updateFirmware(function() {
      $('button.hardware_firmware_url_checknow').prop('disabled', false);
    });
  },
  /* Set Message */
  updateCheckFirmwareMsg: function(msg, status) {
    if (msg) {
      $('.firmware_timestamp').hide();
      $('.firmware_update_message').show();

      if (status === 'success') {
        $('.firmware_update_message')
          .html(msg)
          .closest('.status_msg')
          .removeClass('error')
          .addClass('success');
        /* Remove after 7sec, show timestamp */
        setTimeout(function() {
          if ($('.status_msg.success .firmware_update_message').length) {
            $('.firmware_update_message')
              .html('')
              .hide();
            $('.firmware_timestamp').fadeIn();
          }
        }, 7000);
      } else {
        $('.firmware_update_message')
          .html(msg)
          .closest('.status_msg')
          .removeClass('success')
          .addClass('error');
      }
      FWI_App.log('firmware_update_message: ' + msg);
      $('button.hardware_firmware_url_checknow').prop('disabled', true);
    }
  },
  /* Progress Message */
  updateCheckFirmwareProgressMsg: function(msg) {
    $('.firmware_progress_message').show();
    $('.firmware_progress_message .prog_msg').html(msg);
    FWI_App.log('firmware_progress_message: ' + msg);
  },
  /* Set Time Locally */
  setFirmwareTime: function(time) {
    FWI_Hardware.firmwareUpdatesTime = time;
    HOST_DEVICE.setSetting(
      'firmware_updates_time',
      time ? time.toString() : null
    );
    FWI_Shadow.updateShadow(
      'CheckForHardwareUpdateTime',
      FWI_Helper.time12to24(time)
    );
  },
  /* Set Time for RemoteCMD */
  setFirmwareTimeUpdNum: function(time) {
    $(
      '.setting_firmware_update .time_picker input[name="hardware_firmware_hour1"]'
    ).val(time.charAt(0));
    $(
      '.setting_firmware_update .time_picker input[name="hardware_firmware_hour2"]'
    ).val(time.charAt(1));
    $(
      '.setting_firmware_update .time_picker input[name="hardware_firmware_minute1"]'
    ).val(time.charAt(3));
    $(
      '.setting_firmware_update .time_picker input[name="hardware_firmware_minute2"]'
    ).val(time.charAt(4));

    if (time.indexOf('PM') !== -1) {
      $(
        '.setting_firmware_update .time_picker input[name="hardware_firmware_ampm"]'
      ).prop('checked', true);
    } else {
      $(
        '.setting_firmware_update .time_picker input[name="hardware_firmware_ampm"]'
      ).prop('checked', false);
    }
    FWI_Hardware.firmwareUpdatesTime = time;
    HOST_DEVICE.setSetting(
      'firmware_updates_time',
      time ? time.toString() : null
    );

    FWI_Shadow.updateShadow(
      'CheckForHardwareUpdateTime',
      FWI_Helper.time12to24(time)
    );
  },
  /* Firmware Upgrade Takeover, sssp only 1 phase */
  /* Firmware Upgrade Takeover, phase3, dont turn off TV */
  firmwareUpgradeModalP1: function() {
    FWI_App.log('Firmware Upgrade - Modal Appear');

    FWI_Hardware.firmwareActive = true;
    $('.wrap_player').hide();
    $('.wrap_access_code').hide();
    $('button.firmware_upgrade_cancel')
      .prop('disabled', true)
      .hide();

    $('.wrap_settings').show();
    $('.modal_takeover').fadeIn();

    $('.modal_takeover .hardware_firmware_lock_modal').addClass('modal_active');

    $('.firmware_stage.firmware-1').show();

    $('html').addClass('modal_on_fware');
    FWI_Settings.currentSelection = 'modal';
    FWI_Settings.focusModal();

    $('.firmware_stage.firmware-2').show();

    /* Save firmware timestamp */
    FWI_Hardware.firmwareUpdatesTimestamp = FWI_Helper.getTimestamp();
    HOST_DEVICE.setSetting(
      'firmware_updates_timestamp',
      FWI_Hardware.firmwareUpdatesTimestamp
    );
    $('.firmware_timestamp').html(FWI_Hardware.firmwareUpdatesTimestamp);
    $('.modal_takeover .hardware_firmware_lock_modal .firmware-2 p').html(
      'Please do not unplug or turn off device.<br>Device will reboot in a few minutes.'
    );

    // Show either progress bar or spinning icon depending on download progress support.
    if (!HOST_DEVICE.isDownloadProgressSupported()) {
      // Remove progress bar and show a spinning icon instead.
      var $progressArea = $('.firmware_progress_message');
      $progressArea.empty();
      $(
        '<img src="img/spinner-100x100.gif" border="0" style="width:100px;height:100px;"/>'
      ).appendTo($progressArea);
    }
  },
  /* Set cancel true, close modal, Scap looks for flag before upgrade */
  cancelFirmware: function() {
    HOST_DEVICE.cancelFirmwareUpdate();
    FWI_Hardware.firmwareActive = false;
    FWI_Hardware.closeFirmwareModal();
    $('button.hardware_firmware_url_checknow').prop('disabled', false);
    FWI_App.log('Firmware upgrade was canceled');
  },
  /* Close modal and reset firmware, may be called from cancel or error */
  closeFirmwareModal: function() {
    $('button.firmware_upgrade_cancel')
      .prop('disabled', false)
      .show();

    FWI_App.currentScreen = 'screen_settings';
    FWI_Settings.currentSetting = 'setting_hardware';

    $('.wrap_access_code').hide();
    $('.wrap_player').hide();
    $('.modal_takeover').hide();

    $('.wrap_settings').fadeIn();
    FWI_Settings.focusSettingTab('setting_hardware');
    $('.settings_content.active').scrollTop(0);
  },

  /* OnOff  Timers */
  /* Enable Timers */
  onOffTimersEnable: function() {
    HOST_DEVICE.setSetting('on_off_timers_enabled', true.toString());
    FWI_Hardware.onOffTimersEnabled = true;
    $('.setting_hardware_timers .require_enable')
      .prop('disabled', false)
      .removeAttr('disabled');
    $('input#hardware_timers_enable')
      .prop('checked', true)
      .closest('label')
      .addClass('checkbox_label_checked');
    FWI_App.log('onOffTimersEnable - enable all onOffTimers');
    FWI_Hardware.displayTimerListStart();
    FWI_Shadow.updateShadow();
  },
  /* Disable Timers */
  onOffTimersDisable: function() {
    HOST_DEVICE.setSetting('on_off_timers_enabled', false.toString());
    FWI_Hardware.onOffTimersEnabled = false;
    $('.setting_hardware_timers .require_enable')
      .attr('disabled', '')
      .prop('disabled', true);
    $('input#hardware_timers_enable')
      .prop('checked', false)
      .closest('label')
      .removeClass('checkbox_label_checked');
    FWI_App.log('onOffTimersDisable - disable all onOffTimers');
    FWI_Hardware.displayTimerListStart();
    FWI_Shadow.updateShadow();
  },
  /* Reset add timer modal */
  onOffTimersModalReset: function() {
    $(
      '.hardware_timer_create_modal .timer_power_on .time_picker input[name="hardware_timer_on_hour1"]'
    ).val(0);
    $(
      '.hardware_timer_create_modal .timer_power_on .time_picker input[name="hardware_timer_on_hour2"]'
    ).val(2);
    $(
      '.hardware_timer_create_modal .timer_power_on .time_picker input[name="hardware_timer_on_minute1"]'
    ).val(0);
    $(
      '.hardware_timer_create_modal .timer_power_on .time_picker input[name="hardware_timer_on_minute2"]'
    ).val(0);
    $(
      '.hardware_timer_create_modal .timer_power_on .time_picker input[name="hardware_timer_on_ampm"]'
    ).prop('checked', false);

    $(
      '.hardware_timer_create_modal .timer_power_off .time_picker input[name="hardware_timer_off_hour1"]'
    ).val(0);
    $(
      '.hardware_timer_create_modal .timer_power_off .time_picker input[name="hardware_timer_off_hour2"]'
    ).val(2);
    $(
      '.hardware_timer_create_modal .timer_power_off .time_picker input[name="hardware_timer_off_minute1"]'
    ).val(0);
    $(
      '.hardware_timer_create_modal .timer_power_off .time_picker input[name="hardware_timer_off_minute2"]'
    ).val(0);
    $(
      '.hardware_timer_create_modal .timer_power_off .time_picker input[name="hardware_timer_off_ampm"]'
    ).prop('checked', false);

    $("input[name='hardware_timer_days[]']:checked").prop('checked', false);
    $('.hardware_timer_create_modal .timer_days label').removeClass(
      'checkbox_label_checked'
    );
    $('.timer_power_submit .status_msg').hide();
  },
  /* Firmware Modal Enable */
  enableModal: function() {
    $('html').addClass('modal_on');
    FWI_Settings.currentSelection = 'modal';
    FWI_Settings.focusModal();
  },
  /* Firmware Modal Disable / Reset Inputs */
  disableModal: function() {
    $('.modal_active').removeClass('modal_active');
    $('html').removeClass('modal_on');
    $('.modal_message').hide();
    FWI_Settings.currentSelection = 'main';
    $('.setting_hardware_timers .settings_row:eq(1)')
      .addClass('active_row')
      .find('.hardware_timer_create')
      .addClass('remote_selection');
    FWI_Hardware.onOffTimersModalReset();
  },
  /* Update Modal Msg */
  updateTimerModalMsg: function(msg, status) {
    if (msg) {
      $('.timer_power_submit .status_msg').show();
      if (status === 'success') {
        $('.timer_power_message')
          .html(msg)
          .closest('.status_msg')
          .removeClass('error')
          .addClass('success');
        /* Remove after 7sec */
        setTimeout(function() {
          $('.timer_power_message').html('');
        }, 7000);
      } else {
        $('.timer_power_message')
          .html(msg)
          .closest('.status_msg')
          .removeClass('success')
          .addClass('error');
      }
    }
  },
  /* Validate Timer */
  validateTimerOn: function() {
    var h1 = $(
      '.hardware_timer_create_modal .timer_power_on .time_picker input[name="hardware_timer_on_hour1"]'
    ).val();
    var h2 = $(
      '.hardware_timer_create_modal .timer_power_on .time_picker input[name="hardware_timer_on_hour2"]'
    ).val();
    var m1 = $(
      '.hardware_timer_create_modal .timer_power_on .time_picker input[name="hardware_timer_on_minute1"]'
    ).val();
    var m2 = $(
      '.hardware_timer_create_modal .timer_power_on .time_picker input[name="hardware_timer_on_minute2"]'
    ).val();
    var ampm = $(
      '.hardware_timer_create_modal .timer_power_on .time_picker input[name="hardware_timer_on_ampm"]:checked'
    ).length;

    if (ampm) {
      ampm = ' PM';
    } else {
      ampm = ' AM';
    }

    var format_time = h1 + h2 + ':' + m1 + m2 + ampm;

    if (FWI_Validate.validateTime4(h1, h2, m1, m2)) {
      $(
        '.hardware_timer_create_modal .timer_power_on .time_picker input'
      ).removeClass('unfocus_error');
      FWI_App.log('Timer - ontime Validates - ' + format_time);

      return format_time;
    } else {
      $(
        '.hardware_timer_create_modal .timer_power_on .time_picker input'
      ).addClass('unfocus_error');
      FWI_App.log('Timer - ontime Does not Validate - ' + format_time);

      return false;
    }
  },
  /* Validate Timer */
  validateTimerOff: function() {
    var h1 = $(
      '.hardware_timer_create_modal .timer_power_off .time_picker input[name="hardware_timer_off_hour1"]'
    ).val();
    var h2 = $(
      '.hardware_timer_create_modal .timer_power_off .time_picker input[name="hardware_timer_off_hour2"]'
    ).val();
    var m1 = $(
      '.hardware_timer_create_modal .timer_power_off .time_picker input[name="hardware_timer_off_minute1"]'
    ).val();
    var m2 = $(
      '.hardware_timer_create_modal .timer_power_off .time_picker input[name="hardware_timer_off_minute2"]'
    ).val();
    var ampm = $(
      '.hardware_timer_create_modal .timer_power_off .time_picker input[name="hardware_timer_off_ampm"]:checked'
    ).length;

    if (ampm) {
      ampm = ' PM';
    } else {
      ampm = ' AM';
    }

    var format_time = h1 + h2 + ':' + m1 + m2 + ampm;

    if (FWI_Validate.validateTime4(h1, h2, m1, m2)) {
      $(
        '.hardware_timer_create_modal .timer_power_off .time_picker input'
      ).removeClass('unfocus_error');
      FWI_App.log('Timer - offtime Validates - ' + format_time);

      return format_time;
    } else {
      $(
        '.hardware_timer_create_modal .timer_power_off .time_picker input'
      ).addClass('unfocus_error');
      FWI_App.log('Timer - offtime Does not Validate - ' + format_time);

      return false;
    }
  },
  /* From LG: Timers are attached to the Signage Device do not have unique IDs, scap allows duplicates */
  /* Check for duplicate timer entries */
  /* Make sure that we can always add an on AND off timer to keep track of array index */
  validateDupeCheck: function(timeOn, timeOff, days) {
    for (var i = 0; i < FWI_Hardware.timerListOn.length; i++) {
      var onSplit = FWI_Hardware.timerListOn[i].dupeCheck.split('|');
      var onWeek = FWI_Hardware.timerListOn[i].week;
      var offSplit = FWI_Hardware.timerListOff[i].dupeCheck.split('|');
      var offWeek = FWI_Hardware.timerListOff[i].week;

      if (onWeek !== offWeek) {
        return false;
      } else {
        if (days === onWeek && days === offWeek) {
          if (timeOn === onSplit[1] || timeOff === offSplit[1]) {
            return false;
          }
        }
      }
    }

    return true;
  },
  /* Check if Timer Exists for CMW Remote CMD removal  */
  /* Make sure that we can always remove an on AND off timer to keep track of array index */
  validateRemoveTimer: function(timeOn, timeOff, days) {
    for (var i = 0; i < FWI_Hardware.timerListOn.length; i++) {
      var onSplit = FWI_Hardware.timerListOn[i].dupeCheck.split('|');
      var onWeek = FWI_Hardware.timerListOn[i].week;
      var offSplit = FWI_Hardware.timerListOff[i].dupeCheck.split('|');
      var offWeek = FWI_Hardware.timerListOff[i].week;

      if (onWeek !== offWeek) {
        return false;
      } else {
        if (days === onWeek && days === offWeek) {
          if (timeOn === onSplit[1] && timeOff === offSplit[1]) {
            return true;
          }
        }
      }
    }

    return false;
  },
  /* Extract days string from Scaps Week value */
  extractDays: function(bitwise) {
    var days = '';

    bitwise = parseInt(bitwise);

    if (bitwise >= 127) {
      days = 'Everyday';
      bitwise -= 127;
    }

    if (bitwise >= 64) {
      days = 'Sun' + days;
      bitwise -= 64;
    }

    if (bitwise >= 32) {
      days = 'Sat, ' + days;
      bitwise -= 32;
    }

    if (bitwise >= 16) {
      days = 'Fri, ' + days;
      bitwise -= 16;
    }

    if (bitwise >= 8) {
      days = 'Thu, ' + days;
      bitwise -= 8;
    }

    if (bitwise >= 4) {
      days = 'Wed, ' + days;
      bitwise -= 4;
    }

    if (bitwise >= 2) {
      days = 'Tue, ' + days;
      bitwise -= 2;
    }

    if (bitwise >= 1) {
      days = 'Mon, ' + days;
      bitwise -= 1;
    }

    days = days.replace(/, +$/, '');

    return days;
  },
  /* Start request, call scap */
  displayTimerListStart: function(scroll) {
    FWI_Hardware.timerListOn = [];
    FWI_Hardware.timerListOff = [];

    if (FWI_Hardware.onOffTimers && FWI_Hardware.onOffTimers.length) {
      $.each(FWI_Hardware.onOffTimers, function(key, value) {
        FWI_Hardware.timerListOn.push(value.on);
        FWI_Hardware.timerListOff.push(value.off);
      });
    }
    FWI_Hardware.displayTimerListEnd(scroll);
  },
  /* Recieves Scap Callback */
  displayTimerListEnd: function(scroll) {
    var outputTimeTable = '';

    for (var i = 0; i < FWI_Hardware.timerListOn.length; i++) {
      var days = FWI_Hardware.extractDays(FWI_Hardware.timerListOn[i].week);
      /* On */
      var onAMPM;
      var onHour = FWI_Hardware.timerListOn[i].hour;

      if (onHour > 12) {
        onHour = onHour - 12;
        onAMPM = ' PM';
      } else if (onHour == 12) {
        onAMPM = ' PM';
      } else if (onHour == 0) {
        onHour = 12;
        onAMPM = ' AM';
      } else {
        onAMPM = ' AM';
      }

      var onMinute = FWI_Hardware.timerListOn[i].minute;

      if (onMinute < 10) {
        onMinute = '0' + onMinute;
      }

      var timeOn = onHour + ':' + onMinute + onAMPM;
      /* Off */
      var offAMPM;
      var offHour = FWI_Hardware.timerListOff[i].hour;

      if (offHour > 12) {
        offHour = offHour - 12;
        offAMPM = ' PM';
      } else if (offHour == 12) {
        offAMPM = ' PM';
      } else if (offHour == 0) {
        offHour = 12;
        offAMPM = ' AM';
      } else {
        offAMPM = ' AM';
      }

      var offMinute = FWI_Hardware.timerListOff[i].minute;

      if (offMinute < 10) {
        offMinute = '0' + offMinute;
      }

      var timeOff = offHour + ':' + offMinute + offAMPM;
      /* Add 0 */
      var dupeOn = timeOn;
      var dupeOff = timeOff;

      if (onHour < 10) {
        dupeOn = '0' + onHour + ':' + onMinute + onAMPM;
      }

      if (offHour < 10) {
        dupeOff = '0' + offHour + ':' + offMinute + offAMPM;
      }

      FWI_Hardware.timerListOn[i].dupeCheck = days + '|' + dupeOn;
      FWI_Hardware.timerListOff[i].dupeCheck = days + '|' + dupeOff;

      var disabled = 'disabled';
      var disabled_row = '';

      if (FWI_Hardware.onOffTimersEnabled) {
        disabled = '';
        disabled_row = 'settings_row';
      }

      outputTimeTable +=
        "<div class='table_timers_row " +
        disabled_row +
        "' timer-on='" +
        JSON.stringify(FWI_Hardware.timerListOn[i]) +
        "' timer-off='" +
        JSON.stringify(FWI_Hardware.timerListOff[i]) +
        "'> \
										<div class='table_timers_column _days'> \
											<p>" +
        days +
        "</p> \
										</div> \
										<div class='table_timers_column _durations'> \
											<p>" +
        timeOn +
        ' - ' +
        timeOff +
        "</p> \
										</div> \
										<div class='table_timers_column _stats'> \
											<p class='plus'></p> \
										</div> \
									<div class='table_timers_column _buttons'> \
										<div class='fwi_button_group secondary'> \
											<button data-remote-index='y' " +
        disabled +
        " class='hardware_timer_delete'><span>Delete</span></button> \
										</div> \
									</div> \
								</div>";
    }
    $('.table_timers .table_timers_list').html(outputTimeTable);

    /* Focus new timer after creation and scap list display */

    if (
      FWI_Settings.currentSetting === 'setting_hardware' &&
      FWI_Hardware.onOffTimersEnabled
    ) {
      if (scroll) {
        setTimeout(function() {
          $('.active_row').removeClass('active_row');
          $(
            '.settings_content.active .table_timers_list .settings_row:last'
          ).addClass('active_row');
          FWI_Settings.focusActiveRow();
        }, 250);
      }
    }
  },
  /* Create Timer Set, frontend/RemoteCmd */
  createTimerSet: function(timerOn, timerOff, days) {
    if (timerOn !== '' && timerOff !== '' && days !== 0) {
      var dayStr = FWI_Hardware.extractDays(days);
      FWI_App.log(
        'Create timer set: ' + timerOn + ' | ' + timerOff + ' | ' + dayStr
      );
      var onHour = parseInt(timerOn.substring(0, 2));
      var onMinute = parseInt(timerOn.substring(3, 5));
      var onAMPM = timerOn.substring(6, 8);

      if (onAMPM == 'PM' && onHour < 12) {
        onHour = onHour + 12;
      } else if (onAMPM == 'AM' && onHour == 12) {
        onHour = onHour - 12;
      }

      var optionsOn = {};

      optionsOn.hour = onHour;
      optionsOn.minute = onMinute;
      optionsOn.week = days;

      var offHour = parseInt(timerOff.substring(0, 2));
      var offMinute = parseInt(timerOff.substring(3, 5));
      var offAMPM = timerOff.substring(6, 8);

      if (offAMPM == 'PM' && offHour < 12) {
        offHour = offHour + 12;
      } else if (offAMPM == 'AM' && offHour == 12) {
        offHour = offHour - 12;
      }

      var optionsOff = {};

      optionsOff.hour = offHour;
      optionsOff.minute = offMinute;
      optionsOff.week = days;

      var newTimer = {
        on: optionsOn,
        off: optionsOff,
        week: days,
        dayStr: dayStr
      };

      FWI_Hardware.onOffTimers.push(newTimer);
      HOST_DEVICE.setSetting(
        'on_off_timers',
        JSON.stringify(FWI_Hardware.onOffTimers)
      );

      FWI_Hardware.displayTimerListStart(true);
    }
  },
  /* Delete Timer Set For RemoteCmd */
  deleteTimerSetRmtCmd: function(timerOn, timerOff, days) {
    if (timerOn != '' && timerOff != '' && days != 0) {
      var onHour = parseInt(timerOn.substring(0, 2));
      var onMinute = parseInt(timerOn.substring(3, 5));
      var onAMPM = timerOn.substring(6, 8);

      if (onAMPM == 'PM' && onHour < 12) {
        onHour = onHour + 12;
      } else if (onAMPM == 'AM' && onHour == 12) {
        onHour = onHour - 12;
      }

      var offHour = parseInt(timerOff.substring(0, 2));
      var offMinute = parseInt(timerOff.substring(3, 5));
      var offAMPM = timerOff.substring(6, 8);

      if (offAMPM == 'PM' && offHour < 12) {
        offHour = offHour + 12;
      } else if (offAMPM == 'AM' && offHour == 12) {
        offHour = offHour - 12;
      }

      var deleted = false;
      var deleteIndex = 0;

      $.each(FWI_Hardware.onOffTimers, function(key, value) {
        if (
          value.on.hour == onHour &&
          value.on.minute == onMinute &&
          value.on.week == days &&
          value.off.hour == offHour &&
          value.off.minute == offMinute &&
          value.off.week == days
        ) {
          deleted = true;
          deleteIndex = key;
        }
      });

      if (deleted) {
        FWI_Hardware.onOffTimers.splice(deleteIndex, 1);
        FWI_App.log('TimerDelete - deleteTimerSet success');
        HOST_DEVICE.setSetting(
          'on_off_timers',
          JSON.stringify(FWI_Hardware.onOffTimers)
        );
        FWI_Hardware.displayTimerListStart();
      } else {
        FWI_App.log('TimerDelete - deleteTimerSet fail 1');
      }
    } else {
      FWI_App.log('TimerDelete - deleteTimerSet fail');
    }
  },
  /* Create Timer Set, frontend */
  deleteTimerSet: function(timerOn, timerOff) {
    if (!$.isEmptyObject(timerOn) && !$.isEmptyObject(timerOff)) {
      var deleted = false;
      var deleteIndex = 0;

      $.each(FWI_Hardware.onOffTimers, function(key, value) {
        if (
          JSON.stringify(value.on) === JSON.stringify(timerOn) &&
          JSON.stringify(value.off) === JSON.stringify(timerOff)
        ) {
          deleted = true;
          deleteIndex = key;
        }
      });

      if (deleted) {
        FWI_Hardware.onOffTimers.splice(deleteIndex, 1);
        FWI_App.log('TimerDelete - deleteTimerSet success');
        HOST_DEVICE.setSetting(
          'on_off_timers',
          JSON.stringify(FWI_Hardware.onOffTimers)
        );
        FWI_Hardware.displayTimerListStart();
      } else {
        FWI_App.log('TimerDelete - deleteTimerSet fail 1');
      }
      FWI_Shadow.updateOnOffTimersFromDevice(FWI_Hardware.onOffTimers);
    } else {
      FWI_App.log('TimerDelete - deleteTimerSet fail');
    }
  },

  deleteAllTimers: function() {
    FWI_App.log('TimerDelete ALL - deleteAllTimers success');
    FWI_Hardware.onOffTimers = [];
    HOST_DEVICE.setSetting(
      'on_off_timers',
      JSON.stringify(FWI_Hardware.onOffTimers)
    );
    FWI_Hardware.displayTimerListStart();
  },

  /* Bind Inputs */
  bindHardwareElements: function() {
    if (HOST_DEVICE.isRotationSupported()) {
      $('.hardware_orientation').on('click', function() {
        FWI_Hardware.changeDeviceOrientation();
      });
    } else {
      // Hide orientation section from UI.
      $('.hardware_orientation_section').hide();
    }

    /* Reboot */
    /* Time change Event */
    $(
      '.setting_hardware_reboot .time_picker input.time_digit, .setting_hardware_reboot .time_picker input[name="hardware_reboot_ampm"]'
    ).change(function() {
      var h1 = $(
        '.setting_hardware_reboot .time_picker input[name="hardware_reboot_hour1"]'
      ).val();
      var h2 = $(
        '.setting_hardware_reboot .time_picker input[name="hardware_reboot_hour2"]'
      ).val();
      var m1 = $(
        '.setting_hardware_reboot .time_picker input[name="hardware_reboot_minute1"]'
      ).val();
      var m2 = $(
        '.setting_hardware_reboot .time_picker input[name="hardware_reboot_minute2"]'
      ).val();
      var ampm = $(
        '.setting_hardware_reboot .time_picker input[name="hardware_reboot_ampm"]:checked'
      ).length;

      if (ampm) {
        ampm = ' PM';
      } else {
        ampm = ' AM';
      }

      var format_time = h1 + h2 + ':' + m1 + m2 + ampm;

      if (FWI_Validate.validateTime4(h1, h2, m1, m2)) {
        FWI_Hardware.setRebootTime(format_time);
        $('.setting_hardware_reboot .time_picker input').removeClass(
          'unfocus_error'
        );
        FWI_App.log(
          'setting_hardware_reboot Validates, saving - ' + format_time
        );
      } else {
        $('.setting_hardware_reboot .time_picker input').addClass(
          'unfocus_error'
        );
        FWI_App.log(
          'setting_hardware_reboot Does not Validate - ' + format_time
        );
      }
    });
    /* Enable/Disable Reboot Timer */
    $('input#hardware_reboot_enable').change(function() {
      $('.setting_hardware_reboot .time_picker input.time_digit:first').trigger(
        'change'
      );
      if ($(this).is(':checked')) {
        FWI_Hardware.hardwareRebootEnabled();
      } else {
        FWI_Hardware.hardwareRebootDisabled();
      }
    });

    /* Firmware */
    /* Detect Change */
    $('input[name="firmware_updates_url"]').on('input', function() {
      FWI_Hardware.firmwareUrlNeedsValidate();
    });
    /* Verify */
    $('button.hardware_firmware_url_verify').on('click', function() {
      var url = $('input[name="firmware_updates_url"]').val();

      if (HOST_DEVICE.isValidFirmwareURL(url)) {
        FWI_App.log('Checking if firmware exists at ' + url, 'DEBUG');

        $.ajax({
          url: url,
          cache: false,
          type: 'HEAD',
          error: function(error) {
            FWI_App.log(
              'Firmware location error: ' + JSON.stringify(error),
              'DEBUG'
            );
            FWI_Hardware.firmwareUrlNotVerified();
          },
          success: function() {
            FWI_App.log('Firmware location exists');
            FWI_Hardware.firmwareUrlVerified();
          }
        });
      } else {
        FWI_Hardware.firmwareUrlNotVerified();
      }
    });
    /* Check Firmware Now */
    $('button.hardware_firmware_url_checknow').on('click', function() {
      FWI_Hardware.checkFirmwareNow();
    });
    /* Cancel Firmware upgrade during Download Phase */
    $('button.firmware_upgrade_cancel').on('click', function() {
      FWI_Hardware.cancelFirmware();
    });
    /* Time change Event */
    $(
      '.setting_firmware_update .time_picker input.time_digit, .setting_firmware_update .time_picker input[name="hardware_firmware_ampm"]'
    ).change(function() {
      var h1 = $(
        '.setting_firmware_update .time_picker input[name="hardware_firmware_hour1"]'
      ).val();
      var h2 = $(
        '.setting_firmware_update .time_picker input[name="hardware_firmware_hour2"]'
      ).val();
      var m1 = $(
        '.setting_firmware_update .time_picker input[name="hardware_firmware_minute1"]'
      ).val();
      var m2 = $(
        '.setting_firmware_update .time_picker input[name="hardware_firmware_minute2"]'
      ).val();
      var ampm = $(
        '.setting_firmware_update .time_picker input[name="hardware_firmware_ampm"]:checked'
      ).length;

      if (ampm) {
        ampm = ' PM';
      } else {
        ampm = ' AM';
      }

      var format_time = h1 + h2 + ':' + m1 + m2 + ampm;

      if (FWI_Validate.validateTime4(h1, h2, m1, m2)) {
        FWI_Hardware.setFirmwareTime(format_time);
        $('.setting_firmware_update .time_picker input').removeClass(
          'unfocus_error'
        );
        FWI_App.log('firmwaretime Validates, saving - ' + format_time);
      } else {
        $('.setting_firmware_update .time_picker input').addClass(
          'unfocus_error'
        );
        FWI_App.log('firmwaretime Does not Validate - ' + format_time);
      }
    });
    /* Enable/Disable Firmware Timer */
    $('input#hardware_firmware_enable').change(function() {
      $('.setting_firmware_update .time_picker input.time_digit:first').trigger(
        'change'
      );
      if ($(this).is(':checked')) {
        FWI_Hardware.checkForFirmwareUpdatesEnabled();
      } else {
        FWI_Hardware.checkForFirmwareUpdatesDisabled();
      }
    });

    /* Timers */
    $('input#hardware_timers_enable').change(function() {
      if ($(this).is(':checked')) {
        FWI_Hardware.onOffTimersEnable();
      } else {
        FWI_Hardware.onOffTimersDisable();
      }
    });
    /* Checkbox CSS */
    $("input[name='hardware_timer_days[]']").change(function() {
      if ($(this).is(':checked')) {
        $(this)
          .closest('label')
          .addClass('checkbox_label_checked');
      } else {
        $(this)
          .closest('label')
          .removeClass('checkbox_label_checked');
      }
    });
    /* Create Timer Modal Launch */
    $('button.hardware_timer_create').on('click', function() {
      $('.hardware_timer_create_modal .timer_power_message').html('');
      $('.hardware_timer_create_modal').addClass('modal_active');
      FWI_Hardware.enableModal();
    });
    /* Delete Timer Modal Launch */
    $('div.table_timers_list').on(
      'click',
      'button.hardware_timer_delete',
      function() {
        $('.active_tr').removeClass('active_tr');
        $(this)
          .closest('.table_timers_row')
          .addClass('active_tr');
        $('.hardware_timer_remove_modal').addClass('modal_active');
        FWI_Hardware.enableModal();
      }
    );
    /* On cancel, disable modal */
    $('.is_modal button.hardware_time_cancel').on('click', function() {
      FWI_Hardware.disableModal();
      FWI_Settings.focusActiveRow();
    });
    /* On confirm, delete timer set */
    $('.hardware_timer_remove_modal button.hardware_time_remove_confirm').on(
      'click',
      function() {
        //FWI_App.log('remove');
        var onJson =
          $('.active_tr').attr('timer-on') !== undefined
            ? JSON.parse($('.active_tr').attr('timer-on'))
            : false;

        var offJson =
          $('.active_tr').attr('timer-off') !== undefined
            ? JSON.parse($('.active_tr').attr('timer-off'))
            : false;

        FWI_Hardware.deleteTimerSet(onJson, offJson);
        FWI_Hardware.disableModal();
      }
    );

    /* Daily vs Custom timers */

    if (
      FWI_Hardware.onOffTimers &&
      FWI_Hardware.onOffTimers[0] &&
      FWI_Hardware.onOffTimers[0].dayStr === 'Everyday'
    ) {
      $('.timer_days').hide();
      $('#timer_custom_label').removeClass('checkbox_label_checked');
      $('#timer_custom').prop('checked', false);

      $('#timer_daily_label').addClass('checkbox_label_checked');
      $('#timer_daily').prop('checked', true);

      // check all the day boxes
      $("input[name='hardware_timer_days[]']").each(function(_, el) {
        $(el).prop('checked', true);
      });
    } else {
      $('.timer_days').show();
      $('#timer_daily_label').removeClass('checkbox_label_checked');
      $('#timer_daily').prop('checked', false);

      $('#timer_custom_label').addClass('checkbox_label_checked');
      $('#timer_custom').prop('checked', true);
    }

    // $('input[name="timer_type]')
    $('.timer_type_label').on('click', function(e) {
      e.preventDefault();
      var selected = e.target.id;

      switch (selected) {
        case 'timer_daily_label':
          $('.timer_days').hide();
          $('#timer_custom_label').removeClass('checkbox_label_checked');
          $('#timer_custom').prop('checked', false);

          $('#timer_daily_label').addClass('checkbox_label_checked');
          $('#timer_daily').prop('checked', true);
          // check all the day boxes
          $("input[name='hardware_timer_days[]']").each(function(i, el) {
            $(el)
              .prop('checked', true)
              .closest('label')
              .addClass('checkbox_label_checked');
            $(el).prop('checked');
          });
          break;

        case 'timer_custom_label':
          $('.timer_days').show();
          $('#timer_daily_label').removeClass('checkbox_label_checked');
          $('#timer_daily').prop('checked', false);

          $('#timer_custom_label').addClass('checkbox_label_checked');
          $('#timer_custom').prop('checked', true);
          break;

        default:
          FWI_App.log({
            msg:
              'Could not determine which selection was made between daily and custom timers. Got selector for: ' +
              selected,
            level: 'ERROR'
          });
          break;
      }
    });

    /* Create Timer done, validate time and check for duplicate */
    $('.hardware_timer_create_modal button.hardware_time_done').off().on(
      'click',
      function() {
        var timerOn = FWI_Hardware.validateTimerOn();
        var timerOff = FWI_Hardware.validateTimerOff();
        var days = 0;

        $("input[name='hardware_timer_days[]']:checked").each(function() {
          days += parseInt($(this).val());
        });

        if ($('#timer_daily').prop('checked')) {
          days = 127; // why? i have no idea why they though this was a good idea.
        }

        if (days !== 0 && timerOn !== false && timerOff !== false) {
          var dupeCheck = FWI_Hardware.validateDupeCheck(
            timerOn,
            timerOff,
            days
          );

          if (dupeCheck !== false) {
            FWI_App.log('New Timer Sets - validate');
            FWI_Hardware.createTimerSet(timerOn, timerOff, days);
            FWI_Shadow.updateShadow();
            FWI_Hardware.disableModal();
          } else {
            FWI_Hardware.updateTimerModalMsg(
              'Duplicated Timers, Please Try Again',
              'error'
            );
          }
        } else {
          FWI_App.log('New Timer Sets - timers not validate');
          FWI_Hardware.updateTimerModalMsg(
            'Bad Timers, Please Try Again',
            'error'
          );
        }
      }
    );
    /* Validate timer on input change */
    $(
      '.hardware_timer_create_modal .timer_power_on .time_picker input.time_digit, .hardware_timer_create_modal .timer_power_on .time_picker input[name="hardware_timer_on_ampm"]'
    ).change(function() {
      FWI_Hardware.validateTimerOn();
    });
    /* Validate timer on input change */
    $(
      '.hardware_timer_create_modal .timer_power_off .time_picker input.time_digit, .hardware_timer_create_modal .timer_power_off .time_picker input[name="hardware_timer_off_ampm"]'
    ).change(function() {
      FWI_Hardware.validateTimerOff();
    });

    /* CEC / HDMI Mode */
    if (HOST_DEVICE.supportsCECcommands()) {
      $('#hdmi_mode_group').show();
      $('#hdmi_mode_group .setting_row').addClass('setting_row_enabled');

      // get initial setting
      var cec_mode_init = FWI_Helper.parseBool(HOST_DEVICE.getSetting('cec_enabled'));

      // reset ui
      $('.hdmi_mode_label').removeClass('checkbox_label_checked');

      if (cec_mode_init) {
        FWI_Hardware.useCECCommandsUI();
      } else {
        FWI_Hardware.useAVSignalUI();
      }
      // bind events to ui selection
      $('.hdmi_mode_label').on('click', function(e) {
        var $el = $(e.target);
        $('.hdmi_mode_label').removeClass('checkbox_label_checked');
        var $input = $el.find('input[type="radio"]');
        $input.prop('checked', true);
        $el.addClass('checkbox_label_checked');
        FWI_Hardware.updateCECSetting();
      });
      
    } else {
      $('#hdmi_mode_group').hide();
    }
  },

  tabUnfocus: function() {
    /* Clear validation / incomplete states */
    this.firmwareUrlReset();
    this.resetTimers();
  },

  // Initializes the orientation of the display.
  orientationInit: function() {
    var onSuccessSource = function() {
      var $html = $('html');

      $html.removeClass('force_916 force_169');

      if (
        HOST_DEVICE.orientation === 'DEGREE_0' ||
        HOST_DEVICE.orientation === 'DEGREE_180'
      ) {
        FWI_App.log('Forcing 16:9 horizontal display.', 'DEBUG');
        $html.addClass('force_169');
      } else {
        FWI_App.log('Forcing 9:16 vertical display.', 'DEBUG');
        $html.addClass('force_916');
      }

      HOST_DEVICE.getOrientation();
    };

    var onError = function(error) {
      FWI_App.log(
        'setSourceOrientation code :' +
          error.code +
          ' error name: ' +
          error.name +
          '  message ' +
          error.message
      );
    };

    // Get initial orientation.
    HOST_DEVICE.getOrientation(function() {
      if (HOST_DEVICE.orientation) {
        FWI_App.log(
          'Stored or auto-detected orientation: ' + HOST_DEVICE.orientation,
          'DEBUG'
        );
      } else {
        HOST_DEVICE.orientation = 'DEGREE_0';
        HOST_DEVICE.setSetting('orientation', HOST_DEVICE.orientation);
        FWI_App.log('Default orientation: ' + HOST_DEVICE.orientation, 'DEBUG');
      }

      HOST_DEVICE.setOrientation(
        HOST_DEVICE.orientation,
        onSuccessSource,
        onError
      );
    });
  },

  publishOfflineNotificationReason: function(reason) {
    FWI_App.log({
      msg: 'sending offline notification to cloud for reason code ' + reason,
      level: 'WARN'
    });
    FWI_Provision.connection.mqtt.publish(
      'fwi/' + FWI_Provision.tenant + '/state',
      JSON.stringify({
        clientId: FWI_Provision.id,
        eventType: 'disconnected',
        env: 'prod',
        explicit: true,
        timestamp: FWI_Helper.dateToPosix(HOST_DEVICE.getTime()),
        disconnectReason: reason
      })
    );
  },

  useCECCommandsUI: function() {
    $('#cec_mode_display').addClass('checkbox_label_checked');
    $('input_cec_mode_display').prop('checked', true);
    $('#cec-warning').css('visibility', 'visible');

    $('#cec_mode_hdmi').removeClass('checkbox_label_checked');
    $('#input_cec_mode_hdmi').prop('checked', false);
    // FWI_Hardware.updateCECSetting()
    HOST_DEVICE.setSetting('cec_enabled', 'true');
      $('#cec-warning').css('visibility', 'visible');
      FWI_Shadow.updateShadow();
  },

  useAVSignalUI: function() {
    $('#cec-warning').css('visibility', 'hidden');
    $('#cec_mode_hdmi').addClass('checkbox_label_checked');
    $('#input_cec_mode_hdmi').prop('checked', true);

    $('#cec_mode_display').removeClass('checkbox_label_checked');
    $('input_cec_mode_display').prop('checked', false);
    // FWI_Hardware.updateCECSetting()
    HOST_DEVICE.setSetting('cec_enabled', 'false');
    $('#cec-warning').css('visibility', 'hidden');
    FWI_Shadow.updateShadow();
  },

   updateCECSetting: function() {
    if ($('#input_cec_mode_display').prop('checked')) {
      HOST_DEVICE.setSetting('cec_enabled', 'true');
      $('#cec-warning').css('visibility', 'visible');
    } else {
      HOST_DEVICE.setSetting('cec_enabled', 'false');
      $('#cec-warning').css('visibility', 'hidden');
    }

    FWI_Shadow.updateShadow();
  },

  // Test function to manually retrieve hardware information
  testHardwareInfo: function() {
    FWI_App.log('=== HARDWARE INFO TEST ===', 'INFO');
    
    // Test IP Address
    HOST_DEVICE.getIPAddress(
      function(ipAddress) {
        FWI_App.log('TEST - IP Address: ' + ipAddress, 'INFO');
      },
      function(error) {
        FWI_App.log('TEST - IP Address Error: ' + error, 'ERROR');
      }
    );
    
    // Test MAC Address
    HOST_DEVICE.getMACAddress(
      function(macAddress) {
        FWI_App.log('TEST - MAC Address: ' + macAddress, 'INFO');
      },
      function(error) {
        FWI_App.log('TEST - MAC Address Error: ' + error, 'ERROR');
      }
    );
    
    // Test Serial Number
    try {
      var serialNumber = b2bapis.b2bcontrol.getSerialNumber();
      FWI_App.log('TEST - Serial Number: ' + serialNumber, 'INFO');
    } catch (error) {
      FWI_App.log('TEST - Serial Number Error: ' + error, 'ERROR');
    }
    
    // Test API availability
    FWI_App.log('TEST - b2bapis available: ' + (typeof b2bapis !== 'undefined'), 'INFO');
    FWI_App.log('TEST - b2bcontrol available: ' + (typeof b2bapis !== 'undefined' && b2bapis.b2bcontrol), 'INFO');
    
    FWI_App.log('=== END HARDWARE INFO TEST ===', 'INFO');
  },

  // Retrieve and store hardware information from device APIs
  retrieveHardwareInfo: function() {
    FWI_App.log('Retrieving hardware information from device APIs', 'DEBUG');
    
    // Get IP Address
    HOST_DEVICE.getIPAddress(
      function(ipAddress) {
        FWI_App.log('Retrieved IP address: ' + ipAddress, 'DEBUG');
        FWI_Hardware.IP = ipAddress;
        HOST_DEVICE.setSetting('ip', ipAddress);
        $('.about_network .ip').html('IP: ' + ipAddress);
      },
      function(error) {
        FWI_App.log('Failed to get IP address: ' + error, 'WARN');
        FWI_Hardware.IP = 'N/A';
      }
    );
    
    // Get MAC Address
    HOST_DEVICE.getMACAddress(
      function(macAddress) {
        FWI_App.log('Retrieved MAC address: ' + macAddress, 'DEBUG');
        FWI_Hardware.MAC = macAddress;
        HOST_DEVICE.setSetting('mac', macAddress);
        $('.about_network .mac').html('MAC: ' + macAddress);
      },
      function(error) {
        FWI_App.log('Failed to get MAC address: ' + error, 'WARN');
        FWI_Hardware.MAC = 'N/A';
      }
    );
    
    // Get Serial Number (hostname equivalent for Samsung)
    try {
      var serialNumber = b2bapis.b2bcontrol.getSerialNumber();
      FWI_App.log('Retrieved serial number: ' + serialNumber, 'DEBUG');
      FWI_Hardware.Serial = serialNumber;
      HOST_DEVICE.setSetting('serial', serialNumber);
      HOST_DEVICE.serialNumber = serialNumber; // Also set on HOST_DEVICE for provisioning
      $('.about_system .serial').html('Serial: ' + serialNumber);
    } catch (error) {
      FWI_App.log('Failed to get serial number: ' + error, 'WARN');
      FWI_Hardware.Serial = 'N/A';
    }
    
    // For Samsung devices, use serial number as hostname
    FWI_Hardware.Alias = FWI_Hardware.Serial;
    HOST_DEVICE.setSetting('alias', FWI_Hardware.Alias);
  },

  init: function() {
    FWI_App.log('Initializing Hardware', 'DEBUG');
    /* Bind Inputs */
    this.bindHardwareElements();

    // Retrieve hardware information from device APIs first
    this.retrieveHardwareInfo();

    // Read settings (will be populated by retrieveHardwareInfo above)
    this.freeSpace = HOST_DEVICE.getSetting('free_space');
    this.IP = HOST_DEVICE.getSetting('ip');
    this.IPHost = HOST_DEVICE.getSetting('ip_host');
    this.Alias = HOST_DEVICE.getSetting('alias');
    this.MAC = HOST_DEVICE.getSetting('mac');
    this.MACHost = HOST_DEVICE.getSetting('mac_host');
    this.Serial = HOST_DEVICE.getSetting('serial');
    this.deviceOrientation = HOST_DEVICE.getSetting('orientation');
    this.firmwareURL = HOST_DEVICE.getSetting('firmware_url');
    this.firmwareUpdatesEnabled =
      HOST_DEVICE.getSetting('firmware_updates_enabled') === true.toString();
    this.firmwareUpdatesTime = HOST_DEVICE.getSetting('firmware_updates_time');
    this.firmwareUpdatesTimestamp = HOST_DEVICE.getSetting(
      'firmware_updates_timestamp'
    );
    this.rebootEnabled =
      HOST_DEVICE.getSetting('reboot_enabled') === true.toString();
    this.rebootTime = HOST_DEVICE.getSetting('reboot_time');
    if (this.rebootTime) {
      this.setRebootTime(this.rebootTime);
    }
    this.onOffTimersEnabled =
      HOST_DEVICE.getSetting('on_off_timers_enabled') === true.toString();
    this.onOffTimers = HOST_DEVICE.getSetting('on_off_timers');

    //Cached Reboot Init
    if (this.rebootEnabled) {
      this.hardwareRebootEnabled();
    }

    //Orientation Init
    this.orientationInit();

    //reboot/firmware timer
    this.resetTimers();

    //Cached Firmware Init
    if (this.firmwareURL) {
      $('input[name="firmware_updates_url"]').val(this.firmwareURL);
      this.firmwareUrlVerified();
    }

    if (this.firmwareUpdatesEnabled) {
      this.checkForFirmwareUpdatesEnabled();
    }

    if (this.firmwareUpdatesTimestamp && this.firmwareUpdatesTimestamp !== '') {
      $('.firmware_timestamp').html(this.firmwareUpdatesTimestamp);
    }

    //De-stringify timers
    if (this.onOffTimers) {
      this.onOffTimers = JSON.parse(this.onOffTimers);
    } else {
      this.onOffTimers = [];
    }

    //OnOff Timers enable/disable
    if (this.onOffTimersEnabled) {
      this.onOffTimersEnable();
    }

    FWI_App.log('Hardware initialized', 'DEBUG');
  }
};

/* eslint-disable-next-line */
var offlineCodes = {
  USER_COMMAND_STOP_PLAYER: 3000,
  USER_COMMAND_RESTART_PLAYER: 3001,
  USER_COMMAND_CLEAR_CACHE: 3002,
  SCHEDULED_REBOOT: 3003,
  UNKNOWN_REASON: 3005,
  SOFTWARE_UPDATE: 3006,
  MEMORY_EXCEEDED: 3007,
  PLAYER_DELETED: 3008,
  UNHANDLED_EXCEPTION: 3009,
  USER_EXITED_APP: 3010,
  USER_STOP_FROM_DEVICE: 3011,
  USER_STOP_FROM_CM: 3012
};
