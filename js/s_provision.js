var AWS = require('aws-sdk');
var AWSIoTData = require('aws-iot-device-sdk');

//-----------------------------------------------------------------------------
// Debug log toggle
//-----------------------------------------------------------------------------
var konamiCodeList = [
  BUTTON_UP,
  BUTTON_UP,
  BUTTON_DOWN,
  BUTTON_DOWN,
  BUTTON_LEFT,
  BUTTON_RIGHT,
  BUTTON_LEFT,
  BUTTON_RIGHT
];
var portionOfCodeEntered = [];
var debugEnvs = /^(test|dev|staging)/;

$(document).on('keydown', function(e) {
  // Toggle debug log screen when Konami Code is entered
  if (
    FWI_App.currentScreen !== 'screen_player' ||
    debugEnvs.test('prod')
  ) {
    portionOfCodeEntered.push(e.keyCode);

    var codeMatches = true;

    for (var i = 0; i < portionOfCodeEntered.length; i++) {
      if (portionOfCodeEntered[i] !== konamiCodeList[i]) {
        portionOfCodeEntered = [];
        codeMatches = false;
        break;
      }
    }

    if (codeMatches && portionOfCodeEntered.length === konamiCodeList.length) {
      if ($('#debug_logs').is(':visible')) {
        $('#debug_logs').hide();
      } else {
        $('#debug_logs').show();
      }

      portionOfCodeEntered = [];
    }
  } else {
    portionOfCodeEntered = [];
  }
});

//-----------------------------------------------------------------------------
// Activation code keyboard movement
//-----------------------------------------------------------------------------
document.onkeydown = function(e) {
  var keyCode = e.keyCode;
  var activeInviteElement = document.activeElement;

  if (keyCode === BUTTON_TAB) {
    if (e.shiftKey) {
      if (activeInviteElement.classList.contains('invite_code')) {
        if (!$('.invite_code_verify').prop('disabled')) {
          e.preventDefault();
          $('.invite_code_verify').focus();
        }
      } else if (activeInviteElement.classList.contains('invite_code_verify')) {
        if (!$('.invite_code').prop('disabled')) {
          e.preventDefault();
          $('.invite_code')
            .focus()
            .select();
        }
      }
    } else {
      if (activeInviteElement.classList.contains('invite_code')) {
        if (!$('.invite_code_verify').prop('disabled')) {
          e.preventDefault();
          $('.invite_code_verify').focus();
        }
      } else if (activeInviteElement.classList.contains('invite_code_verify')) {
        if (!$('.invite_code').prop('disabled')) {
          e.preventDefault();
          $('.invite_code')
            .focus()
            .select();
        }
      }
    }
  } else if (keyCode === BUTTON_UP) {
    if (activeInviteElement.classList.contains('invite_code')) {
      if (!$('.invite_code_verify').prop('disabled')) {
        $('.invite_code_verify').focus();
      }
    } else if (activeInviteElement.classList.contains('invite_code_verify')) {
      if (!$('.invite_code').prop('disabled')) {
        $('.invite_code')
          .focus()
          .select();
      }
    }
  } else if (keyCode === BUTTON_DOWN) {
    if (activeInviteElement.classList.contains('invite_code')) {
      if (!$('.invite_code_verify').prop('disabled')) {
        $('.invite_code_verify').focus();
      }
    } else if (activeInviteElement.classList.contains('invite_code_verify')) {
      if (!$('.invite_code').prop('disabled')) {
        $('.invite_code')
          .focus()
          .select();
      }
    }
  }
};

var isFirstActivationAttempt = true;
var cloudLogUploadInterval = null;

// Read configurable IOT settings or use defaults.
// var _env = 'prod'; // Can be either "prod", "demo", "deva", "devb", "future", "testa", "testb", "staginga", "stagingb", "staging", "test", "prod-eu", "prod-ap".
var awsSettingsUrl = 'https://';
var deactivatedCheckUrl = 'https://';

switch ('prod') {
  case 'demo':
  case 'deva':
  case 'devb':
  case 'testa':
  case 'testb':
    awsSettingsUrl += 'prod-api.fwi-dev';
    deactivatedCheckUrl += 'prod-api.fwi-dev';
    break;
  case 'staginga':
  case 'stagingb':
    awsSettingsUrl += 'prod-api.fwicloud';
    deactivatedCheckUrl += 'api.fwicloud';
    break;

  case 'test':
  case 'staging':
    awsSettingsUrl += 'api-prod.fwi-dev';
    deactivatedCheckUrl += 'api-prod.fwi-dev';
    break;

  case 'prod-eu':
  case 'prod-ap':
    var subdomain = 'prod'.replace('prod-', '');
    awsSettingsUrl += 'api.' + subdomain + '1.fwicloud';
    deactivatedCheckUrl += 'api.' + subdomain + '1.fwicloud';
    break;

  case 'dev':
    awsSettingsUrl += 'api-.fwi-dev';
    deactivatedCheckUrl += 'api-.fwi-dev';
    break;

  default:
    awsSettingsUrl += 'api.fwicloud';
    deactivatedCheckUrl += 'api.fwicloud';
}

awsSettingsUrl += '.com/common/v1/endpoints';
deactivatedCheckUrl += '.com/device-management/v1/companies/';

//-----------------------------------------------------------------------------
// Create Secured Websocket connection to AWS IoT using MQTT protocol
//-----------------------------------------------------------------------------

function reEnableInput() {
  $('#invite-code-auth-spinner').hide();
  $('.invite_code_verify').prop(
    'disabled',
    $('.invite_code').val().length !== 6
  );
  $('.invite_code').prop('disabled', false);
  $('.invite_code').focus();
}

