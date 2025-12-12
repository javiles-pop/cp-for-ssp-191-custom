var FWI_Settings = {
  currentSetting: 'setting_deploy',
  currentSelection: 'main',
  tabScroll: 0,
  devItems: 0,

  /* Validate Access Code */
  checkAccessCode: function(isSettingCode) {
    var enteredCode = '';
    $(
      '.modal_active .modal_settings_row input.modal_access_digit[data-remote-index]:visible:not(:disabled,[disabled])'
    ).each(function() {
      if ($(this).val().length === 1 && $.isNumeric($(this).val())) {
        enteredCode += String($(this).val());
      } else {
        FWI_Software.setModalMessage(
          FWI_Localization.getResource(
            'browserBased',
            'settings_message_invalidAccessCode',
            "Code Doesn't Match."
          )
        );
        return false;
      }
    });

    if (enteredCode && isSettingCode) {
      // Setting new, valid code.
      FWI_Software.setAccessCode(enteredCode);
      return true;
    } else if (enteredCode && enteredCode === FWI_Software.accessCode) {
      FWI_App.log('Access Code Entered - code is valid: ' + enteredCode);
      return true;
    } else if (!enteredCode) {
      FWI_Software.setModalMessage(
        FWI_Localization.getResource(
          'browserBased',
          'settings_message_enterAccessCode',
          'Please Enter Code.'
        )
      );
    } else {
      FWI_Software.setModalMessage(
        FWI_Localization.getResource(
          'browserBased',
          'settings_message_invalidAccessCode',
          "Code Doesn't Match."
        )
      );
    }

    FWI_App.log('Access Code Entered - code is not valid: ' + enteredCode);

    return false;
  },

  /* Scroll Functions, App currently scrolls on row change (up/down) */
  settingsScroll: function() {
    if (
      FWI_App.currentScreen === 'screen_settings' &&
      FWI_Settings.currentSelection === 'main'
    ) {
      // Scroll to active_row, loop
      if ($('.settings_content.active .settings_scroll').length) {
        var activeScrollTop = $('.settings_content.active').scrollTop();
        var outerHeight = $('.settings_content.active').height();
        var rowPositionTop = $(
          '.settings_content.active .settings_scroll .active_row'
        ).position().top;
        var rowPositionLeft = $(
          '.settings_content.active .settings_scroll .active_row'
        ).position().left;
        var activeRowHeight = $(
          '.settings_content.active .settings_scroll .active_row'
        ).outerHeight();
        var scrollHere;

        if (
          $('html').hasClass('orientation_landscape') ||
          $('html').hasClass('force_916') ||
          $('html').hasClass('force_169')
        ) {
          scrollHere = activeScrollTop + rowPositionTop - 60;
        } else if ($('html').hasClass('orientation_portrait90')) {
          scrollHere =
            outerHeight -
            (rowPositionLeft - activeScrollTop + 60 + activeRowHeight);
        } else if ($('html').hasClass('orientation_landscape_updn')) {
          scrollHere =
            outerHeight -
            (rowPositionTop - activeScrollTop + 60 + activeRowHeight);
        } else if ($('html').hasClass('orientation_portrait270')) {
          scrollHere = activeScrollTop + rowPositionLeft - 60;
        }

        if (scrollHere < 0) {
          scrollHere = 0;
        }

        $('.settings_content.active').animate(
          {
            scrollTop: scrollHere
          },
          250
        );
      }
    }
  },
  /* Recieve Keypress from remote.js and route */
  settingsKeypress: function(e) {
    /* What is user currently viewing  */
    var remoteSelection = $('.remote_selection');

    if (
      (e.keyCode === BUTTON_DONE || e.keyCode === BUTTON_OK) &&
      $('.remote_selection').hasClass('setting_exit')
    ) {
      $('.remote_selection').click();
    } else if (!remoteSelection.is(':focus')) {
      switch (FWI_Settings.currentSelection) {
        case 'sidebar':
          this.settingsKeypressSidebar(e);
          break;
        case 'main':
          this.settingsKeypressMain(e);
          break;
        case 'modal':
          this.settingsKeypressModal(e);
          break;
      }
    } else if (
      (e.keyCode === BUTTON_DONE ||
        e.keyCode === BUTTON_CANCEL ||
        e.keyCode === BUTTON_TAB ||
        e.keyCode === BUTTON_OK) &&
      remoteSelection.is('input')
    ) {
      if (remoteSelection.is(':focus')) {
        remoteSelection.blur();
      } else {
        remoteSelection.focus();
      }
    }
  },
  /* Sidebar Keypress */
  settingsKeypressSidebar: function(key) {
    var keyCode = key.keyCode;

    /* Make Index with Prev/Next */
    var sideBarCount = $(
      '.settings_sidebar ul li[data-remote-page-index]:visible'
    ).length;
    var sideBarIndex = $('.settings_sidebar ul li.remote_selection').index(
      '.settings_sidebar [data-remote-page-index]:visible'
    );
    var indexNext;

    if (keyCode === BUTTON_DOWN && sideBarCount > 0) {
      if (sideBarIndex === sideBarCount - 1) {
        // We moved down but are already on the last item. Move to the top.
        indexNext = 0;
      } else {
        indexNext = sideBarIndex + 1;
      }
    } else if (keyCode === BUTTON_UP && sideBarCount > 0) {
      if (sideBarIndex === 0) {
        // We moved up but are already on the first item. Move to the bottom.
        indexNext = sideBarCount - 1;
      } else {
        indexNext = sideBarIndex - 1;
      }
    }

    /* What key did user press? */
    if (
      (keyCode === BUTTON_UP || keyCode === BUTTON_DOWN) &&
      sideBarCount > 0
    ) {
      $('.settings_sidebar ul li.remote_selection').removeClass(
        'remote_selection'
      );
      $(
        '.settings_sidebar ul li[data-remote-page-index]:visible:eq("' +
          indexNext +
          '")'
      ).addClass('remote_selection');
      this.loadSettingTab();

      var settingName = $('.settings_sidebar ul li.remote_selection').attr(
        'data-setting'
      );
      this.tabFocusEvent(settingName);
    } else if (
      keyCode === BUTTON_RIGHT ||
      keyCode === BUTTON_OK ||
      keyCode === BUTTON_DONE
    ) {
      //activate current
      FWI_Settings.tabScroll = 0;
      if (
        $('.settings_sidebar ul li.remote_selection').hasClass(
          'setting_exit'
        ) &&
        (keyCode === BUTTON_OK || keyCode === BUTTON_DONE)
      ) {
        FWI_Settings.exit();
      } else {
        this.flashRemoteSelection(); // Show focus effect

        settingName = $('.settings_sidebar ul li.remote_selection').attr(
          'data-setting'
        );

        if (settingName !== 'setting_monitoring' || FWI_Advanced.advEnabled) {
          this.focusSettingTab(settingName); // Focus setting
        }
      }
    }
  },
  /* Settings Main Content Keypress */
  settingsKeypressMain: function(key) {
    var keyCode = key.keyCode;

    /* Enable Dev Items */
    var settingName = $('.settings_content.active').attr('data-setting');

    if (
      keyCode === BUTTON_RIGHT &&
      settingName === 'setting_deploy' &&
      !FWI_App.dev
    ) {
      this.devItems++;

      if (this.devItems === 4) {
        FWI_App.dev = true;
        FWI_Dev.init();
      }
    } else {
      this.devItems = 0;
    }

    // get current setting index in current row
    // get current row index
    // only enable rows with elements, unless it is an about row
    $('.setting_row_enabled').removeClass('setting_row_enabled');
    $('.settings_content.active .settings_row').each(function() {
      if (
        $(this).find(
          '[data-remote-index]:not(:disabled,[disabled]):visible:first'
        ).length ||
        $(this).hasClass('settings_about_row')
      ) {
        $(this).addClass('setting_row_enabled');
      }
    });

    /* Rows */
    var contentSettingRowCount =
      $('.settings_content.active .settings_row.setting_row_enabled').length -
      1;
    var contentSettingRowIndex = $(
      '.settings_content.active .settings_row.active_row'
    ).index('.settings_content.active .settings_row.setting_row_enabled');
    var indexRowNext;
    var indexRowPrev;

    if (contentSettingRowIndex === contentSettingRowCount) {
      indexRowNext = 0;
      indexRowPrev = contentSettingRowIndex - 1;
    } else if (contentSettingRowIndex === 0) {
      indexRowNext = 1;
      indexRowPrev = contentSettingRowCount;
    } else {
      indexRowNext = contentSettingRowIndex + 1;
      indexRowPrev = contentSettingRowIndex - 1;
    }

    /* Selectable Elements */
    var contentSettingCount =
      $(
        '.settings_content.active .settings_row.active_row [data-remote-index]:visible:not(:disabled,[disabled])'
      ).length - 1;
    var contentSettingIndex = $(
      '.settings_content.active .settings_row.active_row .remote_selection'
    ).index(
      '.active_row [data-remote-index]:visible:not(:disabled,[disabled])'
    );
    var indexSettingNext;
    var indexSettingPrev;
    var $activeRow;
    var $scrollableContent;
    var oldScrollTop;

    if (contentSettingIndex === contentSettingCount) {
      //indexSettingNext = contentSettingIndex;
      indexSettingNext = 0;
      indexSettingPrev = contentSettingIndex - 1;
    } else if (contentSettingIndex === 0) {
      indexSettingNext = 1;
      indexSettingPrev = contentSettingCount;
    } else {
      indexSettingNext = contentSettingIndex + 1;
      indexSettingPrev = contentSettingIndex - 1;
    }

    /* What key was pressed? */
    if (
      keyCode === BUTTON_0 ||
      keyCode === BUTTON_1 ||
      keyCode === BUTTON_2 ||
      keyCode === BUTTON_3 ||
      keyCode === BUTTON_4 ||
      keyCode === BUTTON_5 ||
      keyCode === BUTTON_6 ||
      keyCode === BUTTON_7 ||
      keyCode === BUTTON_8 ||
      keyCode === BUTTON_9
    ) {
      if ($('.remote_selection').is('input[type="number"]')) {
        if (keyCode === BUTTON_1) {
          $('.remote_selection').val(1);
        } else if (keyCode === BUTTON_2) {
          $('.remote_selection').val(2);
        } else if (keyCode === BUTTON_3) {
          $('.remote_selection').val(3);
        } else if (keyCode === BUTTON_4) {
          $('.remote_selection').val(4);
        } else if (keyCode === BUTTON_5) {
          $('.remote_selection').val(5);
        } else if (keyCode === BUTTON_6) {
          $('.remote_selection').val(6);
        } else if (keyCode === BUTTON_7) {
          $('.remote_selection').val(7);
        } else if (keyCode === BUTTON_8) {
          $('.remote_selection').val(8);
        } else if (keyCode === BUTTON_9) {
          $('.remote_selection').val(9);
        } else if (keyCode === BUTTON_0) {
          $('.remote_selection').val(0);
        }

        $('.remote_selection').trigger('change');

        /* Progress to next number input on successful input */
        if (
          $('.remote_selection')
            .closest('.fwi_input_group.numbers')
            .nextAll('.fwi_input_group.numbers').length
        ) {
          this.flashRemoteSelection();

          var nextSelection = $('.remote_selection')
            .closest('.fwi_input_group.numbers')
            .nextAll('.fwi_input_group.numbers')
            .first()
            .find('input[type="number"]');

          nextSelection.prop('disabled', false);

          if (!$('.remote_selection').hasClass('unfocus_error')) {
            $('.remote_selection').removeClass('remote_selection');
            nextSelection.addClass('remote_selection');
          }
        }
      }
    } else if (keyCode === BUTTON_LEFT) {
      if (
        HOST_DEVICE.getSetting('link') &&
        (contentSettingIndex === 0 || !$('.remote_selection').length)
      ) {
        /* Scroll To Top */
        FWI_Settings.tabScroll = 0;
        $('.settings_content.active').scrollTop(0);

        settingName = $('.settings_content.active').attr('data-setting');
        this.focusSettingSidebar(settingName);
        this.tabUnfocusEvent(settingName);
      } else {
        $('.remote_selection').removeClass('remote_selection');
        $(
          '.settings_content.active .settings_row.active_row [data-remote-index]:visible:not(:disabled,[disabled]):eq("' +
            indexSettingPrev +
            '")'
        ).addClass('remote_selection');
      }
    } else if (keyCode === BUTTON_RIGHT) {
      if (contentSettingIndex !== contentSettingCount) {
        $('.remote_selection').removeClass('remote_selection');
        $(
          '.settings_content.active .settings_row.active_row [data-remote-index]:visible:not(:disabled,[disabled]):eq("' +
            indexSettingNext +
            '")'
        ).addClass('remote_selection');
      }
    } else if (keyCode === BUTTON_UP) {
      $activeRow = $('.active_row');
      $scrollableContent = $activeRow.find('.settings_scrollable').first();

      if ($scrollableContent.length > 0) {
        oldScrollTop = $scrollableContent.scrollTop();
        $scrollableContent.scrollTop(
          oldScrollTop - $scrollableContent[0].scrollHeight / 10
        );

        if ($scrollableContent.scrollTop() !== oldScrollTop) {
          return false;
        }
        // Otherwise, continue moving to previous selectabke row.
      }

      if (contentSettingRowCount > 0) {
        $activeRow.removeClass('active_row');
        $(
          '.settings_content.active .settings_row.setting_row_enabled:eq(' +
            indexRowPrev +
            ')'
        ).addClass('active_row');
        this.focusActiveRow();
        return false;
      }
    } else if (keyCode === BUTTON_DOWN) {
      $activeRow = $('.active_row');
      $scrollableContent = $activeRow.find('.settings_scrollable').first();
      if ($scrollableContent.length > 0) {
        oldScrollTop = $scrollableContent.scrollTop();
        $scrollableContent.scrollTop(
          oldScrollTop + $scrollableContent[0].scrollHeight / 10
        );
        if ($scrollableContent.scrollTop() !== oldScrollTop) {
          return false;
        }

        // Otherwise, continue moving to next selectable row.
      }

      if (contentSettingRowCount > 0) {
        $activeRow.removeClass('active_row');
        $(
          '.settings_content.active .settings_row.setting_row_enabled:eq(' +
            indexRowNext +
            ')'
        ).addClass('active_row');
        this.focusActiveRow();
        return false;
      }
    } else if (keyCode === BUTTON_OK) {
      /* Flash animation */
      if (!$('.remote_selection').is('input[type="text"]')) {
        this.flashRemoteSelection();
      }

      /* Give focus, or trigger click on selected element */
      if ($('.remote_selection').is('input')) {
        if ($('.remote_selection').is(':focus')) {
          $('.remote_selection').blur();
        } else {
          $('.remote_selection').focus();
        }
      } else {
        $(
          '.settings_content.active .remote_selection:not(:disabled,[disabled])'
        ).trigger('click');
      }
    }
  },
  /* Modal Keypress */
  settingsKeypressModal: function(key) {
    var keyCode = key.keyCode;

    /* Enable rows */
    $('.modal_setting_row_enabled').removeClass('modal_setting_row_enabled');
    $('.modal_active .modal_settings_row').each(function() {
      if (
        $(this).find(
          '[data-remote-index]:not(:disabled,[disabled]):visible:first'
        ).length
      ) {
        $(this).addClass('modal_setting_row_enabled');
      }
    });

    // Get current setting index in current row
    // Get current row index
    var contentSettingRowCount =
      $('.modal_active .modal_settings_row.modal_setting_row_enabled').length -
      1;
    var contentSettingRowIndex = $(
      '.modal_active .modal_settings_row.active_modal_row'
    ).index('.modal_active .modal_settings_row.modal_setting_row_enabled');
    var indexRowNext;
    var indexRowPrev;

    if (contentSettingRowIndex === contentSettingRowCount) {
      indexRowNext = contentSettingRowIndex;
      indexRowNext = 0;
      indexRowPrev = contentSettingRowIndex - 1;
    } else if (contentSettingRowIndex === 0) {
      indexRowNext = 1;
      indexRowPrev = contentSettingRowCount;
    } else {
      indexRowNext = contentSettingRowIndex + 1;
      indexRowPrev = contentSettingRowIndex - 1;
    }

    var contentSettingCount =
      $(
        '.modal_active .modal_settings_row.active_modal_row [data-remote-index]:visible:not(:disabled,[disabled])'
      ).length - 1;
    var contentSettingIndex = $(
      '.modal_active .modal_settings_row.active_modal_row .remote_selection'
    ).index(
      '.active_modal_row [data-remote-index]:visible:not(:disabled,[disabled])'
    );
    var indexSettingNext;
    var indexSettingPrev;

    if (contentSettingIndex === contentSettingCount) {
      indexSettingNext = contentSettingIndex;
      indexSettingNext = 0;
      indexSettingPrev = contentSettingIndex - 1;
    } else if (contentSettingIndex === 0) {
      indexSettingNext = 1;
      indexSettingPrev = contentSettingCount;
    } else {
      indexSettingNext = contentSettingIndex + 1;
      indexSettingPrev = contentSettingIndex - 1;
    }

    /* What key was pressed? */
    if (
      keyCode === BUTTON_0 ||
      keyCode === BUTTON_1 ||
      keyCode === BUTTON_2 ||
      keyCode === BUTTON_3 ||
      keyCode === BUTTON_4 ||
      keyCode === BUTTON_5 ||
      keyCode === BUTTON_6 ||
      keyCode === BUTTON_7 ||
      keyCode === BUTTON_8 ||
      keyCode === BUTTON_9
    ) {
      if ($('.remote_selection').is('input[type="number"]')) {
        if (keyCode === BUTTON_1) {
          $('.remote_selection').val(1);
        } else if (keyCode === BUTTON_2) {
          $('.remote_selection').val(2);
        } else if (keyCode === BUTTON_3) {
          $('.remote_selection').val(3);
        } else if (keyCode === BUTTON_4) {
          $('.remote_selection').val(4);
        } else if (keyCode === BUTTON_5) {
          $('.remote_selection').val(5);
        } else if (keyCode === BUTTON_6) {
          $('.remote_selection').val(6);
        } else if (keyCode === BUTTON_7) {
          $('.remote_selection').val(7);
        } else if (keyCode === BUTTON_8) {
          $('.remote_selection').val(8);
        } else if (keyCode === BUTTON_9) {
          $('.remote_selection').val(9);
        } else if (keyCode === BUTTON_0) {
          $('.remote_selection').val(0);
        }

        $('.remote_selection').trigger('change');

        /* Progress to next number input on successful input */
        if (
          $('.remote_selection')
            .closest('.fwi_input_group.numbers')
            .nextAll('.fwi_input_group.numbers').length
        ) {
          this.flashRemoteSelection();

          var nextSelection = $('.remote_selection')
            .closest('.fwi_input_group.numbers')
            .nextAll('.fwi_input_group.numbers')
            .first()
            .find('input[type="number"]');

          nextSelection.prop('disabled', false);

          if (!$('.remote_selection').hasClass('unfocus_error')) {
            $('.remote_selection').removeClass('remote_selection');
            nextSelection.addClass('remote_selection');
          }
        }
      }
    } else if (keyCode === BUTTON_LEFT) {
      if (contentSettingIndex > 0) {
        $('.remote_selection').removeClass('remote_selection');
        $(
          '.modal_active .modal_settings_row.active_modal_row [data-remote-index]:visible:not(:disabled,[disabled]):eq("' +
            indexSettingPrev +
            '")'
        ).addClass('remote_selection');
      }
    } else if (keyCode === BUTTON_RIGHT) {
      if (contentSettingIndex !== contentSettingCount) {
        $('.remote_selection').removeClass('remote_selection');
        $(
          '.modal_active .modal_settings_row.active_modal_row [data-remote-index]:visible:not(:disabled,[disabled]):eq("' +
            indexSettingNext +
            '")'
        ).addClass('remote_selection');
      }
    } else if (keyCode === BUTTON_UP) {
      if (contentSettingRowCount > 0) {
        $('.active_modal_row').removeClass('active_modal_row');
        $(
          '.modal_active .modal_settings_row.modal_setting_row_enabled:eq(' +
            indexRowPrev +
            ')'
        ).addClass('active_modal_row');
        this.focusActiveModalRow();
      }
    } else if (keyCode === BUTTON_DOWN) {
      if (contentSettingRowCount > 0) {
        $('.active_modal_row').removeClass('active_modal_row');
        $(
          '.modal_active .modal_settings_row.modal_setting_row_enabled:eq(' +
            indexRowNext +
            ')'
        ).addClass('active_modal_row');
        this.focusActiveModalRow();
      }
    } else if (keyCode === BUTTON_OK) {
      this.flashRemoteSelection();

      if (!$('.remote_selection').is('input')) {
        $('.modal_active .remote_selection:not(:disabled,[disabled])').trigger(
          'click'
        );
      }
    }
  },
  /* Show focus/click CSS effect */
  flashRemoteSelection: function() {
    var rS = $('.remote_selection');

    rS.addClass('focus');
    setTimeout(function() {
      if (!rS.is('input')) {
        rS.closest('div')
          .find('input')
          .blur();
        rS.blur();
      } else if (rS.is('input[type="number"]')) {
        rS.blur();
      }
      rS.removeClass('focus');
    }, 400);
  },
  /* Activate Tab when selected */
  loadSettingTab: function() {
    if (
      !$('.settings_sidebar ul li.remote_selection').hasClass('setting_exit')
    ) {
      var setting = $('.settings_sidebar ul li.remote_selection').attr(
        'data-setting'
      );

      if (setting) {
        $('.settings_inner .settings_sidebar ul li.current_tab').removeClass(
          'current_tab'
        );
        $('.settings_inner .settings_content.active').removeClass('active');
        $('.settings_sidebar ul li[data-setting="' + setting + '"]').addClass(
          'current_tab'
        );
        $('.settings_content[data-setting="' + setting + '"]').addClass(
          'active'
        );
      }
    }
  },
  /* Focus on the settings tab */
  focusSettingTab: function(setting) {
    if (setting) {
      $('.settings_inner .settings_sidebar ul li.current_tab').removeClass(
        'current_tab'
      );
      $('.settings_inner .settings_content.active').removeClass('active');

      $('.settings_sidebar ul li[data-setting="' + setting + '"]').addClass(
        'current_tab'
      );
      $('.settings_content[data-setting="' + setting + '"]').addClass('active');

      //activate first element of first setting row in active tab
      $('.setting_row_enabled').removeClass('setting_row_enabled');
      $('.settings_content.active .settings_row').each(function() {
        if (
          $(this).find(
            '[data-remote-index]:not(:disabled,[disabled]):visible:first'
          ).length ||
          $(this).hasClass('settings_about_row')
        ) {
          $(this).addClass('setting_row_enabled');
        }
      });
      $('.active_row').removeClass('active_row');
      $(
        '.settings_content.active .settings_row.setting_row_enabled:first'
      ).addClass('active_row');

      if (FWI_Settings.focusActiveRow()) {
        FWI_Settings.currentSetting = setting;
        FWI_Settings.currentSelection = 'main';
        return true;
      } else {
        this.focusSettingSidebar(
          $('.settings_content.active').attr('data-setting')
        );
      }
    }
  },
  /* Focus Active Row / Scroll / Select enabled element */
  focusActiveRow: function() {
    FWI_Settings.settingsScroll();

    var $firstActiveRow = $(
      '.settings_content.active .settings_row.active_row [data-remote-index]:not(:disabled,[disabled]):visible:first'
    );
    var $currentSelection = $('.remote_selection');

    if ($firstActiveRow.length) {
      $currentSelection.removeClass('remote_selection');
      $firstActiveRow.addClass('remote_selection');

      // Scroll active element within viewport if currently outside.
      // See: https://stackoverflow.com/questions/20791374/jquery-check-if-element-is-visible-in-viewport
      var offset = $firstActiveRow.offset();
      var topElement = offset.top;
      var bottomElement = topElement + $firstActiveRow.outerHeight();
      var bottomScreen = $(window).scrollTop() + window.innerHeight;
      var topScreen = $(window).scrollTop();

      if (bottomScreen > topElement && topScreen < bottomElement) {
        // The element is visible. Ignore.
      } else {
        // The element is not visible, so scroll it into view.
        $firstActiveRow[0].scrollIntoView();
      }
      return true;
    } else {
      $currentSelection.removeClass('remote_selection');
      return false;
    }
  },
  /* Focus modal */
  focusModal: function() {
    $('.active_modal_row').removeClass('active_modal_row');
    $('.modal_active .modal_settings_row:first').addClass('active_modal_row');
    $('.remote_selection').removeClass('remote_selection');
    $(
      '.modal_active .modal_settings_row.active_modal_row [data-remote-index]:visible:not(:disabled,[disabled]):first'
    ).addClass('remote_selection');
  },
  /* Focus Active Row in Modal */
  focusActiveModalRow: function() {
    if (
      $(
        '.modal_active .modal_settings_row.active_modal_row [data-remote-index]:visible:not(:disabled,[disabled]):first'
      ).length
    ) {
      $('.remote_selection').removeClass('remote_selection');
      $(
        '.modal_active .modal_settings_row.active_modal_row [data-remote-index]:visible:not(:disabled,[disabled]):first'
      ).addClass('remote_selection');
      return true;
    } else {
      return false;
    }
  },
  /* Focus on selected setting, or default to deploy */
  focusSettingSidebar: function(setting) {
    $('.remote_selection').removeClass('remote_selection');
    $('.active_row').removeClass('active_row');

    if (setting) {
      $(
        '.settings_sidebar ul li.current_tab[data-setting="' + setting + '"]'
      ).addClass('remote_selection');
    } else {
      $('.current_tab').removeClass('current_tab');
      $('.settings_sidebar ul li[data-setting="setting_deploy"]').addClass(
        'remote_selection current_tab'
      );
    }

    this.currentSelection = 'sidebar';
  },
  /* Run tab focus events if any; refresh data etc */
  tabFocusEvent: function(settingName) {
    switch (settingName) {
      case 'setting_deploy':
        FWI_Deploy.tabFocus();
        break;
      case 'setting_about':
        FWI_About.tabFocus();
        break;
    }
  },
  /* Run tab unload/unfocus events if any; validation etc */
  tabUnfocusEvent: function(settingName) {
    switch (settingName) {
      case 'setting_deploy':
        FWI_Deploy.tabUnfocus();
        break;
      case 'setting_software':
        FWI_Software.tabUnfocus();
        break;
      case 'setting_hardware':
        FWI_Hardware.tabUnfocus();
        break;
      case 'setting_monitoring':
        FWI_Monitoring.tabUnfocus();
        break;
      case 'setting_advanced':
        FWI_Advanced.tabUnfocus();
        break;
      case 'setting_about':
        FWI_About.tabUnfocus();
        break;
    }
  },

  clearSelections: function() {
    $('.active_row').removeClass('active_row');
    $('.remote_selection').removeClass('remote_selection');
    $('.active_modal_row').removeClass('active_modal_row');
  },

  bindSettings: function() {
    /* Access Code */
    $('.access_code_enter_modal button.access_code_done').on(
      'click',
      function() {
        if (FWI_Settings.checkAccessCode()) {
          $('.code_is_not_set').hide();
          $('.code_is_set').show();
          FWI_Software.disableAccessModal();
          FWI_App.displaySettingsAfterCheck();
        }
      }
    );
    $('.access_code_enter_modal button.access_code_cancel').on(
      'click',
      function() {
        FWI_Settings.clearSelections();
        FWI_Software.clearAccessInputs();
        FWI_App.displayPlayer();
      }
    );

    // Exit sidebar.
    $('.setting_exit').on('click', function(e) {
      e.preventDefault();
      FWI_Settings.exit();
    });
  },

  // Exits the settings dialog, uploads the latest status if applicable, and displays the player.
  exit: function() {
    // Upload latest status upon exit if status upload is enabled.
    if (FWI_Monitoring.monStatusEnabled && FWI_Advanced.advEnabled) {
      FWI_Monitoring.uploadStatus();
    }

    FWI_App.displayPlayer();
  },

  init: function() {
    FWI_App.log('Initializing Settings', 'DEBUG');
    this.bindSettings();
    FWI_App.log('Settings initialized', 'DEBUG');
  }
};
