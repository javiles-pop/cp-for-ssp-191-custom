var BUTTON_LEFT = 37,
  BUTTON_UP = 38,
  BUTTON_RIGHT = 39,
  BUTTON_DOWN = 40,
  BUTTON_OK = 13,
  BUTTON_SPACE = 32,
  BUTTON_RED = 403,
  BUTTON_GREEN = 404,
  BUTTON_YELLOW = 405,
  BUTTON_BLUE = 406,
  BUTTON_POWER = 409,
  BUTTON_DONE = 65376,
  BUTTON_CANCEL = 65385,
  BUTTON_ESC = 27,
  BUTTON_TAB = 9,
  BUTTON_0 = 48,
  BUTTON_1 = 49,
  BUTTON_2 = 50,
  BUTTON_3 = 51,
  BUTTON_4 = 52,
  BUTTON_5 = 53,
  BUTTON_6 = 54,
  BUTTON_7 = 55,
  BUTTON_8 = 56,
  BUTTON_9 = 57,
  BUTTON_PGUP = 33,
  BUTTON_PGDN = 34,
  BUTTON_C = 67,
  BUTTON_D = 68,
  BUTTON_R = 82;

var FWI_Remote = {
  /* Bind Global Buttons and Routes */
  bindRoutes: function() {
    // Allow mouse double-click in hot-spot to enter configuration screen.
    $('.fwi_homeButton').dblclick(function() {
      if (FWI_App.currentScreen !== 'screen_settings') {
        FWI_App.log(
          'Configuration screen triggered by double-clicking hot-spot.',
          'DEBUG'
        );
        FWI_App.displaySettings();
      }
    });

    var settings = [
      'setting_deploy',
      'setting_software',
      'setting_hardware',
      'setting_monitoring',
      'setting_advanced',
      'setting_about'
    ];

    for (var index = 0; index < settings.length; ++index) {
      var settingName = settings[index];

      $('.' + settingName).click(
        $.proxy(
          function(settingName) {
            // Get selected item.
            var $newSelection = $('.settings_sidebar ul li.' + settingName);

            // Remove current selection unless it's the same.
            var $currentSelection = $(
              '.settings_sidebar ul li.remote_selection'
            );

            if ($newSelection[0] !== $currentSelection[0]) {
              $currentSelection.removeClass('remote_selection');
            }

            $newSelection.addClass('remote_selection');

            // Focus on the relevant setting.
            FWI_Settings.loadSettingTab();
            FWI_Settings.tabFocusEvent(settingName);
            FWI_Settings.flashRemoteSelection(); // Show focus effect.

            var allowTabFocus =
              settingName !== 'setting_monitoring' || FWI_Advanced.advEnabled;

            if (allowTabFocus) {
              FWI_Settings.focusSettingTab(settingName); // Focus setting.
            }
          },
          this,
          settingName
        )
      );
    }

    FWI_App.log('Registering keyboard events.', 'DEBUG');

    window.addEventListener('keydown', function(e) {
      var keyCode = e.keyCode;

      // if (/^(test|dev|staging)/.test('prod')) {
      //   FWI_App.log({
      //     msg:
      //       'Keys: ' +
      //       keyCode +
      //       '\nShift: ' +
      //       e.shiftKey +
      //       '\nCtrl: ' +
      //       e.ctrlKey +
      //       '\nAlt: ' +
      //       e.altKey,
      //     level: 'DEBUG',
      //     preventStoring: true
      //   });
      // }

      if (keyCode === BUTTON_D && e.altKey && e.ctrlKey) {
        if (FWI_App.currentScreen === 'screen_settings') {
          if (FWI_App.dev) {
            $('.dev_items').hide();
          } else {
            // Show the diagnostics button.
            $('.dev_items').show();

            // Switch to Deployment screen as that is where the Diagnostics output
            // is displayed.
            FWI_Settings.focusSettingTab('setting_deploy');
          }
          FWI_App.dev = !FWI_App.dev;
        }
      } else if (
        keyCode === BUTTON_BLUE ||
        (keyCode === BUTTON_C && e.altKey)
      ) {
        // Show the settings screen
        if (FWI_App.currentScreen != 'screen_settings') {
          FWI_App.displaySettings();
        }
      } else if (keyCode === BUTTON_YELLOW) {
        // Toggle Screen Orientation
        FWI_Hardware.changeDeviceOrientation();
      } else if (keyCode === BUTTON_RED) {
        HOST_DEVICE.reloadPlayer();
      } else if (keyCode === BUTTON_POWER || keyCode === BUTTON_GREEN) {
        HOST_DEVICE.togglePanel();
      } else if (keyCode === BUTTON_ESC) {
        if (
          document.activeElement.type === 'text' ||
          document.activeElement.type === 'password'
        ) {
          $(document.activeElement).blur();
        }

      } else if (keyCode === BUTTON_R && e.altKey) {
          var player = document.getElementById('player_iframe');
          var url = player.src;
          player.src = "";
          player.src = url;
      } else {
        switch (FWI_App.currentScreen) {
          case 'time_zone_selection':
            FWI_Advanced.settingsKeypress(e);
            return;
          case 'screen_settings':
            FWI_Settings.settingsKeypress(e);
            return;
          case 'screen_access_code':
            FWI_Settings.settingsKeypress(e);
            break;
          default: {
            /* Blur the field on Done/Cancel for SSSP */
            var remoteSelection = $('.remote_selection');

            if (remoteSelection.is('input')) {
              if (remoteSelection.is(':focus')) {
                remoteSelection.blur();
              } else {
                remoteSelection.focus();
              }
            } else if (remoteSelection.is('button')) {
              if (!remoteSelection.is(':disabled')) {
                remoteSelection.click();
              }
            }
          }
        }
      }

      // Arrow keys can cause app screen to shift on certain devices, so we ignore these if selection is not in focus.
      if (
        !HOST_DEVICE.allowArrowKeys() &&
        (keyCode === BUTTON_PGUP ||
          keyCode === BUTTON_PGDN ||
          keyCode === BUTTON_LEFT ||
          keyCode === BUTTON_UP ||
          keyCode === BUTTON_RIGHT ||
          keyCode === BUTTON_DOWN) &&
        !$('.remote_selection').is(':focus')
      ) {
        return false;
      }

      if (keyCode === BUTTON_TAB) {
        return false;
      }
    });
  },

  init: function() {
    FWI_App.log('Initializing Remote', 'DEBUG');
    HOST_DEVICE.registerRemoteKeys();
    this.bindRoutes();
    FWI_App.log('Remote initialized', 'DEBUG');
  }
};