function getAWSSettings(isOnline, callback) {
  FWI_App.log('Get AWS settings...', 'DEBUG');
  FWI_App.log('Is online? ' + isOnline, 'DEBUG');

  if (isOnline) {
    FWI_App.log('Getting AWS settings from ' + awsSettingsUrl, 'DEBUG');

    $.ajax({
      type: 'GET',
      cache: false,
      contentType: false,
      processData: false,
      url: awsSettingsUrl,
      success: function(data) {
        FWI_App.log(
          'Get AWS settings success: ' + JSON.stringify(data),
          'DEBUG'
        );

        // Fed/Identity Pool ID
        FWI_Provision.cognitoFedPoolId = data.cognitoFedPoolId;
        HOST_DEVICE.setSetting(
          'fwi.iot.identityPoolId',
          FWI_Provision.cognitoFedPoolId
        );
        FWI_App.log(
          'Identity pool id: ' + FWI_Provision.cognitoFedPoolId,
          'DEBUG'
        );
        // IoT Host
        FWI_Provision.iotHost = data.endpointAddress;
        HOST_DEVICE.setSetting('fwi.iot.host', FWI_Provision.iotHost);
        FWI_App.log('IoT Host: ' + FWI_Provision.iotHost, 'DEBUG');
        // User Pool
        FWI_Provision.cognitoUserPoolId = data.cognitoUserPoolId;
        HOST_DEVICE.setSetting(
          'fwi.iot.userPoolId',
          FWI_Provision.cognitoUserPoolId
        );
        FWI_App.log(
          'Cognito user pool id: ' + FWI_Provision.cognitoUserPoolId,
          'DEBUG'
        );
        // Cognito Client ID
        FWI_Provision.cognitoAppClientId = data.cognitoClientId;
        HOST_DEVICE.setSetting(
          'fwi.iot.clientId',
          FWI_Provision.cognitoAppClientId
        );
        FWI_App.log(
          'Cognito client id: ' + FWI_Provision.cognitoAppClientId,
          'DEBUG'
        );
        // Region
        FWI_Provision.region = data.region;
        HOST_DEVICE.setSetting('fwi.iot.region', FWI_Provision.region);
        FWI_App.log('Region: ' + FWI_Provision.region, 'DEBUG');
        AWS.config.region = FWI_Provision.region;

        callback && callback();
      },
      error: function() {
        FWI_App.log('Get AWS settings error', 'ERROR');

        // Fed/Identity Pool ID
        FWI_Provision.cognitoFedPoolId = HOST_DEVICE.getSetting(
          'fwi.iot.identityPoolId'
        );
        FWI_App.log(
          'Identity pool id: ' + FWI_Provision.cognitoFedPoolId,
          'DEBUG'
        );
        // IoT Host
        FWI_Provision.iotHost = HOST_DEVICE.getSetting('fwi.iot.host');
        FWI_App.log('IoT Host: ' + FWI_Provision.iotHost, 'DEBUG');
        // User Pool
        FWI_Provision.cognitoUserPoolId = HOST_DEVICE.getSetting(
          'fwi.iot.userPoolId'
        );
        FWI_App.log(
          'Cognito user pool id: ' + FWI_Provision.cognitoUserPoolId,
          'DEBUG'
        );
        // Cognito Client ID
        FWI_Provision.cognitoAppClientId = HOST_DEVICE.getSetting(
          'fwi.iot.clientId'
        );
        FWI_App.log(
          'Cognito client id: ' + FWI_Provision.cognitoAppClientId,
          'DEBUG'
        );
        // Region
        FWI_Provision.region = HOST_DEVICE.getSetting('fwi.iot.region');
        FWI_App.log('Region: ' + FWI_Provision.region, 'DEBUG');
        AWS.config.region = FWI_Provision.region;

        callback && callback();
      }
    });
  } else {
    // Fed/Identity Pool ID
    FWI_Provision.cognitoFedPoolId = HOST_DEVICE.getSetting(
      'fwi.iot.identityPoolId'
    );
    FWI_App.log('Identity pool id: ' + FWI_Provision.cognitoFedPoolId, 'DEBUG');
    // IoT Host
    FWI_Provision.iotHost = HOST_DEVICE.getSetting('fwi.iot.host');
    FWI_App.log('IoT Host: ' + FWI_Provision.iotHost, 'DEBUG');
    // User Pool
    FWI_Provision.cognitoUserPoolId = HOST_DEVICE.getSetting(
      'fwi.iot.userPoolId'
    );
    FWI_App.log(
      'Cognito user pool id: ' + FWI_Provision.cognitoUserPoolId,
      'DEBUG'
    );
    // Cognito Client ID
    FWI_Provision.cognitoAppClientId = HOST_DEVICE.getSetting(
      'fwi.iot.clientId'
    );
    FWI_App.log(
      'Cognito client id: ' + FWI_Provision.cognitoAppClientId,
      'DEBUG'
    );
    // Region
    FWI_Provision.region = HOST_DEVICE.getSetting('fwi.iot.region');
    FWI_App.log('Region: ' + FWI_Provision.region, 'DEBUG');
    AWS.config.region = FWI_Provision.region;

    callback && callback();
  }
}

function inviteInput() {
  FWI_App.log('Invite modal load');

  $('.wrap_playerRegistrationModal').addClass('close');
  $('.wrap_inviteCode').addClass('init');
}

function handleInviteCodeVerifyClick(e) {
  e.preventDefault();

  $('#invite-code-auth-spinner').show();
  $(this).prop('disabled', true);
  $('.invite_code').prop('disabled', true);
  FWI_Provision.connecting = false; // False to reset connecting loop.

  $('.wrap_inviteCode_error_icon').hide();
  $('.invite_code_error_message').text('');

  var enteredInviteCode = $('.invite_code').val();

  FWI_Provision.inviteCode = enteredInviteCode.toUpperCase();

  $('.wrap_inviteCode_error_icon').hide();
  $('.invite_code_error_message').text('');

  FWI_App.log('New AWS Connection', 'DEBUG');
  FWI_Provision.connection = new AwsConnection(FWI_Provision.inviteCode);
  FWI_App.log('Provision device...', 'DEBUG');
  FWI_Provision.connection.provision();
}

