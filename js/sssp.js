var HOST_DEVICE;
var storedFWIServiceLogSettings;
var savingFWIServiceLogs = false;
var storedCloudLogSettings;
var savingCloudLogs = false;
var uploadingCloudLogs = false;
var logFileAction = 'a'; // append
var LOG_PREFIX = 'fwilogs_';
var CLOUD_LOG_PREFIX = 'cloudlogs_';
var stringifyError = function(err) {
  var plainObject = {};
  Object.getOwnPropertyNames(err).forEach(function(key) {
    plainObject[key] = err[key];
  });
  return JSON.stringify(plainObject, null, '\t');
};

function b64toBlob(b64Data, contentType, sliceSize) {
  contentType = contentType || '';
  sliceSize = sliceSize || 512;

  var byteCharacters = atob(b64Data);
  var byteArrays = [];

  for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    var slice = byteCharacters.slice(offset, offset + sliceSize);
    var byteNumbers = new Array(slice.length);
    for (var i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    var byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

function storeCloudLogs(callback) {
  if (savingCloudLogs) {
    // FWI_App.log({
    //   msg: 'Already savingCloudLogs, will retry in 3 seconds...',
    //   level: 'DEBUG',
    //   preventStoring: true
    // });
    setTimeout(function() {
      storeCloudLogs(callback);
    }, 3000);
    return;
  }

  if (storedCloudLogSettings == null) {
    FWI_App.log({
      msg: 'Delaying saving Cloud logs until settings are loaded',
      level: 'DEBUG',
      preventStoring: true
    });
    setTimeout(function() {
      // FWI_App.log({
      //   msg: 'Attempting to store Cloud logs again ...',
      //   level: 'DEBUG',
      //   preventStoring: true
      // });
      storeCloudLogs(callback);
    }, 3000);
  }

  if (uploadingCloudLogs) {
    // FWI_App.log({
    //   msg: "Delaying saving Cloud logs until log files aren't being read from",
    //   level: 'DEBUG',
    //   preventStoring: true
    // });
    setTimeout(function() {
      // FWI_App.log({
      //   msg: 'Attempting to store Cloud logs again ...',
      //   level: 'DEBUG',
      //   preventStoring: true
      // });
      storeCloudLogs(callback);
    }, 3000);
  }

  function doWrite(logsToWrite, logSize) {
    tizen.filesystem.resolve(
      'documents',
      function(dir) {
        dir.listFiles(function(files) {
          var currentLogFile = files.find(function(file) {
            return file.name === storedCloudLogSettings.currentLogFileName;
          });

          if (currentLogFile == null) {
            currentLogFile = documentsDir.createFile(
              storedCloudLogSettings.currentLogFileName
            );
          }

          if (currentLogFile != null) {
            currentLogFile.openStream(
              'w',
              function(fs) {
                try {
                  fs.write(JSON.stringify(logsToWrite));
                  fs.close();
                } catch (err) {
                  FWI_App.log({
                    msg: 'Error writing logs: ' + stringifyError(err),
                    level: 'ERROR',
                    preventStoring: true
                  });
                }

                savingCloudLogs = false;
                if (storedCloudLogSettings.currentLogFileSize == null) {
                  storedCloudLogSettings.currentLogFileSize =
                    currentLogFile.fileSize;
                }

                storedCloudLogSettings.currentLogFileSize += logSize;
                saveSettings(
                  storedCloudLogSettings,
                  SETTINGS_CLOUD_LOGS_FILE_NAME,
                  callback
                );
              },
              function(error) {
                FWI_App.log({
                  msg: 'Failed to open file: ' + error.message,
                  level: 'ERROR',
                  preventStoring: true
                });
                savingCloudLogs = false;
                callback && callback(error);
              },
              'UTF-8'
            );
          } else {
            callback && callback({ message: 'Current log is `null' });
            savingCloudLogs = false;
            FWI_App.log({
              msg: 'Current log is `null`',
              level: 'ERROR',
              preventStoring: true
            });
          }
        }, onError);
      },
      function(error) {
        FWI_App.log({
          msg: 'Filesystem resolve error: ' + error.message,
          level: 'ERROR',
          preventStoring: true
        });
        savingCloudLogs = false;
        callback && callback(error);
      },
      'w'
    );
  }

  function readSuccess(documentsDir) {
    return function(files) {
      var currentLogFile;
      var logsToStore = HOST_DEVICE.logsQueueCloud.slice();

      HOST_DEVICE.logsQueueCloud = [];

      var logSize = JSON.stringify(logsToStore).length / 1024 / 1024;
      // Create the first file, or find the current one
      if (storedCloudLogSettings.currentLogFileName == null) {
        try {
          storedCloudLogSettings.currentLogFileName =
            CLOUD_LOG_PREFIX + '1.txt';
          storedCloudLogSettings.currentLogNumber = 1;
          storedCloudLogSettings.currentLogFileSize = 0;
          currentLogFile = documentsDir.createFile(
            storedCloudLogSettings.currentLogFileName
          );
        } catch (err) {
          // Overwrite is not allowed
          if (err.code == 0) {
            try {
              currentLogFile = documentsDir.resolve(
                storedCloudLogSettings.currentLogFileName
              );
            } catch (err) {
              FWI_App.log({
                msg: 'Failed to resolve file: ' + stringifyError(err),
                level: 'ERROR',
                preventStoring: true
              });
            }
          } else {
            FWI_App.log({
              msg: 'Failed to create file: ' + stringifyError(err),
              level: 'ERROR',
              preventStoring: true
            });
          }
        }
      } else {
        // Don't create log files over 10 MB
        if (storedCloudLogSettings.currentLogFileSize + logSize >= 10) {
          if (storedCloudLogSettings.currentLogNumber == null) {
            storedCloudLogSettings.currentLogNumber = 0;
          }

          storedCloudLogSettings.currentLogNumber++;
          storedCloudLogSettings.currentLogFileSize = 0;

          if (storedCloudLogSettings.currentLogNumber > 10) {
            storedCloudLogSettings.currentLogNumber = 1;
          }

          storedCloudLogSettings.currentLogFileName =
            CLOUD_LOG_PREFIX + storedCloudLogSettings.currentLogNumber + '.txt';
          currentLogFile = files.find(function(file) {
            return file.name === storedCloudLogSettings.currentLogFileName;
          });
        } else {
          currentLogFile = files.find(function(file) {
            return file.name === storedCloudLogSettings.currentLogFileName;
          });
        }
      }

      if (currentLogFile == null) {
        try {
          currentLogFile = documentsDir.createFile(
            storedCloudLogSettings.currentLogFileName
          );
        } catch (err) {
          FWI_App.log({
            msg: 'Failed to create file: ' + stringifyError(err),
            level: 'ERROR',
            preventStoring: true
          });
        }
      }

      if (currentLogFile != null) {
        currentLogFile.openStream(
          'r',
          function(fs) {
            var currentLogsParsed;
            var currentLogs;

            if (currentLogFile.fileSize > 0) {
              try {
                currentLogs = fs.read(currentLogFile.fileSize);
                currentLogsParsed = JSON.parse(currentLogs);
              } catch (err) {
                FWI_App.log({
                  msg:
                    'Current logs read or parse error: ' + stringifyError(err),
                  level: 'ERROR',
                  preventStoring: true
                });
                currentLogsParsed = [];
              }
            } else {
              currentLogsParsed = [];
            }

            var finalLogs = currentLogsParsed.concat(logsToStore);

            doWrite(finalLogs, logSize);
          },
          function(error) {
            FWI_App.log({
              msg: 'Failed to open file: ' + error.message,
              level: 'ERROR',
              preventStoring: true
            });
            savingCloudLogs = false;
            callback && callback(error);
          },
          'UTF-8'
        );
      } else {
        callback && callback({ message: 'Current log is `null' });
        savingCloudLogs = false;
        FWI_App.log('Current log is `null`', 'ERROR');
      }
    };
  }

  function onError(error) {
    FWI_App.log({
      msg: 'List files error: ' + error.message,
      level: 'ERROR',
      preventStoring: true
    });
    savingCloudLogs = false;
    callback && callback(error);
  }

  if (HOST_DEVICE.logsQueueCloud && HOST_DEVICE.logsQueueCloud.length > 0) {
    savingCloudLogs = true;
    FWI_App.log({msg: 'Storing logs', level: 'DEBUG', preventStoring: true});
    // Open the documents directory to read/write
    tizen.filesystem.resolve(
      'documents',
      function(dir) {
        dir.listFiles(readSuccess(dir), onError);
      },
      function(error) {
        FWI_App.log({
          msg: 'Filesystem resolve error: ' + error.message,
          level: 'ERROR',
          preventStoring: true
        });
        savingCloudLogs = false;
        callback && callback(error);
      },
      'rw'
    );
  } else {
    // FWI_App.log({msg: 'All logs already stored', level: 'DEBUG', preventStoring: true}, 'DEBUG');
    callback && callback();
  }
}

function storeFWIServiceLogs(callback) {
  savingFWIServiceLogs = true;

  if (storedFWIServiceLogSettings == null) {
    FWI_App.log({
      msg: 'Delaying saving logs until settings are loaded',
      level: 'DEBUG',
      preventStoring: true
    });
    setTimeout(function() {
      FWI_App.log({
        msg: 'Attempting to store logs again ...',
        level: 'DEBUG',
        preventStoring: true
      });
      storeFWIServiceLogs(callback);
    }, 3000);
  }

  function onSuccess(documentsDir) {
    return function(files) {
      var currentLogFile;
      var logSize = HOST_DEVICE.logsQueueFWIServices.length / 1024 / 1024;

      // Create the first file, or find the current one
      if (storedFWIServiceLogSettings.currentLogFileName == null) {
        logFileAction = 'a'; // append

        try {
          storedFWIServiceLogSettings.currentLogFileName = LOG_PREFIX + '1.txt';
          storedFWIServiceLogSettings.currentLogNumber = 1;
          storedFWIServiceLogSettings.currentLogFileSize = 0;
          currentLogFile = documentsDir.createFile(
            storedFWIServiceLogSettings.currentLogFileName
          );
        } catch (err) {
          // Overwrite is not allowed
          if (err.code == 0) {
            try {
              currentLogFile = documentsDir.resolve(
                storedFWIServiceLogSettings.currentLogFileName
              );
            } catch (err) {
              FWI_App.log({
                msg: 'Failed to resolve file: ' + stringifyError(err),
                level: 'ERROR',
                preventStoring: true
              });
            }
          } else {
            FWI_App.log({
              msg: 'Failed to create file: ' + stringifyError(err),
              level: 'ERROR',
              preventStoring: true
            });
          }
        }
      } else {
        // Don't create log files over 10 MB
        if (storedFWIServiceLogSettings.currentLogFileSize + logSize >= 10) {
          if (storedFWIServiceLogSettings.currentLogNumber == null) {
            storedFWIServiceLogSettings.currentLogNumber = 0;
          }

          storedFWIServiceLogSettings.currentLogNumber++;
          logFileAction = 'w'; // Switch to write to erase any previous logs
          storedFWIServiceLogSettings.currentLogFileSize = 0;

          if (storedFWIServiceLogSettings.currentLogNumber > 10) {
            storedFWIServiceLogSettings.currentLogNumber = 1;
          }

          storedFWIServiceLogSettings.currentLogFileName =
            LOG_PREFIX + storedFWIServiceLogSettings.currentLogNumber + '.txt';
          currentLogFile = files.find(function(file) {
            return file.name === storedFWIServiceLogSettings.currentLogFileName;
          });

          if (currentLogFile == null) {
            currentLogFile = documentsDir.createFile(
              storedFWIServiceLogSettings.currentLogFileName
            );
          }
        } else {
          logFileAction = 'a'; // append
          currentLogFile = files.find(function(file) {
            return file.name === storedFWIServiceLogSettings.currentLogFileName;
          });
        }
      }

      if (currentLogFile != null) {
        currentLogFile.openStream(
          logFileAction, // If current working log append, otherwise overwrite
          function(fs) {
            fs.write(HOST_DEVICE.logsQueueFWIServices);
            fs.close();
            savingFWIServiceLogs = false;

            if (storedFWIServiceLogSettings.currentLogFileSize == null) {
              storedFWIServiceLogSettings.currentLogFileSize =
                currentLogFile.fileSize;
            }

            storedFWIServiceLogSettings.currentLogFileSize += logSize;
            saveSettings(
              storedFWIServiceLogSettings,
              SETTINGS_FILE_NAME,
              callback
            );
            // Dev only
            // $("#sizeEl").text(storedFWIServiceLogSettings.currentLogFileSize + " MB" +
            // 	"\nFile Size: " + currentLogFile.fileSize +
            // 	"\nCurrent log file: " + storedFWIServiceLogSettings.currentLogFileName);
          },
          function(error) {
            FWI_App.log({
              msg: 'Failed to open file: ' + error.message,
              level: 'ERROR',
              preventStoring: true
            });
            savingFWIServiceLogs = false;
            callback && callback(error);
          },
          'UTF-8'
        );
      } else {
        callback && callback({ message: 'Current log is `null' });
        savingFWIServiceLogs = false;
        FWI_App.log('Current log is `null`', 'ERROR');
      }
    };
  }

  function onError(error) {
    FWI_App.log({
      msg: 'List files error: ' + error.message,
      level: 'ERROR',
      preventStoring: true
    });
    savingFWIServiceLogs = false;
    callback && callback(error);
  }

  if (
    HOST_DEVICE.logsQueueFWIServices &&
    HOST_DEVICE.logsQueueFWIServices.length > 0
  ) {
    FWI_App.log({msg: 'Storing logs', level: 'DEBUG', preventStoring: true});
    // Open the documents directory to read/write
    tizen.filesystem.resolve(
      'documents',
      function(dir) {
        dir.listFiles(onSuccess(dir), onError);
      },
      function(error) {
        FWI_App.log({
          msg: 'Filesystem resolve error: ' + error.message,
          level: 'ERROR',
          preventStoring: true
        });
        savingFWIServiceLogs = false;
        callback && callback(error);
      },
      'rw'
    );
  } else {
    // FWI_App.log({msg: 'All logs already stored', level: 'DEBUG', preventStoring: true}, 'DEBUG');
    callback && callback();
  }
}

HOST_DEVICE = {
  orientation: null,
  logsQueueFWIServices: '',
  logsQueueCloud: [],
  firmwareVersion: '',
  logsFWIServiceReading: false,
  logsCloudReading: false,

  // Device specific initialization function.
  initializeDevice: function(onSuccess, onError) {
    onSuccess();
  },

  // Is display rotation supported by this device shim?
  isRotationSupported: function() {
    return true;
  },

  isStaticIpSupported: function() {
    return false;
  },

  isTimeConfigurationSupported: function() {
    return false;
  },

  // Are software updates supported?
  isSoftwareUpdateSupported: function() {
    return true;
  },

  // Returns the URL for the default time server to use.
  getDefaultTimeServer: function() {
    return '';
  },

  // Should the player be suspended while the configuration screen is showing?
  shouldSuspendPlayer: function() {
    return false;
  },

  // Gets the credentials for the web sign and returns them in an object passed
  // to the provided function.
  getCredentialsForSign: function(signUrl, onSuccess) {
    var credentials = FWI_Deploy.rmtCmdAuthUser
      ? {
          userName: FWI_Deploy.rmtCmdAuthUser,
          password: FWI_Deploy.rmtCmdAuthPass
        }
      : null;

    if (onSuccess) {
      onSuccess(credentials);
    }
  },

  // Updates the network configuration of the device.
  setNetworkConfiguration: function(networkInfo, onSuccess, onError) {
    FWI_App.log(
      'Setting the network configuration is not supported for SSSP.',
      'DEBUG'
    );
    return;
  },

  /* Initialize Orientation, determine what to set on startup */
  orientationInit: function() {
    var onSuccessSource = function(val) {
      FWI_App.log('orientationInit-setSourceOrientation success : ' + val);

      $('html').removeClass('force_916 force_169');
      if (
        HOST_DEVICE.orientation == 'DEGREE_0' ||
        HOST_DEVICE.orientation == 'DEGREE_180'
      ) {
        $('html').addClass('force_169');
      } else {
        $('html').addClass('force_916');
      }

      HOST_DEVICE.getOrientation();
    };
    var onSuccess = function(val) {
      FWI_App.log('RotateMenu-setMenuOrientation success');
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

    if (HOST_DEVICE.orientation) {
      FWI_App.log('Cached Orientation Loading: ' + HOST_DEVICE.orientation);
      b2bapis.b2bcontrol.setMenuOrientation(
        HOST_DEVICE.orientation,
        onSuccess,
        onError
      );
      b2bapis.b2bcontrol.setSourceOrientation(
        'TV',
        HOST_DEVICE.orientation,
        onSuccessSource,
        onError
      );
    } else {
      HOST_DEVICE.orientation = 'DEGREE_0';
      localStorage.setItem('orientation', HOST_DEVICE.orientation);
      FWI_App.log('No Cached Orientation, Setting: ' + HOST_DEVICE.orientation);
      b2bapis.b2bcontrol.setMenuOrientation('DEGREE_0', onSuccess, onError);
      b2bapis.b2bcontrol.setSourceOrientation(
        'TV',
        'DEGREE_0',
        onSuccessSource,
        onError
      );
    }
  },

  rotateOrientation: function(changeTo) {
    FWI_App.log('Current Orientation : ' + HOST_DEVICE.orientation);
    FWI_App.log('HTML W: ' + $('html').width() + ' | H: ' + $('html').height());
    FWI_App.log(
      'Window W: ' + $(window).width() + ' | H: ' + $(window).height()
    );

    var nextOrientation = '';

    if (changeTo) {
      nextOrientation = 'DEGREE_' + changeTo;
      FWI_App.log('Change Orientation : ' + nextOrientation);
    }

    switch (HOST_DEVICE.orientation) {
      case 'DEGREE_0':
      case 'DEGREE_180':
      case 'LANDSCAPE':
        nextOrientation = 'PORTRAIT';
        break;

      default:
        nextOrientation = 'LANDSCAPE';
        break;
    }

    FWI_App.log('Next Orientation: ' + nextOrientation);

    var onSuccessRotate = function() {
      FWI_App.log(
        'Rotate source success, current orientation: ' + nextOrientation,
        'DEBUG'
      );
      HOST_DEVICE.orientation = nextOrientation;
      HOST_DEVICE.setSetting('orientation', HOST_DEVICE.orientation);

      $('html').removeClass('force_916 force_169');
      if (nextOrientation === 'LANDSCAPE') {
        $('html').addClass('force_169');
      } else {
        $('html').addClass('force_916');
      }

      if (FWI_Hardware.deviceOrientationChanged == false) {
        FWI_Hardware.deviceOrientationChanged = true;
      } else {
        if (FWI_Deploy.storageURL) {
          FWI_App.log(
            'Orientation Change - ReLoading Web Player URL From Local Storage'
          );
          FWI_Deploy.setURL(FWI_Deploy.storageURL);
        }
      }

      HOST_DEVICE.getOrientation();
    };
    var onError = function(error) {
      FWI_App.log(
        'setOrientation code :' +
          error.code +
          ' error name: ' +
          error.name +
          '  message  ' +
          error.message
      );
    };
    // NOTE: Even though the docs say that you can set the orientation to
    // one of ['DEGREE_0', 'DEGREE_90', 'DEGREE_180', 'DEGREE_270']. You
    // can actually only do one of ['LANDSCAPE', 'PORTRAIT'].
    b2bapis.b2bcontrol.setSourceOrientation(
      'TV',
      nextOrientation,
      onSuccessRotate,
      onError
    );

    var onSuccess = function(val) {
      FWI_App.log('RotateMenu-setMenuOrientation success : ' + val);
    };
    b2bapis.b2bcontrol.setMenuOrientation(nextOrientation, onSuccess, onError);
  },
  // Determine Orientation properties
  getOrientation: function() {
    try {
      HOST_DEVICE.orientation = b2bapis.b2bcontrol.getSourceOrientation('TV');
      FWI_Shadow.updateShadow();
      var menuOrientation = b2bapis.b2bcontrol.getMenuOrientation();
      FWI_App.log('SourceOrientation: ' + HOST_DEVICE.orientation);
      FWI_App.log('menuOrientation: ' + menuOrientation);
    } catch (orientationError) {
      FWI_App.log('getOrientation failed (using default LANDSCAPE): ' + orientationError.message, 'WARN');
      HOST_DEVICE.orientation = 'LANDSCAPE'; // Default fallback
    }
    
    FWI_App.log('HTML W: ' + $('html').width() + ' | H: ' + $('html').height());
    FWI_App.log(
      'Window W: ' + $(window).width() + ' | H: ' + $(window).height()
    );
  },
  // Capture Screenshot, send to Monitoring function
  captureScreen: function(successCallback, errorCallback) {
    var onSuccess = function(val) {
      FWI_App.log('[MONITORING] Screenshot capture success: ' + val, 'INFO');

      var fileSrc = 'file://' + val;
      var xhr = new XMLHttpRequest();

      xhr.open('GET', fileSrc, true);
      xhr.responseType = 'blob';
      xhr.onload = function() {
        var reader = new FileReader();

        reader.onload = function(e) {
          var base64NoPre = e.target.result.replace(
            'data:image/jpeg;base64,',
            ''
          );

          var rotation = 0;
          
          // Try to get orientation, but handle errors gracefully
          try {
            HOST_DEVICE.getOrientation();
            
            switch (HOST_DEVICE.orientation) {
              case 'DEGREE_0':
              case 'DEGREE_180':
              case 'LANDSCAPE':
                rotation = 0;
                break;

              default:
                rotation = 90;
                break;
            }
            FWI_App.log('[MONITORING] Using orientation: ' + HOST_DEVICE.orientation + ', rotation: ' + rotation, 'DEBUG');
          } catch (orientationError) {
            FWI_App.log('[MONITORING] Orientation detection failed, using default (0 degrees): ' + orientationError, 'WARN');
            rotation = 0;
          }

          rotateBase64Image(base64NoPre, rotation, successCallback);
        };
        reader.readAsDataURL(this.response);
      };
      xhr.onerror = function() {
        FWI_App.log('[MONITORING] Screenshot file read error', 'ERROR');
        errorCallback &&
          errorCallback(
            new Error('Unexpected error while getting screenshot from device.')
          );
      };
      xhr.send();
    };

    FWI_App.log('[MONITORING] Initiating screenshot capture via b2bapis', 'DEBUG');
    b2bapis.b2bcontrol.captureScreen(onSuccess, errorCallback);
  },
  // Reboot, unless the firmware active
  rebootDevice: function(onError) {
    FWI_App.log('Rebooting device.');

    /* If firmware active, skip */
    if (!FWI_Hardware.firmwareActive) {
      this.reboot(onError);
    } else {
      FWI_App.log('Skip reboot for firmware upgrade.');
      onError && onError('Upgrading firmware. Skipping reboot.');
    }
  },
  // Reboots the device.
  reboot: function() {
    var onSuccess = function(val) {
      FWI_App.log('Reboot device success: ' + val);
    };
    var onError = function(error) {
      FWI_App.log(
        'Reboot device code:' +
          error.code +
          ' name: ' +
          error.name +
          ' message ' +
          error.message
      );
      onError &&
        onError(
          'Error while attempting to reboot device. Code:' +
            error.code +
            ' name: ' +
            error.name +
            ' message ' +
            error.message
        );
    };

    // Needs at least 5 seconds to finish writing localStorage
    // to disk. 4.5 seconds was tested and failed.
    setTimeout(function() {
      b2bapis.b2bcontrol.rebootDevice(onSuccess, onError);
    }, 5000);
  },
  /* Reload, unless firmware active */
  reloadPlayer: function() {
    if (FWI_Hardware.firmwareActive == false) {
      //delete all settings
      if (!HOST_DEVICE.getSetting('fwi.device.activated')) {
        localStorage.clear();
        FWI_App.log({
          msg: 'Successfully deleted all settings from disk upon deactivation.',
          level: 'INFO'
        });
      }
      location.reload();
    } else {
      FWI_App.log('Scheduler - Skip Reboot for Firmware Upgrade');
    }
  },
  // Cancels any active firmware update request.
  cancelFirmwareUpdate: function() {
    // Can't really do anything for Samsung SSP.
  },

  // Cancels any active software update request.
  cancelSoftwareUpdate: function() {
    // Can't really do anything for Samsung SSP.
  },
  /* Turn off Display */
  powerOff: function() {
    var onSuccess = function(val) {
      FWI_App.log('setPowerOff success : ' + val);
    };
    var onError = function(error) {
      FWI_App.log(
        'setPowerOff code :' +
          error.code +
          ' error name: ' +
          error.name +
          '  message ' +
          error.message
      );
    };
    FWI_App.log('setPowerOff ');
    b2bapis.b2bcontrol.setPowerOff(onSuccess, onError);
  },
  // NOTE: The SSP firmware version is of the form `/\w+-\w+-\d{4}\.\d{1}/`.
  // Additionally there can be multiple firmware versions listed on a device.
  // Due to multiple firmware versions being possible, we will only be checking
  // for the one that starts with `T-KTMLAKUC-`, then comparing that to the
  // one specified in the URL. See SHIM-4633 for any additional details.
  differentFirmwareAvailable: function(firmwareURL) {
    var urlParts = firmwareURL.split('/');
    var indexOfVersionPart = -1;

    FWI_App.log('Firmware URL parts: ' + urlParts.toString(), 'DEBUG');

    for (var i = 0; i < urlParts.length; i++) {
      if (urlParts[i] === 'image') {
        indexOfVersionPart = i - 1;
      }
    }

    FWI_App.log('Firmware URL version index: ' + indexOfVersionPart, 'DEBUG');

    if (indexOfVersionPart === -1) {
      return false;
    }
    FWI_App.log(
      'Firmware URL version: ' + urlParts[indexOfVersionPart],
      'DEBUG'
    );
    FWI_App.log(
      'Firmware local version: ' + HOST_DEVICE.firmwareVersion,
      'DEBUG'
    );
    FWI_App.log(
      'URL version index in local: ' +
        HOST_DEVICE.firmwareVersion.indexOf(urlParts[indexOfVersionPart]),
      'DEBUG'
    );

    return (
      HOST_DEVICE.firmwareVersion.indexOf(urlParts[indexOfVersionPart]) < 0
    );
  },
  /* Update Firmware via BEM */
  updateFirmware: function(callback) {
    if (HOST_DEVICE.differentFirmwareAvailable(FWI_Hardware.firmwareURL)) {
      // NOTE: This doesn't belong in the device section. Just doing
      // this now to get the SSP to stop playing videos when there's
      // a firmware update.
      if (FWI_App.currentScreen != 'screen_settings') {
        FWI_App.displaySettings();
      }

      var onSuccess = function(val) {
        FWI_App.log('updateFirmware success : ' + val);
        FWI_Hardware.publishOfflineNotificationReason(
          offlineCodes.SOFTWARE_UPDATE
        );
        callback && callback();
      };
      var onError = function(error) {
        //FWI_App.log("updateFirmware code :" + error.code + " error name: " + error.name + "  message " + error.message);
        FWI_App.log(
          'updateFirmware code :' +
            error.code +
            ' error name: ' +
            error.name +
            '  message ' +
            error.message
        );
        FWI_Hardware.updateCheckFirmwareMsg(
          'FW Err | ' + error.message,
          'error'
        );
        FWI_Hardware.cancelFirmware();
        callback && callback();
      };
      FWI_App.log('updateFirmware ');
      var SoftwareID = '0';
      //var SWUFileName  = "upgrade.bem";
      var SWUFileName = 'swuimage.bem';
      //var SWVersion  = "2007.170904";
      var SWVersion = 'T-HKMLAKUC 2007.4';
      var SWVersion = 'T-HKMLAKUC 2999.9';
      //var SWURL    = "http://10.88.43.36:8080/New2016/Saurabh/swupdate/T-HKMLAKUC_0227_20/image/upgrade.bem";
      var SWURL = FWI_Hardware.firmwareURL;
      //var SWTotalBytes  = 0;
      var SWTotalBytes = 1007396825;

      FWI_Hardware.updateCheckFirmwareProgressMsg(
        'Initiating Download & Upgrade'
      );
      FWI_Hardware.firmwareUpgradeModalP1();

      b2bapis.b2bcontrol.updateFirmware(
        SoftwareID,
        SWUFileName,
        SWVersion,
        SWURL,
        SWTotalBytes,
        onSuccess,
        onError
      );
      HOST_DEVICE.getFirmwareProg();
    } else {
      FWI_App.log('This firmware is already installed');
      callback && callback();
    }
  },
  /* Display progress, updates every 1 min */
  getFirmwareProg: function() {
    var onchange = function(data) {
      var strData = JSON.stringify(data);

      FWI_App.log(strData);
      //$(".firmware_json").show().html(strData);
      $('.firmware_progress_message .prog_bar .prog_bar_dl')
        .width(data.data + '%')
        .html(data.data + '%');
    };

    try {
      b2bapis.b2bcontrol.setUpdateFirmwareProgressChangeListener(onchange);
      FWI_App.log('getFirmwareProg');
    } catch (e) {
      FWI_App.log(
        'setUpdateFirmwareProgressChangeListener exception ' +
          e.code +
          ' name: ' +
          e.name +
          ' message: ' +
          e.message
      );
      FWI_Hardware.updateCheckFirmwareMsg(
        'FW Change % Err | ' + e.message,
        'error'
      );
    }
  },
  // Firmware Version
  getFirmwareVersion: function() {
    var firmwareVersion = 'N/A';

    FWI_App.log('Getting firmware version...');

    try {
      firmwareVersion = b2bapis.b2bcontrol.getFirmwareVersion();
    } catch (e) {
      FWI_App.log(
        'getFirmwareVersion call syncFunction exception ' +
          e.code +
          ' name: ' +
          e.name +
          ' message: ' +
          e.message
      );
    }

    HOST_DEVICE.firmwareVersion = firmwareVersion;

    return firmwareVersion;
  },

  // Gets a specific device settings from the stored settings.
  getSetting: function(key) {
    return localStorage.getItem(key);
  },

  removeSetting: function(key, callback) {
    localStorage.removeItem(key);

    callback && callback();
  },

  // Sets a specific device setting in the stored settings.
  setSetting: function(key, value, onSuccess, onError) {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
    if (onSuccess) {
      onSuccess();
    }
  },

  // Checks if the device is online.
  isDeviceOnline: function(onSuccess) {
    onSuccess && onSuccess(window.navigator.onLine);
    return window.navigator.onLine;
  },

  // Gets the device ID.
  getDeviceId: function() {
    return HOST_DEVICE.deviceId || HOST_DEVICE.getSetting('fwi.device.id');
  },

  // Checks if the device API is available.
  isApiAvailable: function() {
    return !!(typeof b2bapis !== 'undefined' && b2bapis.b2bcontrol);
  },
  // Updates the SDK version if applicable.
  getSdkVersion: function() {
    var version = null,
      webAPI = null;

    FWI_App.log('Getting sdk version...');

    try {
      version = b2bapis.b2bcontrol.getVersion();
      FWI_App.log('B2B version: ' + version);
      webAPI = webapis.productinfo.getVersion();
      FWI_App.log('Web API version: ' + webAPI);
    } catch (e) {
      FWI_App.log(
        'getVersion call syncFunction exception ' +
          e.code +
          ' name: ' +
          e.name +
          ' message: ' +
          e.message
      );
    }

    if (version) {
      return 'B2B Control: ' + version + '<br>Web API: ' + webAPI;
    } else {
      return 'N/A';
    }
  },
  /* b2bcontrol/webapi module version */
  getVersion: function() {
    var Version = null;
    var webApi = null;
    try {
      Version = b2bapis.b2bcontrol.getVersion();
      webApi = webapis.productinfo.getVersion();
    } catch (e) {
      FWI_App.log(
        'getVersion call syncFunction exception ' +
          e.code +
          ' name: ' +
          e.name +
          ' message: ' +
          e.message
      );
    }
    if (null !== Version) {
      FWI_App.log('B2Bcontrol: ' + Version + '<br>Webapi: ' + webApi);
      $('.about_platform .sdkVersion').html(
        'B2Bcontrol: ' + Version + '<br>Webapi: ' + webApi
      );
    }
  },
  /* System temp */
  getTemp: function() {
    var currentTemperature = null;

    try {
      currentTemperature = b2bapis.b2bcontrol.getCurrentTemperature();
    } catch (e) {
      FWI_App.log(
        'getCurrentTemperature call syncFunction exception ' +
          e.code +
          ' name: ' +
          e.name +
          ' message: ' +
          e.message
      );
    }

    FWI_App.log('Current temperature: ' + currentTemperature);
    return currentTemperature;
  },

  getMACAddress: function(onSuccess, onError) {
    FWI_App.log('[HARDWARE] Attempting to get MAC address via b2bapis', 'DEBUG');
    try {
      var macAddress = b2bapis.b2bcontrol.getMACAddress();
      FWI_App.log('[HARDWARE] MAC address retrieved successfully: ' + macAddress, 'INFO');
      onSuccess && onSuccess(macAddress);
    } catch (err) {
      FWI_App.log('[HARDWARE] Failed to get MAC address: ' + err.message, 'ERROR');
      onError && onError(err);
    }
  },
  // Returns the IP address of the device
  getIPAddress: function(onSuccess, onError) {
    FWI_App.log('[HARDWARE] Attempting to get IP address via b2bapis', 'DEBUG');
    try {
      var ipAddress = b2bapis.b2bcontrol.getIPAddress();
      FWI_App.log('[HARDWARE] IP address retrieved successfully: ' + ipAddress, 'INFO');
      onSuccess && onSuccess(ipAddress);
    } catch (err) {
      FWI_App.log('[HARDWARE] Failed to get IP address: ' + err.message, 'ERROR');
      onError && onError(err);
      // Fallback to N/A if error callback doesn't handle it
      onSuccess && onSuccess('N/A');
    }
  },

  setLauncherURL: function(url) {
    if (url) {
      var onSuccess = function() {
        FWI_App.log('setURLLauncherAddress success');
      };
      var onError = function(error) {
        FWI_App.log(
          'setURLLauncherAddress code :' +
            error.code +
            ' error name: ' +
            error.name +
            '  message ' +
            error.message
        );
      };
      FWI_App.log('setURLLauncherAddress ');
      b2bapis.b2bcontrol.setURLLauncherAddress(url, onSuccess, onError);
    }
  },

  getLauncherURL: function() {
    var URLLauncherAddress = null;
    try {
      URLLauncherAddress = b2bapis.b2bcontrol.getURLLauncherAddress();
    } catch (e) {
      FWI_App.log(
        'getURLLauncherAddress call syncFunction exception ' +
          e.code +
          ' name: ' +
          e.name +
          ' message: ' +
          e.message
      );
    }
    if (null !== URLLauncherAddress) {
      FWI_App.log(
        'getURLLauncherAddress call syncFunction type: ' + URLLauncherAddress
      );
    }
  },
  /* b2b/tizen/js; if blank auto determine */
  getTime: function(type) {
    var CurrentTime;
    type = type || 'b2b'; // Use b2b by default.

    // Get specific clock.
    if (type === 'b2b' || type === 'tizen' || type === 'js') {
      if (type === 'b2b' && typeof b2bapis !== 'undefined') {
        try {
          CurrentTime = b2bapis.b2bcontrol.getCurrentTime();
        } catch (e) {
          // Placeholder for catch
        }

        if (CurrentTime) {
          var timeSplit = CurrentTime.split(':');
          CurrentTime = new Date(
            timeSplit[0],
            timeSplit[1] - 1,
            timeSplit[2],
            timeSplit[3],
            timeSplit[4],
            timeSplit[5],
            0
          );
        } else {
          // Fall back to JavaScript time.

          CurrentTime = HOST_DEVICE.getTime('js');
        }
      } else if (type === 'tizen') {
        CurrentTime = tizen.time.getCurrentDateTime();

        try {
          // SSSP 4 or 5.
          if (CurrentTime.hasOwnProperty('date_')) {
            CurrentTime = CurrentTime.date_;
          } else if (CurrentTime.hasOwnProperty('_utcTimestamp')) {
            CurrentTime = new Date(CurrentTime._utcTimestamp);
          } else {
            // Fall back to b2b time.

            CurrentTime = HOST_DEVICE.getTime('b2b');
          }
        } catch (e) {
          // Fall back to B2B time if possible.

          CurrentTime = HOST_DEVICE.getTime('b2b');
        }
      } else {
        // JavaScript time.
        CurrentTime = new Date();
      }
    }
    return CurrentTime;
  },

  // Write logs queue to file
  storeLogs: function() {
    storeFWIServiceLogs();
    storeCloudLogs();
  },

  setIRLock: function() {
    var onSuccess = function(val) {
      FWI_App.log('setIRLockOnOff success : ' + val);
    };
    var onError = function(error) {
      FWI_App.log(
        'setIRLockOnOff code :' +
          error.code +
          ' error name: ' +
          error.name +
          '  message ' +
          error.message
      );
    };
    FWI_App.log('setIRLockOnOff ');
    b2bapis.b2bcontrol.setIRLockOnOff('ON', onSuccess, onError);
  },
  getIRLock: function() {
    var IRLockOnOff = null;
    try {
      IRLockOnOff = b2bapis.b2bcontrol.getIRLockOnOff();
    } catch (e) {
      FWI_App.log(
        'getIRLockOnOff call syncFunction exception ' +
          e.code +
          ' name: ' +
          e.name +
          ' message: ' +
          e.message
      );
    }
    if (null !== IRLockOnOff) {
      $('.about_system .signal').html('IRLock: ' + IRLockOnOff);
      FWI_App.log('getIRLockOnOff call syncFunction type: ' + IRLockOnOff);
    }
  },
  getTVWindow: function() {
    function successCB(availableWindows) {
      var html = [];
      for (var i = 0; i < availableWindows.length; i++) {
        FWI_App.log('Available window ' + i + ' = ' + availableWindows[i]);
      }
    }
    try {
      tizen.tvwindow.getAvailableWindows(successCB);
    } catch (error) {
      FWI_App.log(
        'Error name = ' + error.name + ', Error message = ' + error.message
      );
    }

    try {
      var source = tizen.tvwindow.getSource();
      //FWI_App.log(source);
      FWI_App.log(
        '(Current) Source type: ' + source.type + 'number = ' + source.number
      );
    } catch (error) {
      FWI_App.log(
        'Error name = ' + error.name + ', Error message = ' + error.message
      );
    }
  },

  /* Delete Zip file */
  /* Create Zip */
  /* Add logs to Zip */
  /* Pass Zip to Monitoring for upload to FWI */
  /* Return with success or error */
  /* Clear old files */
  createZipAddFiles: function(files, onSuccess, onError) {
    var successUploadArr = [];
    var errorUploadArr = [];
    var documentsDir;
    var archiveReadyDetectCount = 0;
    var archiveFileAddCount = 0;
    var archiveFile;

    function progressCallback(opId, val) {
      FWI_App.log(
        'opId: ' + opId + ' with progress val: ' + (val * 100).toFixed(0) + '%'
      );
    }

    function successCallback() {
      archiveReadyDetectCount++;
      FWI_App.log('File added');

      /* Due to callback speed, detect last callback */
      if (archiveReadyDetectCount == archiveFileAddCount) {
        archiveFile.close(); //close the file
        archiveReady(); //begin upload
      }
    }

    function errorCallback(error) {
      FWI_App.log('Failed to add to logs zip', 'ERROR');
      FWI_App.log(error, 'ERROR');
    }

    function archiveReady() {
      /* First Read the archive as file (cannot directly read the archive just created) */
      tizen.filesystem.resolve(
        'documents/fwi_sssp_log.zip',
        function(file) {
          /* Pass files to monitoring for upload, receive file lists */
          HOST_DEVICE.uploadLogsEnd(file, function(errorFiles, successFiles) {
            FWI_App.log('Log upload Done');

            /* Timestamp/Status */
            if (errorFiles.length) {
              FWI_App.log(errorFiles);
              FWI_App.log(
                '[' + errorFiles.length + '] Files Failed - Upload Logs - Error'
              );
              FWI_Monitoring.setLogsMsg(
                '[' + errorFiles.length + '] Files Failed, Please Try Again',
                'error'
              );
            } else {
              FWI_Monitoring.setLogsMsg(
                'Logs Uploaded!',
                'success'
              );

              FWI_Monitoring.monLogsTimestamp = HOST_DEVICE.getTime();
              HOST_DEVICE.setSetting(
                'mon_logs_timestamp',
                FWI_Monitoring.monLogsTimestamp.toString()
              );
              $('.log_timestamp').html(
                FWI_Helper.getTimestamp(FWI_Monitoring.monLogsTimestamp)
              );
            }

            /* Delete uploaded files */
            if (successFiles.length) {
              FWI_App.log(successFiles);
              FWI_App.log(
                'Logs Uploaded!',
                'DEBUG'
              );

              successUploadArr.push('console.txt');
              HOST_DEVICE.clearConsoleLog(successUploadArr);
            }

            onSuccess && onSuccess();
          });
        },
        function(e) {
          FWI_App.log('Upload Logs - Error - Zip Archive Read Error');
          FWI_Monitoring.setLogsMsg('Error. Please Try Again', 'error');
        },
        'r'
      );
    }

    /* After Create Zip Success */
    function createSuccess(archive) {
      archiveFile = archive;

      var currentFileNo = 0;
      var consoleFile;

      function addToArchive() {
        if (currentFileNo < files.length) {
          consoleFile = files[currentFileNo];
          archive.add(
            consoleFile.fullPath,
            successCallback,
            errorCallback,
            progressCallback
          );
          successUploadArr.push(consoleFile.name);
          currentFileNo++;
          archiveFileAddCount++;

          addToArchive();
        } else if (files.length < 1) {
          FWI_App.log('No files to upload', 'DEBUG');
        }
      }

      addToArchive();
    }

    function createFailure(error) {
      FWI_App.log('Create zip failure:', 'ERROR');
      FWI_App.log(error, 'ERROR');
    }

    /* Start Process, Create Archive */
    function createZip() {
      tizen.archive.open(
        'documents/fwi_sssp_log.zip',
        'w',
        createSuccess,
        createFailure
      );
    }

    /* First Delete Old Zip if Needed (Error?) */
    function onsuccess(files) {
      documentsDir.deleteFile(
        'documents/fwi_sssp_log.zip',
        function() {
          FWI_App.log('Console File Deleted: fwi_sssp_log.zip');
          createZip();
        },
        function(e) {
          FWI_App.log('DEL ZIP: ' + e.message);
          createZip();
        }
      );
    }
    function onerror(error) {
      FWI_App.log(
        'DEL ZIP: The error ' +
          error.message +
          ' occurred when listing the files in the selected folder'
      );
      createZip();
    }
    tizen.filesystem.resolve(
      'documents',
      function(dir) {
        documentsDir = dir;
        dir.listFiles(onsuccess, onerror);
      },
      function(e) {
        FWI_App.log('Error' + e.message);

        FWI_Monitoring.setLogsMsg('Error. Please Try Again', 'error');
      },
      'rw'
    );
  },

  getYyyyMmDdHhMmSs: function(hasDate) {
    var date = hasDate || HOST_DEVICE.getTime();
    var dd = date.getDate();
    var mm = date.getMonth() + 1;
    var yyyy = date.getFullYear();

    if (dd < 10) {
      dd = '0' + dd;
    }

    if (mm < 10) {
      mm = '0' + mm;
    }

    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();

    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    return (
      yyyy + '-' + mm + '-' + dd + '-' + hours + '-' + minutes + '-' + seconds
    );
  },

  // Receives file array, processes
  uploadLogsEnd: function(archive, returnLogsFn) {
    var url;
    var comp = FWI_Advanced.advComp;
    var user = FWI_Advanced.advUser;
    var pass = FWI_Advanced.advPass;
    var host = FWI_Advanced.advHost;

    if (host.match(/\/$/)) {
      url = host + 'filetransfer/appendchunk';
    } else {
      url = host + '/filetransfer/appendchunk';
    }

    // Upload all log files
    var successUploadArr = [];
    var errorUploadArr = [];
    var currentDate = HOST_DEVICE.getTime();
    var consoleFile;
    var uploadFileName =
      HOST_DEVICE.getYyyyMmDdHhMmSs(currentDate) +
      '_' +
      FWI_Hardware.Serial +
      '.zip';

    function uploadLogFile() {
      consoleFile = archive;
      FWI_App.log(consoleFile);

      var full_uri = consoleFile.toURI();
      var request = new XMLHttpRequest();

      /* Read blob */
      request.open('GET', full_uri, true);
      request.responseType = 'blob';
      request.onload = function() {
        var reader = new FileReader();

        reader.readAsDataURL(request.response);
        reader.onload = function(e) {
          var b64zip = e.target.result;

          b64zip = b64zip.replace('data:application/zip;base64,', '');

          /* Upload */
          $.ajax({
            type: 'POST',
            url: url,
            contentType: 'application/json',
            headers: {
              // SOAPAction: 'http://fourwindsinteractive.com/AppendChunk'
              Authorization: 'Basic ' + btoa(comp + '\\' + user + ':' + pass),
              Accept: "application/json",
              "Content-Type": 'application/json'
            },
            data:
              // '<?xml version="1.0" encoding="utf-8"?>' +
              // '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
              // '<soap:Header>' +
              // '<FwiCredentials xmlns="http://fourwindsinteractive.com/">' +
              // '<Username>' +
              // user +
              // '</Username>' +
              // '<Company>' +
              // comp +
              // '</Company>' +
              // '<Password>' +
              // pass +
              // '</Password>' +
              // '</FwiCredentials>' +
              // '</soap:Header>' +
              // '<soap:Body>' +
              // '<AppendChunk xmlns="http://fourwindsinteractive.com/">' +
              // '<choice>Upload</choice>' +
              // '<fileName>' +
              // uploadFileName +
              // '</fileName>' +
              // '<buffer>' +
              // b64zip +
              // '</buffer>' +
              // '<offset>0</offset>' +
              // '</AppendChunk>' +
              // '</soap:Body>' +
              // '</soap:Envelope>',

              JSON.stringify({
                Choice: 'Upload',
                FileName: uploadFileName,
                Buffer: b64zip,
                Offset: 0
              }),

            success: function() {
              FWI_App.log('Upload Logs - Success - ' + uploadFileName);
              successUploadArr.push(consoleFile.name);
              /* Report Back */
              logUploadFinished();
            },

            error: function() {
              FWI_App.log('Upload Logs - Error - ' + uploadFileName);
              errorUploadArr.push(consoleFile.name);
              logUploadFinished();
            }
          });
        };
      };
      request.send();
    }

    function logUploadFinished() {
      returnLogsFn(errorUploadArr, successUploadArr);
    }

    uploadLogFile();
  },

  uploadLogs: function(onSuccess, onError) {
    // Make sure all logs have been saved before reading and zipping
    storeFWIServiceLogs(function(error) {
      if (!error) {
        FWI_App.log('Reading logs', 'DEBUG');
        function onsuccess(files) {
          /* Pass files to Create Zip method */
          HOST_DEVICE.createZipAddFiles(files, onSuccess, onError);
        }

        function onerror(error) {
          FWI_App.log(
            'The error ' +
              error.message +
              ' occurred when listing the files in the selected folder'
          );
          onError && onError(error);
        }

        HOST_DEVICE.logsFWIServiceReading = true;
        tizen.filesystem.resolve(
          'documents',
          function(dir) {
            dir.listFiles(onsuccess, onerror);
          },
          function(e) {
            FWI_App.log('Error: ' + e.message, 'ERROR');
          },
          'rw'
        );
      } else {
        FWI_App.log({
          msg: 'Failed to store logs: ' + error,
          level: 'ERROR',
          preventStoring: true
        });
        onError && onError(error);
      }
    });
  },
  /* Clear console files */
  clearConsoleLog: function(successFiles) {
    savingFWIServiceLogs = true;

    if (successFiles && successFiles.length) {
      var documentsDir;

      function onsuccess(files) {
        files.forEach(function(file) {
          // If log file found, overwrite
          if (/^fwilogs_/.test(file.name)) {
            file.openStream(
              'w',
              function(fs) {
                fs.write('');
                fs.close();

                if (
                  storedFWIServiceLogSettings.currentLogFileName == file.name
                ) {
                  savingFWIServiceLogs = false;
                }

                storedFWIServiceLogSettings.currentLogFileSize = 0;
                saveSettings(storedFWIServiceLogSettings, SETTINGS_FILE_NAME);

                FWI_App.log('Log file ' + file.name + ' cleared', 'DEBUG');
              },
              function(error) {
                if (
                  storedFWIServiceLogSettings.currentLogFileName == file.name
                ) {
                  savingFWIServiceLogs = false;
                }

                FWI_App.log('Failed to clear file: ' + error.message, 'ERROR');
              },
              'UTF-8'
            );
          }
        });

        /* Also Delete Zip */
        documentsDir.deleteFile(
          'documents/fwi_sssp_log.zip',
          function() {
            FWI_App.log('Log zip file deleted - fwi_sssp_log.zip', 'DEBUG');
          },
          function(e) {
            FWI_App.log('Error: ' + e.message), 'ERROR';
          }
        );
      }

      function onerror(error) {
        FWI_App.log(
          'The error "' +
            error.message +
            '" occurred when listing the files in the selected folder'
        );
      }

      tizen.filesystem.resolve(
        'documents',
        function(dir) {
          documentsDir = dir;
          dir.listFiles(onsuccess, onerror);
        },
        function(e) {
          FWI_App.log('Error: ' + e.message, 'Error');
        },
        'rw'
      );
    }
  },

  writeFWIServiceLog: function(log) {
    HOST_DEVICE.logsQueueFWIServices += log;
  },

  writeCloudLog: function(log) {
    HOST_DEVICE.logsQueueCloud.push(log);
  },

  getCloudLogs: function(callback) {
    uploadingCloudLogs = true;

    var totalLogs = [];
    var logsRead;

    function sendLogs() {
      var allLogsRead = true;

      logsRead.forEach(function(read) {
        allLogsRead = allLogsRead && read;
      });

      if (allLogsRead) {
        callback && callback(totalLogs);
      }
    }

    function onsuccess(files) {
      var logFiles = [];
      tizen.filesystem.resolve('documents', function(dir) {
        documentsDir = dir;
        files.forEach(function(file) {
          if (/^cloudlogs_/.test(file.name)) {
            logFiles.push(file);
          }
        });
  
        logsRead = new Array(logFiles.length);
        logsRead.fill(false);
  
        logFiles.forEach(function(file, index) {
          file.openStream(
            'r',
            function(fs) {
              var logs;
  
              if (file.fileSize > 0) {
                try {
                  logs = JSON.parse(fs.read(file.fileSize));
                } catch (err) {
                  FWI_App.log({
                    msg:
                      'Failed to parse Cloud logs (' +
                      file.name +
                      '):' +
                      stringifyError(err),
                    level: 'ERROR',
                    preventStoring: true
                  });
                  logs = [];
                }
              } else {
                logs = [];
              }
  
              totalLogs = totalLogs.concat(logs);
  
              try {
                fs.close();
              } catch (err) {
                FWI_App.log({
                  msg:
                    'Failed to close Cloud logs (' +
                    file.name +
                    '):' +
                    stringifyError(err),
                  level: 'ERROR',
                  preventStoring: true
                });
              }
  
              logsRead[index] = true;
              sendLogs();
            },
            function(error) {
              FWI_App.log({
                msg: 'Failed to read Cloud logs: ' + error.message,
                level: 'ERROR',
                preventStoring: true
              });
  
              logsRead[index] = true;
              sendLogs();
            },
            'UTF-8'
          );
        });
  
  
        /* Also Delete Zip */
        documentsDir.deleteFile(
          'documents/fwi_sssp_log.zip',
          function() {
            FWI_App.log('Log zip file deleted - fwi_sssp_log.zip', 'DEBUG');
          },
          function(e) {
            FWI_App.log('Error: ' + e.message), 'ERROR';
          }
        );
      }, 
      
      function(e) {
        FWI_App.log(
          'The error "' +
            error.message +
            '" occurred when listing the files in the selected folder'
        );
      });


    }

    function onerror(error) {
      FWI_App.log(
        'The error "' +
          error.message +
          '" occurred when listing the files in the selected folder'
      );
    }

    tizen.filesystem.resolve(
      'documents',
      function(dir) {
        dir.listFiles(onsuccess, onerror);
      },
      function(e) {
        FWI_App.log('Error: ' + e.message, 'ERROR');
      },
      'r'
    );
  },

  uploadCloudLogsComplete: function(success) {
    FWI_App.log({
      msg: 'Cloud logs upload complete, success: ' + success,
      level: 'DEBUG',
      preventStoring: true
    });
    if (success) {
      var logsDeleted;

      function deletingComplete() {
        var allLogsDeleted = true;

        logsDeleted.forEach(function(read) {
          allLogsDeleted = allLogsDeleted && read;
        });

        if (allLogsDeleted) {
          FWI_App.log({
            msg: 'Cloud logs deleted',
            level: 'DEBUG',
            preventStoring: true
          });
          storedCloudLogSettings = {};
          saveSettings(storedCloudLogSettings, SETTINGS_CLOUD_LOGS_FILE_NAME);
          uploadingCloudLogs = false;
        }
      }

      function onsuccess(documentsDir) {
        return function(files) {
          var logFiles = [];

          files.forEach(function(file) {
            // If log file found, overwrite
            if (/^cloudlogs_/.test(file.name)) {
              logFiles.push(file);
            }
          });

          logsDeleted = new Array(logFiles.length);
          logsDeleted.fill(false);

          if (logFiles.length > 0) {
            logFiles.forEach(function(file, index) {
              documentsDir.deleteFile(
                file.fullPath,
                function() {
                  logsDeleted[index] = true;
                  deletingComplete();
                },
                function(err) {
                  FWI_App.log(
                    'Failed to delete file: ' + error.message,
                    'ERROR'
                  );
                  logsDeleted[index] = true;
                  deletingComplete();
                }
              );
            });
          } else {
            FWI_App.log({
              msg: 'No logs to delete',
              level: 'ERROR',
              preventStoring: true
            });
            uploadingCloudLogs = false;
          }
        };
      }

      function onerror(error) {
        FWI_App.log(
          'The error "' +
            error.message +
            '" occurred when listing the files in the selected folder',
          'ERROR'
        );
        storedCloudLogSettings = {};
        saveSettings(storedCloudLogSettings, SETTINGS_CLOUD_LOGS_FILE_NAME);
        uploadingCloudLogs = false;
      }

      tizen.filesystem.resolve(
        'documents',
        function(dir) {
          dir.listFiles(onsuccess(dir), onerror);
        },
        onerror,
        'w'
      );
    } else {
      FWI_App.log({
        msg: 'Cloud logs failed to upload',
        level: 'ERROR',
        preventStoring: true
      });
      uploadingCloudLogs = false;
    }
  },
  /* Toggle panel mute */
  togglePanel: function() {
    var PanelMuteStatus = null;

    try {
      PanelMuteStatus = b2bapis.b2bcontrol.getPanelMuteStatus();
    } catch (e) {
      FWI_App.log(
        'getPanelMuteStatus call syncFunction exception ' +
          e.code +
          ' name: ' +
          e.name +
          ' message: ' +
          e.message
      );
    }

    if (null !== PanelMuteStatus) {
      FWI_App.log(
        'getPanelMuteStatus call syncFunction type: ' + PanelMuteStatus
      );

      var newMute;

      if (PanelMuteStatus === 'OFF') {
        newMute = 'ON';
      } else if (PanelMuteStatus === 'ON') {
        newMute = 'OFF';
      }

      var onSuccess = function() {
        FWI_App.log('Set panel mute success');
      };
      var onError = function(error) {
        FWI_App.log(
          'setPanelMute code :' +
            error.code +
            ' error name: ' +
            error.name +
            '  message ' +
            error.message
        );
      };

      if (newMute) {
        b2bapis.b2bcontrol.setPanelMute(newMute, onSuccess, onError);
      }
    }
  },

  turnDisplayOnOff: function(onOff) {
    var newMute;

    if (onOff == 'OFF') {
      newMute = 'ON';
    } else {
      newMute = 'OFF';
    }

    var onSuccess = function() {
      FWI_App.log('Set panel mute success');
    };
    var onError = function(error) {
      FWI_App.log(
        'setPanelMute code :' +
          error.code +
          ' error name: ' +
          error.name +
          '  message ' +
          error.message
      );
    };

    if (newMute) {
      b2bapis.b2bcontrol.setPanelMute(newMute, onSuccess, onError);
    }
  },

  // whether or not this device can support commands over the HDMI-CEC protocol.
  supportsCECcommands: function() {
      return false;
  },
  
  // Gets the device model information and returns an object.
  getDeviceModelInformation: function(onSuccess, onError) {
    FWI_App.log('Get device model info');
    tizen.systeminfo.getPropertyValue('BUILD', onSuccess, onError);
  },

  // Gets the device model information.
  getAboutInfo: function(callback) {
    var result = {
      serialNumber: b2bapis.b2bcontrol.getSerialNumber(),
      sdkVersion: this.getSdkVersion(),
      firmwareVersion: this.getFirmwareVersion()
    };
    var onSuccess = function(device) {
      result.manufacturer = device.manufacturer;
      result.model = device.model;
      result.buildVersion = device.buildVersion;
      callback && callback(result);
    };
    var onError = function(error) {
      FWI_App.log('Get model error: ' + error.message);
      callback && callback(result);
    };

    HOST_DEVICE.serialNumber = result.serialNumber;
    this.getDeviceModelInformation(onSuccess, onError);
  },

  // Gets the next supported orientation value for this device.
  getNextSupportedOrientationValue: function(currentOrientation) {
    switch (currentOrientation) {
      case 'DEGREE_0':
      case 'LANDSCAPE':
        nextOrien = 'DEGREE_90';
        break;
      case 'DEGREE_90':
      case 'PORTRAIT':
      case 'DEGREE_180':
      case 'DEGREE_270':
        nextOrien = 'DEGREE_0';
        break;
      default:
        nextOrien = 'DEGREE_0';
        break;
    }
    return nextOrien;
  },

  // Sets the orientation of the display.
  setOrientation: function(orientation, onSuccess, onError) {
    var onComplete = function() {
      HOST_DEVICE.orientation = storedOrientation;
      HOST_DEVICE.setSetting(
        'orientation',
        storedOrientation,
        onSuccess,
        onError
      );
    };

    var nextOrien;
    var storedOrientation;

    switch (orientation) {
      case 'DEGREE_90':
      case 'DEGREE_270':
      case 'PORTRAIT':
        nextOrien = 'PORTRAIT';
        storedOrientation = 'DEGREE_90';
        break;
      default:
        nextOrien = 'LANDSCAPE';
        storedOrientation = 'DEGREE_0';
        break;
    }

    b2bapis.b2bcontrol.setSourceOrientation(
      'TV',
      nextOrien,
      onComplete,
      onError
    );
    b2bapis.b2bcontrol.setMenuOrientation(
      nextOrien,
      function(val) {
        FWI_App.log('RotateMenu-setMenuOrientation success : ' + val);
      },
      onError
    );
  },

  // Checks if the given URL points to an BEM or MSD firmware package.
  isValidFirmwareURL: function(url) {
    if (url) {
      return (
        FWI_Validate.validateURL(url) &&
        /\/.+\/.+\/image\/.+\.bem|msd$/.test(url)
      );
    }

    return false;
  },

  // Are arrow keys allowed to be pressed for navigation?
  allowArrowKeys: function() {
    // Arrow keys can cause app screen to shift, so we don't allow them.
    return false;
  },

  // Is download progress supported by this shim?
  isDownloadProgressSupported: function() {
    return true;
  },
  /* Get Storage Info */
  getStorages: function(callback) {
    function onErrorCallback(error) {
      FWI_App.log('Get Storages Not supported: ' + error.message);
      callback && callback();
    }

    function onSuccessCallback(storage) {
      for (var i = 0; i < storage.units.length; i++) {
        var unitType = storage.units[i].type;
        var total = FWI_Helper.byteSize(storage.units[i].capacity, 2);
        var used = FWI_Helper.byteSize(
          storage.units[i].capacity - storage.units[i].availableCapacity,
          2
        );
        var available = FWI_Helper.byteSize(
          storage.units[i].availableCapacity,
          2
        );

        // FWI_App.log({ msg: 'Storages:', level: 'DEBUG', preventStoring: true });
        // FWI_App.log({ msg: unitType + ' Total', level: 'DEBUG', preventStoring: true });
        // FWI_App.log({ msg: total, level: 'DEBUG', preventStoring: true });
        // FWI_App.log({ msg: unitType + ' Used', level: 'DEBUG', preventStoring: true });
        // FWI_App.log({ msg: used, level: 'DEBUG', preventStoring: true });
        // FWI_App.log({ msg: unitType + ' Free', level: 'DEBUG', preventStoring: true });
        // FWI_App.log({ msg: available, level: 'DEBUG', preventStoring: true });
      }
      // TODO: What should be returned here?
      callback && callback();
    }

    // FWI_App.log({ msg: 'Reading storage ...', level: 'DEBUG', preventStoring: true });
    tizen.systeminfo.getPropertyValue(
      'STORAGE',
      onSuccessCallback,
      onErrorCallback
    );
  },

  getDisplayInfo: function() {
    function onSuccessCallback(display) {
      FWI_App.log(
        'Resolution: ' +
          display.resolutionWidth +
          ', ' +
          display.resolutionHeight
      );
      FWI_App.log(
        'DPI: ' + display.dotsPerInchWidth + ', ' + display.dotsPerInchHeight
      );
      FWI_App.log(
        'Physical dimensions: ' +
          display.physicalWidth +
          ', ' +
          display.physicalHeight
      );
      FWI_App.log('Brightness: ' + display.brightness);
    }
    function onErrorCallback(error) {
      FWI_App.log('Get Display - Not supported: ' + error.message);
    }
    tizen.systeminfo.getPropertyValue(
      'DISPLAY',
      onSuccessCallback,
      onErrorCallback
    );
  },

  // Returns the name of the platform as a string.
  getPlatform: function() {
    return 'Samsung SSP';
  },

  /* Get Current Volume */
  getVolume: function(callback) {
    var vol = tizen.tvaudiocontrol.getVolume();
    FWI_Hardware.volumeLevel = vol;
    FWI_App.log('Volume: ' + vol);
    callback && callback(vol);
  },
  /* Set Volume 1-100 */
  setVolume: function(level) {
    if (level && level >= 0 && level <= 100) {
      try {
        tizen.tvaudiocontrol.setVolume(level);
        FWI_Hardware.volumeLevel = level;
        FWI_App.log('Vol Set from CMW: ' + level);
        FWI_Shadow.updateShadow();
      } catch (e) {
        if (e.name === 'InvalidValuesError') {
          FWI_App.log(
            'The passed value value should be in the range of 0 to 100.'
          );
        }
      }
    }
  },
  // Get Dynamic About Data
  getAboutData: function(callback) {
    HOST_DEVICE.getStorages(function(storages) {
      callback &&
        callback({
          storages: storages
        });
    });
  },
  // Returns the proxy server information.
  getProxyServerInfo: function() {
    return b2bapis.b2bcontrol.getProxyserverInfo();
  },

  // Returns the integer value of the platform. See PlayerPlatform.cs.
  getPlayerPlatformId: function() {
    return 9;
  },

  // Gets the current display status.
  getDisplayStatus: function(onSuccess, onError) {
    try {
      var panelMuteStatus = b2bapis.b2bcontrol.getPanelMuteStatus();

      if (panelMuteStatus) {
        if (onSuccess) {
          var displayStatus = {
            connected: true, // Display is part of the Samsung device.
            poweredOn: panelMuteStatus === 'OFF',
            port: 'HDMI', // There is really no port used for Samsung, but the value is required for CM monitoring.
            type: 'Samsung' // TODO: This might need to be set in HOST_DEVICE.getAboutInfo()
          };
          onSuccess(displayStatus);
        }
      } else {
        throw new Error('No panel mute status returned.');
      }
    } catch (err) {
      FWI_App.log(
        'Error getting panel mute status:' +
          err.code +
          ', error name: ' +
          err.name +
          ', message ' +
          err.message
      );
      if (onError) {
        onError(err);
      }
    }
  },

  // Validates the given URL for a software update.
  validateSoftwareUpdate: function(url, onSuccess, onError) {
    var lastChar = url.substr(-1);

    if (lastChar === '/') {
      url = url.substr(0, url.length - 1);
    }

    $.ajax({
      url: url + '/sssp_config.xml',
      dataType: 'xml',
      success: function(data) {
        var ver = $(data)
          .find('widget')
          .find('ver')
          .text();

        if (ver) {
          onSuccess();
        } else {
          // No version element in configuration XML.
          FWI_App.log(
            'Software update location verification error. No version information present in XML configuration file.'
          );
          onError();
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        FWI_App.log(
          'Software update location verification error. Error: ' +
            textStatus +
            ' - ' +
            errorThrown
        );
        onError();
      }
    });
  },
  /* Update Software Now, local or remote call */
  checkSoftwareNow: function() {
    var url = FWI_Software.softwareUrl;
    var lastChar = url.substr(-1);

    if (lastChar === '/') {
      url = url.substr(0, url.length - 1);
    }

    $.ajax({
      url: url + '/sssp_config.xml',
      cache: false,
      dataType: 'xml',
      success: function(data) {
        var ver = $(data)
          .find('widget')
          .find('ver')
          .text();

        if (ver) {
          FWI_Software.softwareUpdatesTimestamp = FWI_Helper.getTimestamp();
          FWI_Software.softwareUpdateDateTime = FWI_Helper.getDateIsoStr();
          localStorage.setItem(
            'software_updates_timestamp',
            FWI_Software.softwareUpdatesTimestamp
          );
          $('.software_timestamp').html(FWI_Software.softwareUpdatesTimestamp);
          FWI_App.log('Web: ' + ver + ' | Installed: 1.9.1');

          if (ver != '1.9.1') {
            FWI_Software.setCheckSoftwareMsg(
              'New version available, Upgrading.',
              'success'
            );
            FWI_Hardware.publishOfflineNotificationReason(
              offlineCodes.SOFTWARE_UPDATE
            );

            setTimeout(function() {
              HOST_DEVICE.rebootDevice();
            }, 5000);
          } else {
            FWI_Software.setCheckSoftwareMsg(
              'You have the latest version!',
              'success'
            );
            $('button.software_updates_url_checknow').prop('disabled', false);
            FWI_Settings.focusActiveRow();
          }
        } else {
          FWI_Software.setCheckSoftwareMsg(
            'Error checking version, try again later',
            'error'
          );
          $('button.software_updates_url_checknow').prop('disabled', false);
          FWI_Settings.focusActiveRow();
        }
      },
      error: function() {
        FWI_Software.setCheckSoftwareMsg(
          'Error checking version, try again later',
          'error'
        );
        $('button.software_updates_url_checknow').prop('disabled', false);
      }
    });
  },

  // Summary: Register certain keys on the remote control.
  registerRemoteKeys: function() {
    // Bind Samsung SSP Keys.
    var supportedKey = tizen.tvinputdevice.getSupportedKeys();

    for (var i = 0; i < supportedKey.length; i++) {
      switch (supportedKey[i].name) {
        case 'Menu':
        case 'VolumeUp':
        case 'VolumeDown':
        case 'VolumeMute':
          break;
        default:
          tizen.tvinputdevice.registerKey(supportedKey[i].name);
          break;
      }
    }
  },
  /* Start SSSP */
  init: function() {
    FWI_App.log('FWI - SSP Loaded');

    loadSettings(SETTINGS_FILE_NAME, function(settings) {
      storedFWIServiceLogSettings = settings;
    });
    loadSettings(SETTINGS_CLOUD_LOGS_FILE_NAME, function(settings) {
      storedCloudLogSettings = settings;
    });
  },

  // SSSP can check its line status frequently, every 15 seconds
  onlineCheckFrequency: function() {
    return 15000;
  }
};

var SETTINGS_FILE_NAME = 'fwisettings.txt';
var SETTINGS_CLOUD_LOGS_FILE_NAME = 'fwicloudlogsettings.txt';

function loadSettings(filename, callback) {
  FWI_App.log({
    msg: 'Loading settings ...',
    level: 'DEBUG',
    preventStoring: true
  });

  function onSuccess(dir) {
    return function(files) {
      var settingsFile = files.find(function(file) {
        return file.name === filename;
      });
      var settings = {};

      if (settingsFile == null) {
        FWI_App.log({
          msg: 'Settings not found, creating...',
          level: 'DEBUG',
          preventStoring: true
        });
        settingsFile = dir.createFile(filename);
      }

      settingsFile.openStream(
        'r', // Read
        function(fs) {
          try {
            // Tizen throws an error if the file size is 0
            if (settingsFile.fileSize > 0) {
              var settingsContents = fs.read(settingsFile.fileSize);

              try {
                settings = Object.assign(
                  {},
                  settings,
                  JSON.parse(settingsContents)
                );
              } catch (err) {
                FWI_App.log({
                  msg:
                    'Failed to parse settings (' +
                    filename +
                    '): ' +
                    stringifyError(err),
                  level: 'ERROR',
                  preventStoring: true
                });
              }
            } else {
              FWI_App.log({
                msg: 'Settings (' + filename + ') are empty, initialize them',
                level: 'DEBUG',
                preventStoring: true
              });
            }
          } catch (error) {
            FWI_App.log({
              msg:
                'Failed to read settings (' +
                filename +
                '): ' +
                stringifyError(error),
              level: 'ERROR',
              preventStoring: true
            });
          }

          try {
            fs.close();
          } catch (err) {
            FWI_App.log({
              msg:
                'Failed to close file (' +
                filename +
                '):' +
                stringifyError(err),
              level: 'ERROR',
              preventStoring: true
            });
          }
          FWI_App.log({
            msg: 'Loaded settings: ' + JSON.stringify(settings),
            level: 'DEBUG',
            preventStoring: true
          });
          callback && callback(settings);
        },
        function(error) {
          FWI_App.log({
            msg: 'Failed to open settings: ' + error.message,
            level: 'ERROR',
            preventStoring: true
          });
        },
        'UTF-8'
      );
    };
  }

  function onError(error) {
    FWI_App.log({
      msg: 'List files error: ' + error.message,
      level: 'ERROR',
      preventStoring: true
    });
    callback && callback(error);
  }

  tizen.filesystem.resolve(
    'documents',
    function(dir) {
      dir.listFiles(onSuccess(dir), onError);
    },
    function(error) {
      FWI_App.log({
        msg: 'Filesystem resolve error: ' + error.message,
        level: 'ERROR',
        preventStoring: true
      });
      callback && callback(error);
    },
    'rw'
  );
}

function saveSettings(settingsValues, fileName, callback) {
  function onSuccess(dir) {
    return function(files) {
      var settingsFile = files.find(function(file) {
        return file.name === fileName;
      });

      if (settingsFile == null) {
        FWI_App.log({
          msg: 'Settings not found, creating...',
          level: 'DEBUG',
          preventStoring: true
        });
        try {
          settingsFile = dir.createFile(fileName);
        } catch (err) {
          // Overwrite is not allowed
          if (err.code == 0) {
            try {
              settingsFile = dir.resolve(fileName);
            } catch (err) {
              FWI_App.log({
                msg: 'Failed to resolve file: ' + stringifyError(err),
                level: 'ERROR',
                preventStoring: true
              });
            }
          } else {
            FWI_App.log({
              msg: 'Error creating settings: ' + stringifyError(err),
              level: 'ERROR',
              preventStoring: true
            });
          }
        }
      }

      settingsFile.openStream(
        'w', // Write
        function(fs) {
          try {
            fs.write(JSON.stringify(settingsValues));
          } catch (error) {
            FWI_App.log({
              msg: 'Failed to save settings: ' + stringifyError(error),
              level: 'ERROR',
              preventStoring: true
            });
            callback && callback(error);
          }

          fs.close();
          callback && callback();
        },
        function(error) {
          FWI_App.log({
            msg: 'Failed to open settings: ' + error.message,
            level: 'ERROR',
            preventStoring: true
          });
          callback && callback(error);
        },
        'UTF-8'
      );
    };
  }

  function onError(error) {
    FWI_App.log({
      msg: 'List files error: ' + error.message,
      level: 'ERROR',
      preventStoring: true
    });
    callback && callback(error);
  }

  tizen.filesystem.resolve(
    'documents',
    function(dir) {
      dir.listFiles(onSuccess(dir), onError);
    },
    function(error) {
      FWI_App.log({
        msg: 'Filesystem resolve error: ' + error.message,
        level: 'ERROR',
        preventStoring: true
      });
    },
    'w'
  );
}

function rotateBase64Image(base64Image, degrees, callback) {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');

  var image = new Image();

  image.onload = function() {
    switch (degrees) {
      case 90:
        canvas.setAttribute('width', image.height);
        canvas.setAttribute('height', image.width);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(image, 0, -image.height);
        break;
      case 180:
        canvas.setAttribute('width', image.width);
        canvas.setAttribute('height', image.height);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(image, -image.width, -image.height);
        break;
      case 270:
        canvas.setAttribute('width', image.height);
        canvas.setAttribute('height', image.width);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(image, -image.width, 0);
        break;
      case 0:
      default:
        canvas.setAttribute('width', image.width);
        canvas.setAttribute('height', image.height);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(image, 0, 0);
        break;
    }

    var binStr = atob(canvas.toDataURL('image/jpeg', 1.0).split(',')[1]),
      len = binStr.length,
      arr = new Uint8Array(len);

    for (var i = 0; i < len; i++) {
      arr[i] = binStr.charCodeAt(i);
    }

    callback && callback(new Blob([arr], { type: 'image/jpeg' }));
  };
  image.src = URL.createObjectURL(b64toBlob(base64Image));
}
