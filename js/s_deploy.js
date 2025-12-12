var FWI_Deploy = {
  storageURL: null,
  isLinkPublic: false, // Says if the sign URL is public, i.e. doesn't require a token or credentials.
  testURL: '',
  authUser: null,
  authPass: null,
  rmtCmdAuthUser: '',
  rmtCmdAuthPass: '',
  deployId: null,
  playerName: null,
  playerID: null,
  _deploymentReceived: null, // The time when the sign was loaded.
  webPlayerBaseURL: '',

  /* Deploy URL Changed */
  deployUrlNeedsValidate: function() {
    $('.deploy_url_message')
      .parent()
      .addClass('need_validation')
      .removeClass('success')
      .removeClass('icon_fail');

    FWI_Deploy.setDeployMsg(
      FWI_Localization.getResource(
        'browserBased',
        'deploy_message_clickToVerify',
        'Please Click to Verify'
      ),
      'change'
    );
  },
  /* Deploy Reset */
  deployUrlReset: function() {
    if (FWI_Deploy.storageURL) {
      $('input[name="player_url"]').val(
        FWI_Helper.removeQueryParam(
          'v',
          FWI_Helper.removeQueryParam(
            '_fwi_cloudCompanyId',
            FWI_Helper.removeQueryParam(
              '_fwi',
              FWI_Helper.removeQueryParam(
                '_fwi_accessToken',
                FWI_Deploy.storageURL
              )
            )
          )
        )
      );
      $('.deploy_url_message')
        .parent()
        .addClass('success')
        .removeClass('need_validation')
        .removeClass('icon_fail');
    } else {
      $('input[name="player_url"]').val('');
      $('.deploy_url_message')
        .parent()
        .removeClass('success')
        .removeClass('need_validation')
        .addClass('icon_fail');
    }

    if (this.authUser && this.authPass) {
      $('.player_url_user').val(this.authUser);
      $('.player_url_pass').val(this.authPass);
    } else {
      $('.player_url_user').val('');
      $('.player_url_pass').val('');
    }

    $('.deploy_auth_message')
      .parent()
      .removeClass('success')
      .removeClass('need_validation')
      .removeClass('icon_fail');
    $('.deploy_messages').html('');
  },

  /* Check if player needs auth or if the auth works */
  checkPlayerAuthStatus: function(url, context, returnFn) {
    returnFn('success');
  },

  /* URL Check success */
  ajaxSuccess: function(isLinkPublic, onSuccess) {
    $('#deploy_verify').prop('disabled', false);

    /* Remote CMD Connect Check */
    if (FWI_Deploy.rmtCmdAuthUser && FWI_Deploy.rmtCmdAuthPass) {
      /* If credentials were supplied, save during iframe set */
      if (FWI_Deploy.rmtCmdAuthUser !== 'na') {
        $('.player_url_user').val(FWI_Deploy.rmtCmdAuthUser);
        $('.player_url_pass').val(FWI_Deploy.rmtCmdAuthPass);
      }

      /* Reset Remote Command Creds */
      FWI_Deploy.rmtCmdAuthUser = '';
      FWI_Deploy.rmtCmdAuthPass = '';
    }

    FWI_Deploy.applySignin(isLinkPublic, onSuccess);
  },
  /* URL Check fail */
  ajaxFail: function(error) {
    FWI_App.log('Deploy - Ajax Failed: ' + error, 'ERROR');
    $('#deploy_verify').prop('disabled', false);
    FWI_Deploy.setDeployMsg(error, 'error');

    FWI_Deploy.testURL = '';

    /* Reset Remote Command Creds */
    FWI_Deploy.rmtCmdAuthUser = '';
    FWI_Deploy.rmtCmdAuthPass = '';
  },
  /* Set Message */
  setDeployMsg: function(msg, status) {
    if (msg) {
      if (status === 'success') {
        $('.deploy_messages')
          .html(msg)
          .closest('.status_msg')
          .removeClass('error')
          .addClass('success')
          .removeClass('change');
        $('.deploy_url_message')
          .parent()
          .addClass('success')
          .removeClass('icon_fail')
          .removeClass('need_validation');

        /* Remove after 7sec */
        setTimeout(function() {
          if ($('.status_msg.success .deploy_messages').length) {
            $('.deploy_messages').html('');
          }
        }, 7000);
      } else if (status === 'change') {
        $('.deploy_messages')
          .html(msg)
          .closest('.status_msg')
          .removeClass('success')
          .removeClass('error')
          .addClass('change');
        $('.deploy_url_message')
          .parent()
          .addClass('need_validation')
          .removeClass('success')
          .removeClass('icon_fail');
      } else {
        $('.deploy_messages')
          .html(msg)
          .closest('.status_msg')
          .removeClass('success')
          .addClass('error')
          .removeClass('change');
        $('.deploy_url_message')
          .parent()
          .removeClass('success')
          .addClass('icon_fail')
          .removeClass('need_validation');
      }
    }
  },

  /* Validate Url */
  validateURL: function(url) {
    if (FWI_Validate.validateURL(url)) {
      return true;
    } else {
      FWI_Deploy.setDeployMsg(
        FWI_Localization.getResource(
          'browserBased',
          'deploy_message_badUrlFormat',
          'Bad URL Format. Please Try Again.'
        ),
        'error'
      );
      return false;
    }
  },

  // Set the URL and get deploy/title from iframe.
  setURL: function(url, isLinkPublic, onSuccess) {
    FWI_App.log('Loading sign from URL "' + url + '".', 'DEBUG');
    var iframeLoaded = false;
    this.isLinkPublic = isLinkPublic;
    HOST_DEVICE.setSetting('link', url, function() {
      HOST_DEVICE.setSetting('isLinkPublic', isLinkPublic);
    });
    FWI_Deploy.storageURL = url;

    /* Check if auth has been added since last set (for cached sign-in) */
    FWI_Deploy.checkPlayerAuthStatus(url, 'SetURL', function(output) {
      if (output === 'success' || output === 'error_conn') {
        FWI_App.playerElement = $('.player_iframe');

        FWI_App.playerElement.on('load', function() {
          FWI_Deploy._deploymentReceived = new Date(); // Set deployment received time.

          // Send "setHost" command to let player know the host and its device ID.
          FWI_App.setHost();

          var checkIframe = function() {
            if (!iframeLoaded) {
              try {
                var $webView = FWI_App.playerElement;
                var contentWindow = $webView ? $webView[0].contentWindow : null; // Window hosting Web Player.

                if (
                  !FWI_Deploy.playerName &&
                  contentWindow.FWi &&
                  typeof contentWindow.FWi.deploymentId !== 'undefined'
                ) {
                  FWI_Deploy.deployId = contentWindow.FWi.deploymentId;
                  FWI_Deploy.playerName =
                    FWI_App.playerElement[0].contentDocument.title;
                  HOST_DEVICE.setSetting('deploy_id', FWI_Deploy.deployId);
                  HOST_DEVICE.setSetting('player_name', FWI_Deploy.playerName);
                  FWI_App.log(
                    'Deployment ID set from player iframe: ' +
                      FWI_Deploy.deployId,
                    'INFO'
                  );
                  FWI_App.log(
                    'Player name set from player iframe: ' +
                      FWI_Deploy.playerName,
                    'INFO'
                  );
                  iframeLoaded = true;

                  // Get new player ID for FWI Services or update existing one.
                  FWI_Monitoring.getPlayerID();
                } else {
                  setTimeout(checkIframe, 1000);
                }
              } catch (e) {
                // Swallow error.
                setTimeout(checkIframe, 1000);
              }
            }
          };
          checkIframe();
        });

        FWI_App.log(
          'Storage url ready for player: ' + FWI_Deploy.storageURL,
          'DEBUG'
        );
        FWI_App.log(
          'Link is public for player: ' + FWI_Deploy.isLinkPublic,
          'DEBUG'
        );

        if (FWI_Deploy.storageURL) {
          FWI_Deploy.setIframeURL();
        }

        onSuccess && onSuccess();

        // Remote commands init (requires deployment).
        FWI_Custom.init();
      } else if (output === 'error_cred') {
        // Protected signs are not supported currently.
        FWI_Deploy.ajaxFail(
          FWI_Localization.getResource(
            'browserBased',
            'deploy_message_unsupportedUrl',
            'Unsupported URL.'
          ),
          'error'
        );
      } else {
        FWI_Deploy.ajaxFail(
          FWI_Localization.getResource(
            'browserBased',
            'deploy_message_unsupportedUrl',
            'Unsupported URL.'
          ),
          'error'
        );
        FWI_App.displaySettings();
      }
    });

    FWI_Shadow.updateShadow();
  },

  // Attempts to connect to the given Web Player URL and validates
  // that it actually _is_ a Web Player URL.
  connectToWebPlayer: function(url, onSuccess, onFailure) {
    FWI_App.log('Checking connection to web sign at "' + url + '".');

    // url = FWI_Helper.insertOrReplaceQueryParam(
    //   '_fwi_accessToken',
    //   FWI_App._accessToken,
    //   FWI_Helper.insertOrReplaceQueryParam(
    //     '_fwi_cloudCompanyId',
    //     HOST_DEVICE.getSetting('fwi.device.tenant'),
    //     url
    //   )
    // );
    var isLinkPublic = false;
    var checkValidUrl = function(url) {
      // We were able to connect to the URL, so it does indeed exist.
      // However, we need to make sure it's actually a Web Player URL.
      FWI_App.log('Successfully connected to URL "' + url + '".');

      // add trailing slash if it isn't there already
      var questionMarkIndex = url.indexOf('?');

      if (url[questionMarkIndex - 1] && url[questionMarkIndex - 1] !== '/') {
        // missing / between end of url and query params
        url =
          url.slice(0, questionMarkIndex) + '/' + url.slice(questionMarkIndex);
      } else if (
        !url[questionMarkIndex - 1] &&
        url.lastIndexOf('/') !== url.length - 1
      ) {
        // missing / and ?
        url += '/?';
      } else if (!url[questionMarkIndex]) {
        // missing only ?
        url += '?';
      }

      var serverLength = Math.max(url.lastIndexOf('/'), url.indexOf('?'));

      if (serverLength < 0) {
        serverLength = url.length;
      }

      var aboutUrl = url.substr(0, serverLength) + 'api/about';
      var aboutAjaxArgs = {
        type: 'GET',
        dataType: 'json',
        cache: false,
        url: aboutUrl,
        success: function() {
          // Check for Auth Gate
          FWI_Deploy.checkPlayerAuthStatus(url, 'connSuccess', function() {
            onSuccess && onSuccess(isLinkPublic, url);
          });
        },
        error: function(jqXhr, status, errorThrown) {
          // Check error code, if it's a 404 (Not Found), it could be that it's pointing
          // to an older version of Web Player that is not using Web API. Therefore, we
          // try one other URL.
          FWI_App.log(JSON.stringify(errorThrown), 'ERROR');
          if (errorThrown === 'Not Found') {
            aboutUrl = url.substr(0, serverLength) + '/about.ashx';

            var oldAboutAjaxArgs = {
              type: 'GET',
              dataType: 'json',
              cache: false,
              url: aboutUrl,
              success: function() {
                // Success.
                if (isLinkPublic) {
                  onSuccess && onSuccess(isLinkPublic);
                } else {
                  // Check for authorization gateway.
                  FWI_Deploy.checkPlayerAuthStatus(
                    url,
                    'connAjaxErr',
                    function() {
                      onSuccess && onSuccess(isLinkPublic);
                    }
                  );
                }
              },
              error: function(jqXhr, status, errorThrown) {
                // Check error code, if it's a 404 (Not Found), it could be that it's pointing
                // to an older version of Web Player that is not using Web API. Therefore, we
                // try one other URL.
                FWI_App.log(
                  'Invalid web sign URL: "' + url + '". Error: ' + errorThrown
                );
                onFailure &&
                  onFailure(
                    FWI_Localization.getResource(
                      'browserBased',
                      'deploy_message_invalidDeploymentUrl',
                      'Invalid Deployment URL. Please Try Again.'
                    ),
                    'error'
                  );
              }
            };
            FWI_Deploy.request = $.ajax(oldAboutAjaxArgs); // Store request, so we can abort if needed.
          } else {
            FWI_App.log(
              'Invalid web sign URL: "' + url + '". Error: ' + errorThrown
            );
            onFailure &&
              onFailure(
                FWI_Localization.getResource(
                  'browserBased',
                  'deploy_message_invalidDeploymentUrl',
                  'Invalid Deployment URL. Please Try Again.'
                ),
                'error'
              );
          }
        }
      };
      FWI_Deploy.request = $.ajax(aboutAjaxArgs); // Store request, so we can abort if needed.
    };

    // First try without any credentials or token.
    // If the link is working, then we know it's public.
    var publicLinkCheckAjaxArgs = {
      type: 'HEAD',
      dataType: 'html',
      cache: false,
      url: url,
      success: function() {
        // We successfully connected to the URL without credentials or token, so the
        // link must be public. However, we still don't know if it's a valid sign, so
        // we check that now.
        isLinkPublic = true;
        checkValidUrl(url);
      },
      error: function(jqXhr, status, errorThrown) {
        if (jqXhr.status === 404) {
          // Sign not found.
          FWI_App.log(
            'Invalid web sign URL: "' + url + '". Error: ' + errorThrown
          );
          onFailure &&
            onFailure(
              FWI_Localization.getResource(
                'browserBased',
                'deploy_message_invalidDeploymentUrl',
                'Invalid Deployment URL. Please Try Again.'
              ),
              'error'
            );
        } else {
          // Sign may be protected, so check with token and / or credentials.
          // Cognito tokens don't contain the company ID, so we have to pass it separately.
          var headers = {};

          if (FWI_App._accessToken) {
            headers['Authorization'] = 'Bearer ' + FWI_App._accessToken;
            url = FWI_Helper.insertOrReplaceQueryParam(
              '_fwi_accessToken',
              FWI_App._accessToken,
              FWI_Helper.insertOrReplaceQueryParam(
                '_fwi_cloudCompanyId',
                HOST_DEVICE.getSetting('fwi.device.tenant'),
                url
              )
            );
          }

          var ajaxArgs = {
            type: 'HEAD',
            dataType: 'html',
            cache: false,
            url: url,
            headers: headers,
            success: function() {
              // needed since we are effectively changing the url that we're testing against.
              FWI_Deploy.testURL = url;
              checkValidUrl(url);
            },
            error: function() {
              // Show error
              FWI_App.log('Invalid web sign URL.');
              onFailure &&
                onFailure(
                  FWI_Localization.getResource(
                    'browserBased',
                    'deploy_message_invalidDeploymentUrl',
                    'Invalid Deployment URL. Please Try Again.'
                  ),
                  'error'
                );
            }
          };

          var beforeSendFunction = function(xhr) {
            xhr.setRequestHeader(
              'If-Modified-Since',
              HOST_DEVICE.getTime().toUTCString()
            );
          };
          ajaxArgs['beforeSend'] = beforeSendFunction;
          FWI_Deploy.request = $.ajax(ajaxArgs); // Store request, so we can abort if needed.
        }
      }
    };

    FWI_Deploy.request = $.ajax(publicLinkCheckAjaxArgs); // Store request, so we can abort if needed.
  },

  setIframeURL: function() {
    if (
      typeof FWI_Deploy.storageURL === 'string' &&
      FWI_Deploy.storageURL.startsWith('http')
    ) {
      if (FWI_App.playerElement.prop('src') !== FWI_Deploy.storageURL) {
        FWI_App.playerElement.prop('src', FWI_Deploy.storageURL);
        FWI_App.log('Set player url to: ' + FWI_Deploy.storageURL, 'DEBUG');
        HOST_DEVICE.setSetting('link', FWI_Deploy.storageURL);
        if (HOST_DEVICE.isDeviceOnline()) {
          HOST_DEVICE.setSetting(
            'cached_url',
            FWI_App.playerElement.prop('src')
          );
          FWI_Custom.init();
        }
      }
    } else {
      FWI_App.log({
        msg:
          'The stored URL requested is not a valid url: ' +
          FWI_Deploy.storageURL,
        level: 'WARN'
      });
    }
  },

  /* Apply Signin after Validation */
  applySignin: function(isLinkPublic, onSuccess) {
    FWI_Deploy.setDeployMsg('Verified & Saved!', 'success');

    // Summary: Function called then the player URL was changed successfully.
    var onUrlChangeSuccess = $.proxy(
      function(onSuccess) {
        FWI_Deploy.playerUrlChanged = FWI_Helper.getDateIsoStr0000Z();
        HOST_DEVICE.setSetting(
          'player_url_changed',
          FWI_Deploy.playerUrlChanged
        );

        // Call supplied event handler if applicable.
        if (onSuccess) {
          onSuccess();
        }
      },
      this,
      onSuccess
    );

    FWI_Deploy.setURL(FWI_Deploy.testURL, isLinkPublic, onUrlChangeSuccess);
    $('input[name="player_url"]').val(FWI_Deploy.testURL);
  },

  // Cached sign-in. Display player.
  cachedSignin: function(onSuccess) {
    FWI_Deploy.setDeployMsg('Saved!', 'success');
    // FWI_Deploy.setURL(this.storageURL, this.isLinkPublic, onSuccess);
    var companyId = HOST_DEVICE.getSetting('fwi.device.tenant');
    var vanillaURL = FWI_Helper.removeQueryParam(
      'v',
      FWI_Helper.removeQueryParam(
        '_fwi_cloudCompanyId',
        FWI_Helper.removeQueryParam('_fwi_accessToken', this.storageURL)
      )
    );
    $('input[name="player_url"]').val(vanillaURL);
    if (!FWI_Deploy.isLinkPublic) {
      var authenticatedURL = FWI_Helper.insertOrReplaceQueryParam(
        '_fwi_accessToken',
        FWI_App._accessToken,
        this.storageURL
      );
      FWI_Deploy2.setURL(authenticatedURL);
    }
    FWI_Deploy2.setIframeURL(authenticatedURL);
  },

  connectSuccess: function(isLinkPublic, url) {
    // now that we have that data, we can set the URL. in the callback,
    FWI_Deploy.setURL(url, isLinkPublic, function() {
      FWI_Deploy.setDeployMsg('Verified & Saved!', 'success');
      $('#deploy_verify').prop('disabled', false);
    });
  },

  connectFailure: function(msg, status) {
    FWI_Deploy.ajaxFail(msg, status);
  },

  /* Bind inputs */
  bindSigninElements: function() {
    /* Verify Clicked */
    $('#deploy_verify').on('click', function(e) {
      e.preventDefault();

      var url = $('#fwi_link').val();

      if (url && FWI_Deploy.validateURL(url)) {
        $('#deploy_verify').prop('disabled', true);
        FWI_Deploy.testURL = url;

        FWI_Deploy2.getFinalSignURL(FWI_Deploy.testURL)
          .then((url) => {
            FWI_Deploy.connectSuccess(FWI_Deploy.isLinkPublic, url);
          })
          .catch((error) => {
            FWI_Deploy.connectFailure(error, 'error');
          });
      }
    });

    /* Detect Change, revalidate */
    $('input.player_url').on('input', function() {
      FWI_Deploy.deployUrlNeedsValidate();
    });
  },

  tabFocus: function() {
    if (FWI_App.dev) {
      setTimeout(function() {
        if ($('.post_messages').length) {
          $('.wrap_pm').scrollTop(999999999);
        }
      }, 333);
    }
  },

  tabUnfocus: function() {
    /* Clear validation / incomplete states */
    FWI_Deploy.deployUrlReset();
  },

  init: function() {
    FWI_App.log('Initializing Deploy', 'DEBUG');
    // Bind Inputs
    this.bindSigninElements();

    // Hide credentials section.
    $('.deploy_creds').hide();

    // Read settings:
    this.storageURL = HOST_DEVICE.getSetting('link');
    this.isLinkPublic =
      HOST_DEVICE.getSetting('isLinkPublic') === true.toString();
    this.playerUrlChanged = HOST_DEVICE.getSetting('player_url_changed');
    this.authUser = HOST_DEVICE.getSetting('auth_user');
    this.authPass = FWI_Helper.decrypt(
      HOST_DEVICE.getSetting('auth_pass'),
      HOST_DEVICE.getDeviceId()
    );
    this.deployId = HOST_DEVICE.getSetting('deploy_id');
    this.playerName = HOST_DEVICE.getSetting('player_name');
    this.playerID = HOST_DEVICE.getSetting('player_id');
    this.webPlayerBaseURL = HOST_DEVICE.getSetting('webPlayerBaseURL');

    // Populate credentials fields
    if (this.authUser && this.authPass) {
      $('.player_url_user').val(this.authUser);
      $('.player_url_pass').val(this.authPass);
    }

    /* Load Cached URL and display player, or Show Deploy screen */
    if (this.storageURL) {
      FWI_App.log(
        'Deploy - Loading Web Player URL From Local Storage ' + this.storageURL
      );
      FWI_App.log('Deploy - Link is public? ' + this.isLinkPublic);

      if (
        HOST_DEVICE.getSetting('cached_url') &&
        !HOST_DEVICE.isDeviceOnline()
      ) {
        FWI_App.log({
          msg: 'loading the last known cached sign...',
          level: 'DEBUG'
        });
        this.storageURL = HOST_DEVICE.getSetting('cached_url');
      }

      FWI_Deploy.setIframeURL();
      FWI_Deploy.deployUrlReset();
      FWI_App.displayPlayer();
      // this.cachedSignin(onSuccess);
    } else {
      FWI_App.log('Deploy - No URLs in local storage prompting to enter URL');
      FWI_App.displaySettings();
    }
    FWI_App.log('Deploy initialized', 'DEBUG');
  }
};