function AwsConnection(clientId) {
  FWI_App.log('AWS: Create device', 'DEBUG');
  this.mqtt = AWSIoTData.device({
    region: FWI_Provision.region,
    host: FWI_Provision.iotHost,
    clientId: clientId,
    protocol: 'wss',
    maximumReconnectTimeMs: FWI_Provision.maxReconnectTimeMs,
    debug: false,
    accessKeyId: '',
    secretKey: '',
    sessionToken: '',
    keepalive: 15
  });

  this.mqtt.on('close', function() {
    FWI_App.log('AWS: MQTT: Close', 'DEBUG');
  });

  this.mqtt.on('connect', function() {
    FWI_App.log('Connected to MQTT.', 'DEBUG');
    if (!FWI_Provision.key || !FWI_Provision.tenant || !FWI_Provision.id) {
      if (FWI_Provision.autoActivationState === 'attempting') {
        FWI_Provision.autoActivationState = 'provisioning';
        var onModelInfoRetrieved = function(modelInfo) {
          FWI_Provision.connection.mqtt.subscribe(
            'fwi/provision/' + HOST_DEVICE.serialNumber
          );
          var playerType =
            modelInfo && modelInfo.manufacturer ? modelInfo.manufacturer : '';
          var makeModel = modelInfo && modelInfo.model ? modelInfo.model : '';
          var os = HOST_DEVICE.getFirmwareVersion();
          var payload = JSON.stringify({
            env: 'prod',
            hardwareNumbers: [HOST_DEVICE.serialNumber],
            playerType: playerType,
            makeModel: makeModel,
            os: os,
            playerVersion: '1.9.1'
          });

          // Publish provision request
          FWI_App.log(
            'Attempting auto activate with payload: ' + payload,
            'DEBUG'
          );
          FWI_Provision.connection.mqtt.publish('fwi/provision', payload);
        };

        HOST_DEVICE.getDeviceModelInformation(
          onModelInfoRetrieved,
          onModelInfoRetrieved
        );
      } else {
        FWI_App.log('Missing either a key, company ID, or device ID.', 'DEBUG');

        inviteInput();

        $('.invite_code_verify').unbind('click');
        $('.invite_code_verify').on('click', handleInviteCodeVerifyClick);
      }
    } else {
      if (!FWI_Provision.activated) {
        FWI_App.log(
          "Connected to MQTT, but device hasn't been activated. Attempting to activate it using identity ID.",
          'DEBUG'
        );
        FWI_Provision.connection.activate();
      } else {
        FWI_App.log('Device authenticated.', 'DEBUG');
        // Subscribe for all messages specific to this device
        FWI_Provision.connection.mqtt.subscribe(
          'fwi/' + FWI_Provision.tenant + '/' + FWI_Provision.id
        );

        // Subscribe for all tenant broadcast messages
        FWI_Provision.connection.mqtt.subscribe(
          'fwi/' + FWI_Provision.tenant + '/broadcast'
        );

        if (cloudLogUploadInterval == null) {
          // Upload logs to Cloud every 5 min
          cloudLogUploadInterval = setInterval(function() {
            FWI_Provision.requestCloudLogsURL();
          }, 5 * 60 * 1000);
        }

        if (!FWI_App._started) {
          FWI_App.start();
        }
      }
    }
  });

  this.mqtt.on('error', function(error) {
    FWI_App.log('MQTT error: ' + error + '.', 'ERROR');
  });

  this.mqtt.on('message', function(topic, message) {
    // is this a message for device shadows?
    if (topic.indexOf('/shadow/') > -1) {
      FWI_Shadow.parseMqttMessage(topic, message);
      return;
    }

    FWI_App.log(
      'MQTT message received. Topic: ' + topic + '. Payload: ' + message + '.',
      'DEBUG'
    );

    var payload = JSON.parse(message);
    var isCompanyBroadcast = topic.indexOf('/broadcast') > -1;

    if (isCompanyBroadcast && !!payload && !!payload.channel) {
      FWI_App.log('company broadcast...');
      if (FWI_Deploy.deployId === payload.channel) {
        // get new access token.
        FWI_App.setAccessToken(FWI_App._accessToken, function() {
          var currentURL = HOST_DEVICE.getSetting('link');
          FWI_App.log('Channel content was updated, setting new url');
          FWI_Deploy2.getFinalSignURL(currentURL)
            .then((url) => {
              url = FWI_Helper.insertOrReplaceQueryParam(
                  'v',
                  payload.version,
                  url
                );
              FWI_Deploy.connectSuccess(FWI_Deploy.isLinkPublic, url);
              HOST_DEVICE.setSetting('link', url);
              FWI_Deploy.storageURL = url;
              FWI_Deploy.setURL(url, true, FWI_Deploy.setIframeURL);
            })
            .catch((error) => {
              FWI_Deploy.connectFailure(error, 'error');
            });
        });
      }
    }

    // Check for deletion of device.
    if (message.indexOf('deleted') > -1) {
      FWI_App.log('Device removed.', 'INFO');
      FWI_Hardware.publishOfflineNotificationReason(
        offlineCodes.PLAYER_DELETED
      );
      FWI_Provision.deactivateDevice();
    }

    var parts = topic.split('/');
    var results = JSON.parse(message);
    FWI_App.log('mqtt message command: ' + results.command, 'DEBUG');

    if (results.tenant) {
      $('.wrap_settings').fadeIn();
      $('.wrap_playerRegistrationModal').addClass('close');
      $('.wrap_inviteCode').removeClass('init');
    }

    if (parts[1] === 'provision') {
      // Store Credentials
      if (results.error) {
        // FIXME: Show UI to get InviteCode or Okta User
        if (results.error === 'Matching invite code was not found') {
          $('.invite_code_error_message').text('Invite Code not found');
          $('.wrap_inviteCode_error_icon').show();
        } else if (results.error == 'Company does not exist for this device') {
          $('.invite_code_error_message').text(
            'Please contact FWI Tech Support.'
          );
          $('.wrap_inviteCode_error_icon').show();
        } else if (
          results.error === 'Device could not be found by hardwareNumbers'
        ) {
          FWI_Provision.connection.stop();
          inviteInput();
          $('.invite_code_verify').unbind('click');
          $('.invite_code_verify').on('click', handleInviteCodeVerifyClick);
        } else {
          if (FWI_Provision.autoActivationState === 'provisioning') {
            FWI_Provision.autoActivationState = null;
            return;
          }

          $('.invite_code_error_message').text(
            'Sorry! Please contact FWI Tech Support.'
          );
          $('.wrap_inviteCode_error_icon').show();
        }

        reEnableInput();
      } else {
        // Update Cognito user pool ID if applicable.
        FWI_Provision.cognitoUserPoolId =
          results.cognitoUserPoolId || FWI_Provision.cognitoUserPoolId;
        HOST_DEVICE.setSetting(
          'fwi.iot.userPoolId',
          FWI_Provision.cognitoUserPoolId
        );
        FWI_Provision.cognitoAppClientId =
          results.cognitoClientId || FWI_Provision.cognitoAppClientId;
        HOST_DEVICE.setSetting(
          'fwi.iot.clientId',
          FWI_Provision.cognitoAppClientId
        );

        if (results.deviceId) {
          FWI_Provision.id = results.deviceId;
          HOST_DEVICE.setSetting('fwi.device.id', FWI_Provision.id);
        }

        if (results.key) {
          FWI_Provision.key = results.key;
          HOST_DEVICE.setSetting('fwi.device.key', FWI_Provision.key);
        }

        if (results.companyId) {
          FWI_Provision.tenant = results.companyId;
          HOST_DEVICE.setSetting('fwi.device.tenant', FWI_Provision.tenant);
        }

        if (FWI_Provision.autoActivationState === 'provisioning') {
          FWI_Provision.autoActivationState = 'connectAuthenticated';
        }

        FWI_Provision.connectAuthenticated();
      }
    } else if (parts[1] === 'activate') {
      if (results.error) {
        FWI_App.log('Activation error: ' + results.error, 'DEBUG');

        if (FWI_Provision.autoActivationState === 'activating') {
          FWI_Provision.autoActivationState = null;
          $('.wrap_playerRegistrationModal').addClass('close');
        }

        $('.invite_code_error_message').text(
          'Sorry! Please contact FWI Tech Support.'
        );
        $('.wrap_inviteCode_error_icon').show();
        reEnableInput();
      } else if (results.status === 'activated') {
        FWI_Provision.activated = true;
        FWI_App.log('Device has been successfully activated.', 'INFO');
        HOST_DEVICE.setSetting('fwi.device.activated', true, function() {
          HOST_DEVICE.reloadPlayer();
        });
      }
    } else if (parts[1] === FWI_Provision.tenant) {
      if (results.command === 'log') {
        var fileName = results.uploadBody.key.split('/')[4];

        HOST_DEVICE.getCloudLogs(function(logs) {
          if (logs != null) {
            logs.sort(function(a, b) {
              return b.posixTime - a.posixTime;
            });

            var file = new File([JSON.stringify(logs)], fileName);
            var data = new FormData();

            Object.keys(results.uploadBody).forEach(function(key) {
              data.append(key, results.uploadBody[key]);
            });

            data.append('file', file, fileName);

            FWI_App.log({ msg: 'Uploading Cloud logs', preventStoring: true });

            $.ajax({
              url: results.uploadUrl,
              data: data,
              cache: false,
              contentType: false,
              processData: false,
              enctype: 'multipart/form-data',
              method: 'POST',
              success: function() {
                HOST_DEVICE.uploadCloudLogsComplete(true);
                FWI_App.log({
                  msg: 'Cloud logs uploaded',
                  preventStoring: true
                });
              },
              error: function(err) {
                HOST_DEVICE.uploadCloudLogsComplete(false);
                FWI_App.log({
                  msg: 'Cloud logs failed to upload: ' + JSON.stringify(err),
                  level: 'ERROR'
                });
              }
            });
          }
        });
      } else {
        FWI_Custom.cloudCommand(results);
      }
    }
  });

  this.mqtt.on('offline', function() {
    FWI_App.log('MQTT is offline.', 'DEBUG');
  });

  this.mqtt.on('reconnect', function() {
    FWI_App.log('MQTT. Reconnected to MQTT.', 'DEBUG');

    if (!FWI_Provision.connecting) {
      FWI_Provision.connecting = true;

      if (!FWI_Provision.key || !FWI_Provision.tenant) {
        FWI_App.log('connectUnauthenticated', 'DEBUG');
        FWI_Provision.connectUnauthenticated();
      } else {
        FWI_App.log('connectAuthenticated', 'DEBUG');
        FWI_Provision.connectAuthenticated();
      }
    }
  });
}

