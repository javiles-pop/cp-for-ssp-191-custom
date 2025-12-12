var FWI_PreDeploy = {
  currentDeployURL: 'https://',
  currentServices: 'https://;;;',

  validatedDeploy: null,
  validatedServices: null,

  validatingDeploy: false,
  validatingServices: false,

  isLinkPublic: false,

  deployError: null,
  serviceError: null,

  fields: {
    deployHTTP: null,
    deployURL: null,
    deployIcon: null,
    serviceHTTP: null,
    serviceURL: null,
    serviceIcon: null,
    company: null,
    username: null,
    password: null,
    verifyButton: null,
    errorMessage: null
  },

  init: function() {
    FWI_PreDeploy.fields.deployHTTP = $('[name="pre-deployment_http"]');
    FWI_PreDeploy.fields.deployURL = $('[name="pre-deployment_url"]');
    FWI_PreDeploy.fields.deployIcon = FWI_PreDeploy.fields.deployURL
      .closest('.settings_row')
      .next();
    FWI_PreDeploy.fields.serviceHTTP = $('[name="pre-fwiservices_http"]');
    FWI_PreDeploy.fields.serviceURL = $('[name="pre-fwiservices_url"]');
    FWI_PreDeploy.fields.serviceIcon = FWI_PreDeploy.fields.serviceURL
      .closest('.settings_row')
      .next();
    FWI_PreDeploy.fields.company = $('[name="pre-fwiservices_company"]');
    FWI_PreDeploy.fields.username = $('[name="pre-fwiservices_username"]');
    FWI_PreDeploy.fields.password = $('[name="pre-fwiservices_password"]');
    FWI_PreDeploy.fields.verifyButton = $('#pre-deploy_verify');
    FWI_PreDeploy.fields.errorMessage = $('#pre-deploy_messages');
    var onlineIndicator = $('.network-status');

    var modal = $('.device__pre-deployment__dialog');

    $('.device__pre-deployment__dialog').show();

    $(document).on('keydown', function(e) {
      var keyCode = e.keyCode;
      var activePreDeployElement = modal.find('.focused-input');
      var activeKey =
        activePreDeployElement[0].name || activePreDeployElement[0].id;
      var nextFocus;

      if (keyCode === BUTTON_TAB) {
        e.preventDefault();

        if (e.shiftKey) {
          switch (activeKey) {
            case 'pre-deployment_http':
              if (FWI_PreDeploy.fields.verifyButton.prop('disabled')) {
                nextFocus = '[name="pre-fwiservices_password"]';
              } else {
                nextFocus = '#pre-deploy_verify';
              }
              break;
            case 'pre-deployment_url':
              nextFocus = '[name="pre-deployment_http"]';
              break;
            case 'pre-fwiservices_http':
              nextFocus = '[name="pre-deployment_url"]';
              break;
            case 'pre-fwiservices_url':
              nextFocus = '[name="pre-fwiservices_http"]';
              break;
            case 'pre-fwiservices_company':
              nextFocus = '[name="pre-fwiservices_url"]';
              break;
            case 'pre-fwiservices_username':
              nextFocus = '[name="pre-fwiservices_company"]';
              break;
            case 'pre-fwiservices_password':
              nextFocus = '[name="pre-fwiservices_username"]';
              break;
            case 'pre-deploy_verify':
              nextFocus = '[name="pre-fwiservices_password"]';
              break;
          }
        } else {
          switch (activeKey) {
            case 'pre-deployment_http':
              nextFocus = '[name="pre-deployment_url"]';
              break;
            case 'pre-deployment_url':
              nextFocus = '[name="pre-fwiservices_http"]';
              break;
            case 'pre-fwiservices_http':
              nextFocus = '[name="pre-fwiservices_url"]';
              break;
            case 'pre-fwiservices_url':
              nextFocus = '[name="pre-fwiservices_company"]';
              break;
            case 'pre-fwiservices_company':
              nextFocus = '[name="pre-fwiservices_username"]';
              break;
            case 'pre-fwiservices_username':
              nextFocus = '[name="pre-fwiservices_password"]';
              break;
            case 'pre-fwiservices_password':
              if (FWI_PreDeploy.fields.verifyButton.prop('disabled')) {
                nextFocus = '[name="pre-deployment_http"]';
              } else {
                nextFocus = '#pre-deploy_verify';
              }
              break;
            case 'pre-deploy_verify':
              nextFocus = '[name="pre-deployment_http"]';
              break;
          }
        }

        $('.focused-input').removeClass('focused-input');

        if (nextFocus) {
          var next = modal.find(nextFocus);

          next.addClass('focused-input');
          next.focus();
        }
      } else {
        if (keyCode === BUTTON_UP) {
          switch (activeKey) {
            case 'pre-deployment_http':
            case 'pre-deployment_url':
              if (FWI_PreDeploy.fields.verifyButton.prop('disabled')) {
                nextFocus = '[name="pre-fwiservices_password"]';
              } else {
                nextFocus = '#pre-deploy_verify';
              }
              break;
            case 'pre-fwiservices_http':
            case 'pre-fwiservices_url':
              nextFocus = '[name="pre-deployment_url"]';
              break;
            case 'pre-fwiservices_company':
              nextFocus = '[name="pre-fwiservices_url"]';
              break;
            case 'pre-fwiservices_username':
              nextFocus = '[name="pre-fwiservices_company"]';
              break;
            case 'pre-fwiservices_password':
              nextFocus = '[name="pre-fwiservices_username"]';
              break;
            case 'pre-deploy_verify':
              nextFocus = '[name="pre-fwiservices_password"]';
              break;
          }
        } else if (keyCode === BUTTON_DOWN) {
          switch (activeKey) {
            case 'pre-deployment_http':
            case 'pre-deployment_url':
              nextFocus = '[name="pre-fwiservices_url"]';
              break;
            case 'pre-fwiservices_http':
            case 'pre-fwiservices_url':
              nextFocus = '[name="pre-fwiservices_company"]';
              break;
            case 'pre-fwiservices_company':
              nextFocus = '[name="pre-fwiservices_username"]';
              break;
            case 'pre-fwiservices_username':
              nextFocus = '[name="pre-fwiservices_password"]';
              break;
            case 'pre-fwiservices_password':
              if (FWI_PreDeploy.fields.verifyButton.prop('disabled')) {
                nextFocus = '[name="pre-deployment_url"]';
              } else {
                nextFocus = '#pre-deploy_verify';
              }
              break;
            case 'pre-deploy_verify':
              nextFocus = '[name="pre-deployment_url"]';
              break;
          }
        } else if (keyCode === BUTTON_RIGHT) {
          switch (activeKey) {
            case 'pre-deployment_http':
              nextFocus = '[name="pre-deployment_url"]';
              break;
            case 'pre-fwiservices_http':
              nextFocus = '[name="pre-fwiservices_url"]';
              break;
          }
        } else if (keyCode === BUTTON_LEFT) {
          switch (activeKey) {
            case 'pre-deployment_url':
              if (
                document.activeElement !== FWI_PreDeploy.fields.deployURL[0]
              ) {
                nextFocus = '[name="pre-deployment_http"]';
              }
              break;
            case 'pre-fwiservices_url':
              if (
                document.activeElement !== FWI_PreDeploy.fields.serviceURL[0]
              ) {
                nextFocus = '[name="pre-fwiservices_http"]';
              }
              break;
          }
        }

        if (nextFocus) {
          if (activePreDeployElement[0] === document.activeElement) {
            if (
              activePreDeployElement[0].type === 'text' ||
              activePreDeployElement[0].type === 'password'
            ) {
              return;
            }

            activePreDeployElement.blur();
          }

          activePreDeployElement.removeClass('focused-input');

          next = modal.find(nextFocus);
          next.addClass('focused-input');

          if (next[0].type !== 'text' && next[0].type !== 'password') {
            next.focus();
          }
        } else if (
          keyCode === BUTTON_UP ||
          keyCode === BUTTON_DOWN ||
          keyCode === BUTTON_LEFT ||
          keyCode === BUTTON_RIGHT
        ) {
          if (
            activePreDeployElement[0].type !== 'text' &&
            activePreDeployElement[0].type !== 'password'
          ) {
            activePreDeployElement.removeClass('focused-input');
            FWI_PreDeploy.fields.deployURL.addClass('focused-input');
          }
        } else if (keyCode === BUTTON_OK) {
          if (
            activePreDeployElement[0].type === 'text' ||
            activePreDeployElement[0].type === 'password'
          ) {
            if (activePreDeployElement[0] === document.activeElement) {
              activePreDeployElement.blur();
            } else {
              activePreDeployElement.focus();
            }
          } else if (activePreDeployElement[0].type === 'checkbox') {
            activePreDeployElement[0].checked = !activePreDeployElement[0]
              .checked;
          }
        } else if (keyCode === BUTTON_ESC) {
          if (
            activePreDeployElement[0].type === 'text' ||
            activePreDeployElement[0].type === 'password'
          ) {
            if (activePreDeployElement[0] === document.activeElement) {
              activePreDeployElement.blur();
            }
          }
        }
      }
    });

    var httpInputs = $('.http-input');

    httpInputs
      .focus(function(e) {
        $(e.target)
          .parent()
          .addClass('focused');
      })
      .blur(function(e) {
        $(e.target)
          .parent()
          .removeClass('focused');
      });

    FWI_PreDeploy.fields.verifyButton;

    FWI_PreDeploy.fields.verifyButton
      .focus(function() {
        FWI_PreDeploy.fields.verifyButton.addClass('focused');
      })
      .blur(function() {
        FWI_PreDeploy.fields.verifyButton.removeClass('focused');
      });

    FWI_PreDeploy.fields.deployURL.on('input', function(e) {
      var value = e.target.value;

      FWI_PreDeploy.fields.verifyButton.prop('disabled', value.length === 0);

      FWI_PreDeploy.setDeployNeedsValidation();
    });
    FWI_PreDeploy.fields.deployHTTP.on('keydown', function(e) {
      if (e.keyCode === BUTTON_OK || e.keyCode === BUTTON_SPACE) {
        setTimeout(FWI_PreDeploy.setDeployNeedsValidation, 200);
      }
    });

    FWI_PreDeploy.fields.serviceURL.on(
      'input',
      FWI_PreDeploy.setServicesNeedsValidation
    );
    FWI_PreDeploy.fields.company.on(
      'input',
      FWI_PreDeploy.setServicesNeedsValidation
    );
    FWI_PreDeploy.fields.username.on(
      'input',
      FWI_PreDeploy.setServicesNeedsValidation
    );
    FWI_PreDeploy.fields.password.on(
      'input',
      FWI_PreDeploy.setServicesNeedsValidation
    );
    FWI_PreDeploy.fields.serviceHTTP.on('keydown', function(e) {
      if (e.keyCode === BUTTON_OK || e.keyCode === BUTTON_SPACE) {
        setTimeout(FWI_PreDeploy.setServicesNeedsValidation, 200);
      }
    });

    FWI_PreDeploy.fields.deployURL.focus();

    FWI_PreDeploy.fields.verifyButton.on('click', FWI_PreDeploy.handleVerify);

    var onNetworkStatusSuccess = function(online) {
      if (online) {
        onlineIndicator
          .removeClass('network-status__disconnected')
          .addClass('network-status__connected');
      } else {
        onlineIndicator
          .removeClass('network-status__connected')
          .addClass('network-status__disconnected');
      }
    };
    var onNetworkStatusError = function() {
      // Assume offline.
      onlineIndicator
        .removeClass('network-status__connected')
        .addClass('network-status__disconnected');
    };
    // Initial online check.
    HOST_DEVICE.isDeviceOnline(onNetworkStatusSuccess, onNetworkStatusError);
    FWI_PreDeploy.onlineInterval = window.setInterval(function() {
      HOST_DEVICE.isDeviceOnline(onNetworkStatusSuccess, onNetworkStatusError);
    }, HOST_DEVICE.onlineCheckFrequency());
  },

  setDeployNeedsValidation: function() {
    var secureDeploy = !FWI_PreDeploy.fields.deployHTTP[0].checked;
    var deployURL = FWI_PreDeploy.fields.deployURL.val();

    var url = 'http' + (secureDeploy ? 's' : '') + '://' + deployURL;

    if (FWI_PreDeploy.currentDeployURL !== url) {
      FWI_PreDeploy.setFieldNeedValidation(FWI_PreDeploy.fields.deployIcon);
    } else {
      FWI_PreDeploy.removeFieldNeedValidation(FWI_PreDeploy.fields.deployIcon);
    }
  },

  setServicesNeedsValidation: function() {
    if (FWI_PreDeploy.currentServices !== FWI_PreDeploy.mergedServices()) {
      FWI_PreDeploy.setFieldNeedValidation(FWI_PreDeploy.fields.serviceIcon);
    } else {
      FWI_PreDeploy.removeFieldNeedValidation(FWI_PreDeploy.fields.serviceIcon);
    }
  },

  mergedServices: function() {
    var secureService = !FWI_PreDeploy.fields.serviceHTTP[0].checked;
    var url = FWI_PreDeploy.fields.serviceURL.val();
    var serviceURL = 'http' + (secureService ? 's' : '') + '://' + url;
    var company = FWI_PreDeploy.fields.company.val();
    var username = FWI_PreDeploy.fields.username.val();
    var password = FWI_PreDeploy.fields.password.val();

    return serviceURL + ';' + company + ';' + username + ';' + password;
  },

  handleVerify: function() {
    var secureDeploy = !FWI_PreDeploy.fields.deployHTTP[0].checked;

    var deployURL = FWI_PreDeploy.fields.deployURL.val();

    FWI_PreDeploy.currentDeployURL =
      'http' + (secureDeploy ? 's' : '') + '://' + deployURL;

    if (
      deployURL &&
      FWI_PreDeploy.validatedDeploy !== FWI_PreDeploy.currentDeployURL
    ) {
      FWI_PreDeploy.beginValidating();
      FWI_Deploy.testURL = FWI_PreDeploy.currentDeployURL;
      FWI_PreDeploy.validatingDeploy = true;

      if (FWI_Deploy.validateURL(FWI_PreDeploy.currentDeployURL)) {
        // FWI_Deploy.connectToWebPlayer(
        //   FWI_PreDeploy.currentDeployURL,
        //   FWI_PreDeploy.connectSuccess(FWI_Deploy.testURL),
        //   FWI_PreDeploy.connectFailure
        // );

        FWI_Deploy2.getFinalSignURL(FWI_PreDeploy.currentDeployURL)
          .then(url => {
            console.log('got final sign url: ', url);
            FWI_Deploy.testURL = url;
            FWI_PreDeploy.connectSuccess(url, FWI_Deploy.isLinkPublic);
          })
          .catch(error => {
            console.log('failed to get final sign url', error)
            FWI_PreDeploy.connectFailure(error);
          })
      } else {
        FWI_PreDeploy.connectFailure(
          FWI_Localization.getResource(
            'browserBased',
            'deploy_message_badUrlFormat',
            'Bad URL Format. Please Try Again.'
          )
        );
      }
    } else if (
      FWI_PreDeploy.validatedDeploy === FWI_PreDeploy.currentDeployURL
    ) {
      setTimeout(FWI_PreDeploy.validationComplete, 1);
    }

    var secureService = !FWI_PreDeploy.fields.serviceHTTP[0].checked;

    var host = FWI_PreDeploy.fields.serviceURL.val();

    var serviceURL = 'http' + (secureService ? 's' : '') + '://' + host;
    var company = FWI_PreDeploy.fields.company.val();
    var username = FWI_PreDeploy.fields.username.val();
    var password = FWI_PreDeploy.fields.password.val();

    FWI_PreDeploy.currentServices = FWI_PreDeploy.mergedServices();

    if (
      (host || company || username || password) &&
      FWI_PreDeploy.validatedServices !== FWI_PreDeploy.currentServices
    ) {
      FWI_PreDeploy.beginValidating();
      FWI_PreDeploy.validatingServices = true;
      FWI_Advanced.validateCreds(
        serviceURL,
        company,
        username,
        password,
        FWI_PreDeploy.serviceSuccess(serviceURL, company, username, password),
        FWI_PreDeploy.serviceFailure
      );
    } else if (!host && !company && !username && !password) {
      FWI_PreDeploy.serviceError = null;
    } else if (
      FWI_PreDeploy.validatedServices === FWI_PreDeploy.currentServices
    ) {
      setTimeout(FWI_PreDeploy.validationComplete, 1);
    }
  },

  beginValidating: function() {
    FWI_PreDeploy.fields.errorMessage.html('');
    FWI_PreDeploy.fields.verifyButton.prop('disabled', true);
    $('[name^="pre-"]').prop('disabled', true);
  },

  serviceSuccess: function(host, company, username, password) {
    return function() {
      FWI_Advanced.advHost = host;
      HOST_DEVICE.setSetting('adv_host', host);
      FWI_Advanced.advComp = company;
      HOST_DEVICE.setSetting('adv_comp', company);
      FWI_Advanced.advUser = username;
      HOST_DEVICE.setSetting('adv_user', username);
      FWI_Advanced.advPass = password;
      HOST_DEVICE.setSetting(
        'adv_pass',
        FWI_Helper.encrypt(password, HOST_DEVICE.getDeviceId())
      );
      FWI_Advanced.enableServices();
      FWI_PreDeploy.setFieldSuccess(FWI_PreDeploy.fields.serviceIcon);
      FWI_PreDeploy.validatedServices = FWI_PreDeploy.mergedServices();
      FWI_PreDeploy.serviceError = null;
      FWI_PreDeploy.validatingServices = false;
      FWI_PreDeploy.validationComplete();
    };
  },

  serviceFailure: function(msg) {
    FWI_PreDeploy.setFieldError(FWI_PreDeploy.fields.serviceIcon);
    FWI_PreDeploy.validatedServices = null;
    FWI_PreDeploy.serviceError = msg;
    FWI_PreDeploy.validatingServices = false;
    FWI_PreDeploy.validationComplete();
  },

  validationComplete: function() {
    if (FWI_PreDeploy.validatingDeploy || FWI_PreDeploy.validatingServices) {
      // If 1 of the endpoints is still processing, wait
      return;
    }

    if (FWI_PreDeploy.deployError || FWI_PreDeploy.serviceError) {
      FWI_PreDeploy.fields.verifyButton.prop('disabled', false);
      $('[name^="pre-"]').prop('disabled', false);

      FWI_PreDeploy.fields.verifyButton.focus();

      var errorMsg = FWI_PreDeploy.deployError;

      if (errorMsg && FWI_PreDeploy.serviceError) {
        errorMsg += '\n\n' + FWI_PreDeploy.serviceError;
      } else if (FWI_PreDeploy.serviceError) {
        errorMsg = FWI_PreDeploy.serviceError;
      }

      FWI_PreDeploy.fields.errorMessage.html(errorMsg);
    } else {
      $('.device__pre-deployment__dialog').hide();
      clearInterval(FWI_PreDeploy.onlineInterval);
      // pass in context so we go to the settings screen instead of starting the player
      FWI_App.alreadyDeployedStart('pre_deploy');
      // FWI_Deploy.setURL(
      //   FWI_Deploy.testURL,
      //   FWI_Deploy.isLinkPublic,
      //   FWI_Deploy.deployUrlReset
      // );

      FWI_Deploy2.setURL(FWI_Deploy.testURL);
      FWI_Deploy.deployUrlReset();
      $('input[name="player_url"]').val(FWI_Deploy.storageURL);
      FWI_Settings.focusSettingSidebar();
    }
  },

  connectSuccess: function(url, isLinkPublic) {
    FWI_PreDeploy.validatedDeploy = url;
      FWI_PreDeploy.setFieldSuccess(FWI_PreDeploy.fields.deployIcon);
      FWI_PreDeploy.isLinkPublic = isLinkPublic;
      FWI_PreDeploy.deployError = null;
      FWI_PreDeploy.validatingDeploy = false;
      $('input[name="player_url"]').val(FWI_Deploy.testURL);
      FWI_PreDeploy.validationComplete();
  },

  connectFailure: function(msg) {
    FWI_PreDeploy.setFieldError(FWI_PreDeploy.fields.deployIcon);
    FWI_PreDeploy.validatedDeploy = null;
    FWI_PreDeploy.deployError = msg;
    FWI_PreDeploy.validatingDeploy = false;
    FWI_PreDeploy.validationComplete(msg);
  },

  setFieldError: function(field) {
    field
      .removeClass('success')
      .removeClass('need_validation')
      .addClass('icon_fail');
  },

  setFieldSuccess: function(field) {
    field
      .removeClass('icon_fail')
      .removeClass('need_validation')
      .addClass('success');
  },

  setFieldNeedValidation: function(field) {
    field.addClass('need_validation');
  },

  removeFieldNeedValidation: function(field) {
    field.removeClass('need_validation');
  }
};