// The above codebase is such a tangled mess, that it's going to be easier to just make a new API with a more functional approach.
// minimum chrome version support: 47 (ssp 5)
var FWI_Deploy2 = {
  // *** async ***  takes url, returns Promise<Bool>
  checkIfWebPlayer: function(urlString) {
    var url = new URL(urlString);
    var wpURL = url.origin + url.pathname + 'api/about';

    return new Promise((resolve, reject) => {
      fetch(wpURL, { method: 'GET' })
        .then((response) => {
          if (response.status === 200) {
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  // *** async *** takes url, returns Promise<statusCode>
  checkSignAuthenticationStatus: function(url) {
    return new Promise((resolve, reject) => {
      fetch(url, {method: 'HEAD'})
        .then((response) => {
          resolve(response.status);
        })
        .catch((error) => {
          FWI_App.log(
            '[NEW DEPLOYMENT FLOW] Error while checking sign authentication status: ' +
              error,
            'ERROR'
          );
          reject(error);
        });
    });
  },

  // takes status code, returns Boolean
  UrlNeedsAuthentication: function(statusCode, urlString) {
    if (urlString) {
      // var url = new URL(urlString);
      // if (url.searchParams.has('channel') && !url.searchParams.has('_fwi_accessToken')) {

      //if already authenticated and still failing, we need to reject this thing
      if (
        urlString.indexOf('_fwi_accessToken') !== -1 &&
        urlString.indexOf('_fwi_companyId') !== -1
      ) {
        throw new Error('Unable to Authenticate sign');
      }

      var hasChannelButNotAccessToken =
        urlString.indexOf('channel') !== -1 &&
        urlString.indexOf('_fwi_accessToken') === -1;
      if (hasChannelButNotAccessToken) {
        return true;
      }
    }
    switch (statusCode) {
      case 200:
        return false;

      case 401:
        // throw new Error('Sign Authentication failed. Try again in 1 minute.');
        if (FWI_Provision.session) {
          FWI_App.log({msg:'Getting fresh tokens...', level: 'WARN'});
          FWI_Provision._refreshAccessToken(FWI_Provision.session);
        }
        return true;


      case 403:
        return true;

      case 404:
        throw new Error('Sign cannot be found.');

      case 500:
      case 502:
      case 512:
        throw new Error(
          'Something appears to be wrong with Web Player. It returned reponse code: ' +
            statusCode
        );
      default:
        throw new Error(
          'Web Player returned a ' +
            statusCode +
            ' status code, which is something we could not handle'
        );
    }
  },

  // takes url, returns void
  setIframeURL: function(url) {
    var iframe = document.getElementById('player_iframe');
    if (
      url &&
      url.length &&
      iframe instanceof HTMLElement &&
      url !== iframe.src
    ) {
      iframe.src = url;
      FWI_Deploy2.IframeURLDidChange(url);
    } else {
      iframe.src += '';
    }
  },

  // *** async *** takes url, returns void. *recursive*
  doNewDeploymentFlow: function(url) {
    FWI_App.log({
      msg: '[NEW DEPLOYMENT FLOW] Checking sign at: ' + url,
      level: 'DEBUG'
    });
    this.checkIfWebPlayer(url)
      .then((isWPURL) => {
        if (isWPURL) {
          //is a web player sign.
          FWI_App.log({
            msg: '[NEW DEPLOYMENT FLOW] Checking sign authentication status...',
            level: 'DEBUG'
          });
          return this.checkSignAuthenticationStatus(url);
        } else {
          // not web player
          throw new Error('Invalid Sign URL');
        }
      })
      .then((responseCode) => {
        if (this.UrlNeedsAuthentication(responseCode, url)) {
          FWI_App.log('[NEW DEPLOYMENT FLOW] Sign needs authentication...');
          // is WP, but private content.
          var authenticatedURL = this.addAccessTokenToURL(
            url,
            FWI_App._accessToken
          );
          authenticatedURL = this.addCompanyIDToURL(
            authenticatedURL,
            FWI_Provision.tenant
          );
          this.doNewDeploymentFlow(authenticatedURL);
        } else {
          FWI_App.log('[NEW DEPLOYMENT FLOW] Setting sign url to be ' + url);
          this.setIframeURL(url);
        }
      });
  },

  addAccessTokenToURL: function(urlString, accessToken) {
    let newURL = FWI_Helper.insertOrReplaceQueryParam(
      '_fwi_accessToken',
      accessToken,
      urlString
    );
    return newURL;
  },

  addCompanyIDToURL: function(urlString, companyId) {
    let newURL = FWI_Helper.insertOrReplaceQueryParam(
      '_fwi_cloudCompanyId',
      companyId,
      urlString
    );
    return newURL;
  },

  addSignAuthentication: function(url) {
    var authenticatedURL = this.addAccessTokenToURL(url, FWI_App._accessToken);
    authenticatedURL = this.addCompanyIDToURL(
      authenticatedURL,
      FWI_Provision.tenant
    );
    return authenticatedURL;
  },

  getFinalSignURL(url, attempt = 0) {
    return new Promise((resolve, reject) => {
      if (attempt >= 5) {
        reject('Failed to authenticate sign.')
        return;
      }
      
      FWI_Deploy2.checkIfWebPlayer(url)
        .then((isWPURL) => {
          FWI_App.log(`[NEW DEPLOYMENT FLOW] Is WP URL: ${isWPURL}`, 'DEBUG');
          if (isWPURL) {
            return FWI_Deploy2.checkSignAuthenticationStatus(url);
          } else {
            throw new Error('URL is not a valid Web Player instance');
          }
        })
        .then((statusCode) => {
          FWI_App.log(
            `[NEW DEPLOYMENT FLOW] Got statusCode: ${statusCode} when checking sign auth status`,
            'DEBUG'
          );
          if (FWI_Deploy2.UrlNeedsAuthentication(statusCode, url)) {
            FWI_App.log(
              '[NEW DEPLOYMENT FLOW] Sign needs authentication',
              'DEBUG'
            );
            HOST_DEVICE.setSetting('isLinkPublic', false);
            FWI_Deploy.isLinkPublic = false;
            url = FWI_Deploy2.addSignAuthentication(url);

            resolve(this.getFinalSignURL(url, attempt += 1))
          } else {
            FWI_App.log(
              '[NEW DEPLOYMENT FLOW] Sign is publicly accessible',
              'DEBUG'
            );
            HOST_DEVICE.setSetting('isLinkPublic', true);
            FWI_Deploy.isLinkPublic = true;
            resolve(url);
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  },

  // Side effects when changing deployment url.
  IframeURLDidChange: function(url) {
    FWI_Deploy.storageURL = url;
    HOST_DEVICE.setSetting('link', url);
    if (HOST_DEVICE.isDeviceOnline()) {
      HOST_DEVICE.setSetting('cached_url', url);
    }
    FWI_Deploy.deployUrlReset();
    $('input[name="player_url"]').val(url);
    FWI_Shadow.updateShadow();
    // Remote commands init (requires deployment).
    FWI_Custom.init();
  },

  setURL(url) {
    HOST_DEVICE.setSetting('link', url);
    FWI_Deploy.storageURL = url;
    FWI_Deploy.deployUrlReset();
  }
};