AwsConnection.prototype.activate = function() {
  var data = null;
  var identityId = AWS.config.credentials.identityId;

  if (FWI_Provision.autoActivationState === 'activating') {
    return;
  }

  // Subscribe for activate response
  if (FWI_Provision.inviteCode) {
    FWI_App.log(
      'Subscribing to activation messages for invite code "' +
        FWI_Provision.inviteCode +
        '".',
      'DEBUG'
    );
    this.mqtt.subscribe('fwi/activate/' + FWI_Provision.inviteCode);

    data = {
      env: 'prod',
      inviteCode: FWI_Provision.inviteCode,
      deviceId: FWI_Provision.id,
      principal: identityId,
      companyId: FWI_Provision.tenant
    };
  } else if (FWI_Provision.autoActivationState === 'connectAuthenticated') {
    FWI_Provision.autoActivationState = 'activating';
    FWI_App.log(
      'Subscribing to activation messages for device ID "' +
        FWI_Provision.id +
        '".',
      'DEBUG'
    );
    this.mqtt.subscribe('fwi/activate/' + HOST_DEVICE.serialNumber);
    // NOTE: For some unknown reason, subscribing to `/<cloudId>` prevents
    // the `fwi/activate` publish from reaching the server. However, the
    // server publishes back to `fwi/activate/<cloudId>`. We created a workaround
    // of passing `topicId: <hardwareNumber>`, and the server will publish to
    // `fwi/activate/<topicId>`.
    data = {
      topicId: HOST_DEVICE.serialNumber,
      env: 'prod',
      deviceId: FWI_Provision.id,
      principal: identityId,
      companyId: FWI_Provision.tenant
    };
  } else {
    FWI_App.log(
      'Subscribing to activation messages for device ID "' +
        FWI_Provision.id +
        '".',
      'DEBUG'
    );
    this.mqtt.subscribe('fwi/activate/' + FWI_Provision.id);
    data = {
      env: 'prod',
      deviceId: FWI_Provision.id,
      principal: identityId,
      companyId: FWI_Provision.tenant
    };
  }

  // Publish activate request
  FWI_App.log(
    'Publishing to "fwi/activate" with payload: ' + JSON.stringify(data),
    'DEBUG'
  );

  if (FWI_Provision.autoActivationState !== 'activating') {
    $('.wrap_playerRegistrationModal').addClass('close');
  }

  this.mqtt.publish('fwi/activate', JSON.stringify(data));
};

AwsConnection.prototype.provision = function() {
  FWI_App.log('AWS: Provisioning...', 'DEBUG');
  // Attempts to provision the device using the given information.
  var onModelInfoRetrieved = $.proxy(function(modelInfo) {
    FWI_App.log('AWS: Model info retrieved', 'DEBUG');
    var playerType =
      modelInfo && modelInfo.manufacturer ? modelInfo.manufacturer : '';
    var makeModel = modelInfo && modelInfo.model ? modelInfo.model : '';
    var os = HOST_DEVICE.getFirmwareVersion();
    var data = null;

    // Subscribe for provision response
    if (FWI_Provision.inviteCode) {
      // Using known invite code to provision device.
      FWI_App.log(
        'Subscribing to provision messages for invite code "' +
          FWI_Provision.inviteCode +
          '".',
        'DEBUG'
      );
      this.mqtt.subscribe('fwi/provision/' + FWI_Provision.inviteCode);

      if (FWI_Provision.id) {
        data = {
          env: 'prod',
          inviteCode: FWI_Provision.inviteCode,
          deviceId: FWI_Provision.id,
          playerType: playerType,
          makeModel: makeModel,
          os: os,
          playerVersion: '1.9.1'
        };
      } else {
        data = {
          env: 'prod',
          inviteCode: FWI_Provision.inviteCode,
          playerType: playerType,
          makeModel: makeModel,
          os: os,
          playerVersion: '1.9.1'
        };
      }
    } else {
      // Using known device ID to provision device.
      FWI_App.log(
        'Subscribing to provision messages for device ID "' +
          FWI_Provision.id +
          '".',
        'DEBUG'
      );
      this.mqtt.subscribe('fwi/provision/' + FWI_Provision.id);
      data = {
        env: 'prod',
        deviceId: FWI_Provision.id,
        playerType: playerType,
        makeModel: makeModel,
        os: os,
        playerVersion: '1.9.1'
      };
    }

    // Publish provision request
    var payload = JSON.stringify(data);
    FWI_App.log(
      'Publishing to "fwi/provision" with payload: ' + payload,
      'DEBUG'
    );
    this.mqtt.publish('fwi/provision', payload);
  }, this);

  FWI_App.log('AWS: Getting model information', 'DEBUG');
  HOST_DEVICE.getDeviceModelInformation(
    $.proxy(function(data) {
      onModelInfoRetrieved(data);
    }, this),
    $.proxy(function() {
      onModelInfoRetrieved();
    }, this)
  );
};

AwsConnection.prototype.stop = function() {
  FWI_App.log('MQTT: stopped');
  this.mqtt.end(true, null);
  return false;
};

AwsConnection.prototype.update = function(accessKey, secretKey, sessionToken) {
  FWI_App.log('Updating web socket credentials'), 'DEBUG';
  FWI_App.log({
    message:
      'Keys::\naccess: ' +
      accessKey +
      '\nsecret: ' +
      secretKey +
      '\ntoken: ' +
      sessionToken,
    level: 'DEBUG',
    preventStoring: true
  });
  this.mqtt.updateWebSocketCredentials(accessKey, secretKey, sessionToken);
};

//-----------------------------------------------------------------------------
// FWI_Provision
//-----------------------------------------------------------------------------

var FWI_Provision = {
  // Summary: Determines whether we're allowed to retry authentication. This
  //          is only true once the device has been activated and authenticated.
  _retryAllowed: false,

  // Clears all stored device management settings.
  clearDeviceManagementSettings: function(onSuccess) {
    FWI_App.log('Clearing settings...', 'DEBUG');
    // Clear settings sequentially.
    HOST_DEVICE.removeSetting('fwi.device.id', function() {
      HOST_DEVICE.removeSetting('fwi.device.key', function() {
        HOST_DEVICE.removeSetting('fwi.device.tenant', function() {
          HOST_DEVICE.removeSetting('fwi.device.activated', function() {
            HOST_DEVICE.removeSetting('link', function() {
              FWI_App.log('Settings cleared', 'DEBUG');
              onSuccess && onSuccess();
            });
          });
        });
      });
    });
  },

  deactivateDevice: function() {
    $.ajax({
      type: 'GET',
      cache: false,
      contentType: false,
      processData: false,
      url:
        deactivatedCheckUrl +
        FWI_Provision.tenant +
        '/devices/' +
        FWI_Provision.id +
        '/status',
      success: function(response) {
        if (response.status === 'deleted') {
          FWI_App.log('Device is deactivated, deactivating...', 'DEBUG');
          FWI_Provision.clearDeviceManagementSettings(function() {
            HOST_DEVICE.reloadPlayer();
          });
        } else {
          FWI_App.log('Device is not deactivated', 'DEBUG');
        }
      },
      failure: function() {
        FWI_App.log('Error checking if device is deactivated', 'DEBUG');
      }
    });
  },

  bindElements: function() {
    $('#deploy_send').prop('disabled', false);

    // Send button click handler.
    $('#deploy_send').on('click', function(e) {
      e.preventDefault();
      var inviteCode = $('#fwi_invite_code').val();

      if (inviteCode) {
        $('#deploy_send').prop('disabled', true);
        FWI_App.log(
          'Attempt to register device using invite code: ' + inviteCode,
          'DEBUG'
        );
        FWI_Provision.inviteCode = inviteCode;

        if (!FWI_Provision.key || !FWI_Provision.tenant || !FWI_Provision.id) {
          FWI_Provision.connection = new AwsConnection(
            FWI_Provision.inviteCode
          );
        } else {
          // FIXME: `TODO` what??????
          FWI_App.log('TODO');
        }
      }
    });

    $('.retry_player_registration').click(HOST_DEVICE.reloadPlayer);
  },

  // Updates the access token at some point in the future using the
  // refresh token.
  _refreshAccessToken: function(session) {
    var refreshToken = session.getRefreshToken();
    var updateTimeout;
    var update = function(callback) {
      // Get Cognito user.
      var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(
        {
          UserPoolId: FWI_Provision.cognitoUserPoolId,
          ClientId: FWI_Provision.cognitoAppClientId
        }
      );
      var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(
        { Username: FWI_Provision.id, Pool: userPool }
      );

      cognitoUser.refreshSession(refreshToken, function(err, session) {
        var retryValueS = 15;

        if (err) {
          FWI_App.log(
            'Unable to update Cognito session. Retrying in ' +
              retryValueS +
              ' seconds. Error: ' +
              err,
            'ERROR'
          );

          if (
            err.code === 'UserNotFoundException' &&
            FWI_App.online &&
            FWI_Provision.activated
          ) {
            FWI_App.log(
              'Device was deleted while offline. Clearing settings and reloading...',
              'DEBUG'
            );
            FWI_Hardware.publishOfflineNotificationReason(
              offlineCodes.PLAYER_DELETED
            );
            FWI_Provision.deactivateDevice();
          } else {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(update, retryValueS * 1000);
          }
        } else {
          // Update ID token for credentials.
          var idTokenObj = session.getIdToken();
          var idToken = idTokenObj.getJwtToken();
          FWI_App.log(
            'ID token will expire at ' +
              idTokenObj.payload.exp +
              ' = ' +
              new Date(idTokenObj.payload.exp * 1000) +
              '.',
            'DEBUG'
          );

          // Note: Use the ID token for Logins map when using Federated User Pools with Cognito Identity.
          var url =
            'cognito-idp.' +
            FWI_Provision.region +
            '.amazonaws.com/' +
            FWI_Provision.cognitoUserPoolId;

          AWS.config.credentials.params.Logins[url] = idToken;

          // Update access token.
          var accessTokenObj = session.getAccessToken();
          var accessToken = accessTokenObj.getJwtToken();

          FWI_App.log(
            'Access token will expire at ' +
              accessTokenObj.payload.exp +
              ' = ' +
              new Date(accessTokenObj.payload.exp * 1000) +
              '.',
            'DEBUG'
          );
          FWI_App.setAccessToken(accessToken);
          callback && callback(accessToken);

          // Refresh tokens at some point in the future.
          FWI_Provision._refreshAccessToken(session);

          // Get or refresh credentials.
          AWS.config.credentials.get(function(err) {
            if (err) {
              if (err.code === 'NotAuthorizedException') {
                // If we get a "NotAuthorizedException" error, there is no point in retrying.
                // Then we should attempt to get new credentials.
                FWI_App.log(
                  'Original access token may have expired. Attempting to re-authenticate. Error: ' +
                    err,
                  'INFO'
                );
                FWI_Provision.connectAuthenticated();
                return;
              }
              FWI_App.log(
                'Unable to get Cognito credentials. Retrying in ' +
                  retryValueS +
                  ' seconds. Error: ' +
                  err,
                'ERROR'
              );
              clearTimeout(updateTimeout);
              updateTimeout = setTimeout(update, retryValueS * 1000);
            } else {
              // Refresh credentials.
              AWS.config.credentials.refresh(function(err) {
                if (err) {
                  if (err.code === 'NotAuthorizedException') {
                    // If we get a "NotAuthorizedException" error, there is no point in retrying.
                    // Then we should attempt to get new credentials.
                    FWI_App.log(
                      'Original access token may have expired. Attempting to re-authenticate. Error: ' +
                        err,
                      'INFO'
                    );
                    FWI_Provision.connectAuthenticated();
                    return;
                  }
                  FWI_App.log(
                    'Unable to refresh Cognito credentials. Retrying in ' +
                      retryValueS +
                      ' seconds. Error: ' +
                      err,
                    'ERROR'
                  );
                  clearTimeout(updateTimeout);
                  updateTimeout = setTimeout(update, retryValueS * 1000);
                } else {
                  FWI_App.log(
                    'Successfully updated Cognito tokens. Credentials will expire at ' +
                      AWS.config.credentials.expireTime +
                      '.',
                    'DEBUG'
                  );
                  FWI_Provision.connection.update(
                    AWS.config.credentials.accessKeyId,
                    AWS.config.credentials.secretAccessKey,
                    AWS.config.credentials.sessionToken
                  );
                }
              });
            }
          });
        }
      });
    };

    var refreshValueM = 15; // Update access token every 15 minutes.

    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(update, refreshValueM * 60 * 1000);

    FWI_Provision.updateRefreshToken = function(callback) {
      clearTimeout(updateTimeout);
      update(callback);
    };
  },

  connectUnauthenticated: function() {
    FWI_App.log('Getting AWS settings from connect unauthenticated', 'DEBUG');

    FWI_App.log('Trying unauthenticated connection ...', 'DEBUG');

    var cognitoIdentity = new AWS.CognitoIdentity();

    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: FWI_Provision.cognitoFedPoolId
    });

    // Get a unique identityId for unauthenticated user (device) from cognito
    AWS.config.credentials.get(function(err) {
      if (!err) {
        FWI_App.log(
          'Cognito identity for MQTT retrieved successfully.',
          'DEBUG'
        );
        var params = {
          IdentityId: AWS.config.credentials.identityId
        };

        // Get unauthenticated credentials and session token
        cognitoIdentity.getCredentialsForIdentity(params, function(err, data) {
          if (!err) {
            FWI_App.log(
              'Successfully received Cognito credentials for MQTT.',
              'DEBUG'
            );
            FWI_Provision.connection.update(
              data.Credentials.AccessKeyId,
              data.Credentials.SecretKey,
              data.Credentials.SessionToken
            );
          } else {
            FWI_App.log(
              'Error receiving Cognito credentials for MQTT: ' + err,
              'ERROR'
            );
            $('._stateError p span').text(
              'Error retrieving credentials: ' + err + ''
            );
            $('._stateLoading').addClass('triggered');
            $('._stateError').addClass('triggered');
          }
        });
      } else {
        FWI_App.log(
          'Error retrieving Cognito identity for MQTT: ' + err,
          'ERROR'
        );

        if (err === 'NetworkingError: Network Failure') {
          if ($('.wrap_playerRegistrationModal').hasClass('close')) {
            $('.invite_code_error_message').text(
              'No network, no external communication'
            );
            $('.wrap_inviteCode_error_icon').show();

            reEnableInput();
          } else {
            $('._stateError p span').text(
              'No network, no external communication'
            );
            $('._stateLoading').addClass('triggered');
            $('._stateError').addClass('triggered');
          }
        } else {
          if ($('.wrap_playerRegistrationModal').hasClass('close')) {
            $('.invite_code_error_message').text(
              'Sorry! Please contact FWI Tech Support.'
            );
            $('.wrap_inviteCode_error_icon').show();

            reEnableInput();
          } else {
            $('._stateError p span').text(
              'Sorry! Please contact FWI Tech Support.'
            );
            $('._stateLoading').addClass('triggered');
            $('._stateError').addClass('triggered');
            $('.retry_player_registration').focus();
          }
        }

        return false;
      }
    });
  },

  // Attempts to authenticate the device against Cognito.
  connectAuthenticated: function() {
    FWI_App.log('Getting AWS settings from connect authenticated', 'DEBUG');

    FWI_App.log('trying authenticated connection ...');

    // Get Cognito User Pool
    var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(
      {
        UserPoolId: FWI_Provision.cognitoUserPoolId,
        ClientId: FWI_Provision.cognitoAppClientId
      }
    );
    // Get Cognito User
    var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(
      { Username: FWI_Provision.id, Pool: userPool }
    );
    var decryptedKey = CryptoJS.AES.decrypt(
      FWI_Provision.key,
      FWI_Provision.tenant
    ).toString(CryptoJS.enc.Utf8);
    
    var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(
      { Username: FWI_Provision.id, Password: decryptedKey }
    );

    // Authenticate User
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: function(session) {
        FWI_Provision.session = session;
        FWI_App.log('Successfully authenticated against Cognito.', 'DEBUG');
        // Get ID token for credentials.
        var idTokenObj = session.getIdToken();
        var idToken = idTokenObj.getJwtToken();

        FWI_App.log(
          'ID token will expire at ' +
            idTokenObj.payload.exp +
            ' = ' +
            new Date(idTokenObj.payload.exp * 1000) +
            '.',
          'DEBUG'
        );

        // Note: Use the ID token for Logins map when using Federated User Pools with Cognito Identity.
        var url =
          'cognito-idp.' +
          FWI_Provision.region +
          '.amazonaws.com/' +
          FWI_Provision.cognitoUserPoolId;
        var logins = {};

        logins[url] = idToken;

        AWS.config.credentials = new AWS.CognitoIdentityCredentials({
          IdentityPoolId: FWI_Provision.cognitoFedPoolId,
          Logins: logins
        });

        // Get a unique identityId, credentials, and session token for authenticated from cognito
        AWS.config.credentials.get(function(err) {
          if (!err) {
            if (FWI_Provision.activated) {
              FWI_App.log(
                'Device already activated. Successfully got Cognito credentials and access token.',
                'DEBUG'
              );
              FWI_Provision.connection.update(
                AWS.config.credentials.accessKeyId,
                AWS.config.credentials.secretAccessKey,
                AWS.config.credentials.sessionToken
              );

              // Close registration modal if applicable.
              $('.wrap_playerRegistrationModal').addClass('close');

              // Get access token and send it to Web Player.
              var accessTokenObj = session.getAccessToken();
              var accessToken = accessTokenObj.getJwtToken();

              FWI_App.log(
                'Access token will expire at ' +
                  accessTokenObj.payload.exp +
                  ' = ' +
                  new Date(accessTokenObj.payload.exp * 1000) +
                  '.',
                'DEBUG'
              );
              FWI_App.setAccessToken(accessToken);

              // Refresh access token at some point in the future.
              FWI_Provision._refreshAccessToken(session);

              // Since device has been activated and authenticated, we should be allowed to retry in case the network goes down at some point.
              FWI_Provision._retryAllowed = true;


              if (!FWI_App._started) {
                FWI_App.start();
              }

            } else {
              FWI_App.log('Attempting to activate device.', 'DEBUG');

              FWI_Provision.connection.activate();
            }
          } else {
            // If we're allowed to retry, i.e. the app was previously up and running,
            // then wait a few minutes before trying to authenticate again.
            if (FWI_Provision._retryAllowed) {
              // Retry after a few minutes.
              var retryIntervalM = 5;
              setTimeout(function() {
                FWI_Provision.connectAuthenticated();
              }, retryIntervalM * 60 * 1000);
              FWI_App.log(
                'Unable to authenticate the device. Will try again in ' +
                  retryIntervalM +
                  ' minutes. Error: ' +
                  err,
                'ERROR'
              );
            } else {
              FWI_App.log(
                'Error while getting Cognito credentials: ' + err,
                'ERROR'
              );
              $('._stateError p span').text(
                'Sorry! Please contact FWI Tech Support.'
              );
              $('._stateLoading').addClass('triggered');
              $('._stateError').addClass('triggered');
            }
          }
        });
      },

      onFailure: function(err) {
        FWI_App.log('Error authenticating against Cognito: ' + err, 'ERROR');

        // If device was deleted while offline.
        if (err && err.code === 'UserNotFoundException') {
          FWI_App.log('Clearing settings and reloading...', 'DEBUG');
          FWI_Hardware.publishOfflineNotificationReason(
            offlineCodes.PLAYER_DELETED
          );
          FWI_Provision.deactivateDevice();
        } else if (
          err &&
          err.code === 'NetworkingError' &&
          FWI_Provision.activated
        ) {
          // We could not verify the credentials due to a network failure, but since the device
          // was activated previously and the network is offline, we keep checking for a connection.
          if (!FWI_App.wasOffline) {
            FWI_App.wasOffline = true; // Indicate that app was started in offline mode.

            // We cannot access FWI_Deploy yet as it has not been initialized at this point.
            // Check settings directly.
            if (!FWI_App._started && HOST_DEVICE.getSetting('link')) {
              FWI_Provision.resetNetworkRetry();
              // Since device has been activated previously, and the sign link
              // is public, we can start the player in offline mode.
              $('.wrap_playerRegistrationModal').addClass('close');
              FWI_App.log(
                'Unable to authenticate due to network failure. Starting app, since device has previously been activated.',
                'INFO'
              );
              
              if (!FWI_App._started) {
                FWI_App.start();
              }
            }
          }

          // Keep trying to authenticate.
          FWI_Provision.connecting = false; // False to reset connecting loop. Keep trying to authenticate.
        } else if (err === 'TooManyRequestsException') {
          var retrySeconds = Math.floor(Math.random() * 9) + 1;

          $('._stateError p span').text(
            'Too many simultaneous authentication requests. Retrying in ' +
              retrySeconds +
              ' seconds.'
          );
          $('._stateLoading').addClass('triggered');
          $('._stateError').addClass('triggered');
          $('.retry_player_registration').focus();
          setTimeout(FWI_Provision.connectAuthenticated, retrySeconds * 1000);
        } else {
          $('._stateError p span').text(
            'Sorry! Please contact FWI Tech Support.'
          );
          $('._stateLoading').addClass('triggered');
          $('._stateError').addClass('triggered');
          $('.retry_player_registration').focus();
        }
      }
    });
  },

  init: function() {
    this.bindElements();
    $('#invite-code-auth-spinner').hide();

    FWI_Provision.maxReconnectTimeMs = HOST_DEVICE.getSetting(
      'mqttMaxReconnectTimeMs'
    );

    if (
      FWI_Provision.maxReconnectTimeMs < 5000 ||
      (FWI_Provision.maxReconnectTimeMs &&
        isNaN(FWI_Provision.maxReconnectTimeMs))
    ) {
      FWI_App.log(
        'Invalid MQTT maximum reconnect time value supplied: ' +
          FWI_Provision.maxReconnectTimeMs +
          '. Using default value.',
        'WARN'
      );
      FWI_Provision.maxReconnectTimeMs = 30000; // Default value.
    }

    this.activated = this.activated ||  false; // Has the device already been activated?
    this.connecting = this.connecting ||  false; // Are we currently connecting to MQTT?
    this.connection = this.connection ||  null; // MQTT connection.
    this.id = this.id ||  null; // Device/Cloud ID.
    this.inviteCode = this.inviteCode ||  null; // Invite code as specified by Cloud Device Management and entered by the user.
    this.key = this.key ||  null; // Encrypted key for authenticated connection to Cognito.
    this.tenant = this.tenant ||  null; // Cloud company ID.

    // Check Internet connection and check connection to AWS.
    var onlineCheckError = function() {
      FWI_App.log('Error while checking network connection status.', 'ERROR');
      FWI_Provision.retryNetwork();
    };
    var onlineCheckSuccess = function(isOnline) {
      FWI_Provision.activated =
        HOST_DEVICE.getSetting('fwi.device.activated') === true.toString();

      getAWSSettings(isOnline, function() {
        if (!isOnline) {
          if (FWI_Provision.activated) {
            var deploymentURL = HOST_DEVICE.getSetting('link');

            if (deploymentURL === '' || deploymentURL == null) {
              FWI_Provision.retryNetwork();
            } else {
              // Device is (presumably) activated though not verified. In this case we allow it to
              // start the app. See issue JI#CORE-4055.
              FWI_Provision.refreshConnection();
            }
          } else {
            FWI_App.log('Not online/activated', 'DEBUG', true);
            FWI_Provision.retryNetwork();
          }
        } else {
          AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: FWI_Provision.cognitoFedPoolId
          });
          AWS.config.credentials.get(function(err) {
            if (err && String(err).indexOf('Network Failure') > -1) {
              FWI_App.log({
                msg: 'Network error: ' + err,
                level: 'ERROR',
                preventStoring: true
              });
              FWI_Provision.retryNetwork();
            } else {
              FWI_Provision.resetNetworkRetry();
              FWI_Provision.refreshConnection();
            }
          });
        }
      });
    };

    HOST_DEVICE.isDeviceOnline(onlineCheckSuccess, onlineCheckError);
  },

  attemptAutoActivation: function() {
    HOST_DEVICE.getAboutInfo(function(aboutData) {
      FWI_Provision.autoActivationState = 'attempting';
      FWI_Provision.connection = new AwsConnection(aboutData.serialNumber);
    });
  },

  resetNetworkRetry: function() {
    HOST_DEVICE.removeSetting('network-retry-attempts');
  },

  retryNetwork: function() {
    var maxRetries = 12;
    var attemptsRemaining = parseInt(
      HOST_DEVICE.getSetting('network-retry-attempts') || '' + maxRetries,
      10
    );
    FWI_App.log({
      msg: 'Network retry attempts remaining: ' + attemptsRemaining,
      level: 'DEBUG',
      preventStoring: true
    });
    if (attemptsRemaining > 0) {
      var nextAttempts = attemptsRemaining - 1;
      var nextAttemptInSeconds = Math.pow(maxRetries - nextAttempts, 2);
      FWI_App.log({
        msg: 'Retry network in: ' + nextAttemptInSeconds + ' seconds',
        level: 'DEBUG',
        preventStoring: true
      });
      setTimeout(function() {
        FWI_App.log({
          msg: 'Retrying network connection',
          level: 'DEBUG',
          preventStoring: true
        });
        HOST_DEVICE.setSetting(
          'network-retry-attempts',
          nextAttempts,
          function() {
            HOST_DEVICE.reloadPlayer();
          }
        );
      }, nextAttemptInSeconds * 1000);
      $('._stateError p span').text(
        'No network or external communication. Retrying in ' +
          nextAttemptInSeconds +
          ' seconds.'
      );
    } else {
      FWI_Provision.resetNetworkRetry();
      FWI_App.log({
        msg: 'Stop retrying network connection',
        level: 'DEBUG',
        preventStoring: true
      });
      $('._stateError p span').text('No network or external communication.');
    }

    $('._stateLoading').addClass('triggered');
    $('._stateError').addClass('triggered');
    $('button.retry_player_registration')
      .focus()
      .select();
  },

  requestCloudLogsURL: function() {
    HOST_DEVICE.getDeviceModelInformation(
      function(modelInfo) {
        if (modelInfo && modelInfo.manufacturer) {
          var payload = JSON.stringify({
            env: 'prod',
            playerType: modelInfo.manufacturer.toLowerCase(),
            companyId: FWI_Provision.tenant,
            deviceId: FWI_Provision.id,
            filename:
              'PlayerLogs_' + Math.floor(new Date().getTime() / 1000) + '.json'
          });

          // Publish provision request
          FWI_App.log(
            'Attempting get the Cloud log upload url with payload: ' + payload,
            'DEBUG'
          );
          FWI_Provision.connection.mqtt.publish(
            'fwi/' + FWI_Provision.tenant + '/logs',
            payload
          );
        }
      },
      function(error) {
        FWI_App.log(
          'Failed to get manufacturer: ' + JSON.stringify(error),
          'ERROR'
        );
      }
    );
  },

  refreshConnection: function() {
    // invite keypress
    var inviteInputEl = $('.modal_inviteCode input');

    inviteInputEl.on('input', function(e) {
      var hasFullCode = e.target.value.length === 6;

      $('.invite_code_verify').prop('disabled', !hasFullCode);

      if (isFirstActivationAttempt && hasFullCode) {
        isFirstActivationAttempt = false;
        $('.invite_code_verify').focus();
      }
    });

    FWI_Provision.id = HOST_DEVICE.getDeviceId();
    FWI_Provision.key = HOST_DEVICE.getSetting('fwi.device.key');
    FWI_Provision.tenant = HOST_DEVICE.getSetting('fwi.device.tenant');

    if (FWI_Provision.activated) {
      FWI_App.log('Flow 0 - already activated');
      FWI_Provision.connection = new AwsConnection(FWI_Provision.id);
    } else if (FWI_Provision.id) {
      FWI_Provision.resetNetworkRetry();
      FWI_App.log('Flow 1 - Using unique device ID: ' + FWI_Provision.id);
      FWI_Provision.connection = new AwsConnection(FWI_Provision.id);
    } else {
      FWI_Provision.resetNetworkRetry();
      FWI_Provision.attemptAutoActivation();
    }
  },
};
