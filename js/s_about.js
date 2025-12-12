var FWI_About = {
  make: null,
  model: null,

  /* Load and refresh data */
  loadAboutData: function() {
    // FWI_App.log('About data refresh');

    HOST_DEVICE.getAboutData(function(data) {
      // FWI_App.log(
      //   'About data: ' + JSON.stringify(data),
      //   'DEBUG'
      // );

      if (data == null) {
        clearInterval(this._refreshHandle);
        $('.about_storage')
          .parent()
          .hide();
        $('.settings_about_separator.storage').hide();
      } else {
        if (data.storages == null) {
          $('.about_storage')
            .parent()
            .hide();
          $('.settings_about_separator.storage').hide();
        } else {
          FWI_About.setAboutValue(
            '.about_storage .about_storage_external',
            data.storages
          );
        }
      }
    });
  },

  /* Reload on tabs display */
  tabFocus: function() {
    FWI_App.log('Focus About', 'DEBUG');
    this.loadAboutData();
    // Refresh data every 5 seconds.
    this._refreshHandle = setInterval(
      $.proxy(function() {
        this.loadAboutData();
      }, this),
      5000
    );
  },

  tabUnfocus: function() {
    FWI_App.log('Unfocus About', 'DEBUG');
    clearInterval(this._refreshHandle);
    delete this._refreshHandle;
  },
  // Updates the MAC address in the dialog. If the MAC address could
  // not be retrieved, it will try again later.
  updateMacAddress: function() {
    var onSuccess = function(macAddress) {
      if (macAddress) {
        FWI_App.log('MACAddress: ' + macAddress);
        $('.about_network .wired_mac').html(macAddress);
        FWI_Hardware.MAC = macAddress;
        HOST_DEVICE.setSetting('mac', macAddress);

        /* Turn : into _ for the parsing issues */
        var hostName = FWI_Hardware.MAC || '';

        hostName = hostName.replace(/:/g, '_');
        FWI_Hardware.MACHost = hostName;
        HOST_DEVICE.setSetting('mac_host', hostName);
      } else {
        setTimeout(FWI_About.updateMacAddress, 20000); // Try again after 20 seconds.
      }
    };
    var onError = function(err) {
      FWI_App.log('Unable to get MAC address. Error: ' + err, 'ERROR');
      setTimeout(FWI_About.updateMacAddress, 20000); // Try again after 20 seconds.
    };

    HOST_DEVICE.getMACAddress(onSuccess, onError);
  },

  // Gets the current IP address.
  updateIpAddress: function() {
    var onSuccess = function(ipAddress) {
      if (ipAddress) {
        FWI_App.log('IP address: ' + ipAddress);

        $('.about_network .wired_ip').text(ipAddress);
        FWI_Hardware.IP = ipAddress;

        // Turn periods into underscores for the parsing issues.
        var hostName = FWI_Hardware.IP;

        hostName = hostName.replace(/\./g, '_');
        FWI_Hardware.IPHost = hostName;
        HOST_DEVICE.setSetting('ip_host', hostName);
      } else {
        setTimeout(FWI_About.updateIpAddress, 20000); // Try again after 20 seconds.
      }
    };
    var onError = function(err) {
      FWI_App.log('Unable to get IP address. Error: ' + err, 'ERROR');
      setTimeout(FWI_About.updateIpAddress, 20000); // Try again after 20 seconds.
    };

    HOST_DEVICE.getIPAddress(onSuccess, onError);
  },

  /* Get static About Data */
  getStaticData: function() {
    // Load Static About data
    FWI_App.log('User Agent: ' + navigator.userAgent);
    FWI_App.log('App Version: 1.9.1');
    FWI_About.updateMacAddress();
    FWI_About.updateIpAddress();
    HOST_DEVICE.getDisplayInfo();

    FWI_App.log('Setting static about values', 'DEBUG');
    HOST_DEVICE.getAboutInfo(function(aboutData) {
      FWI_App.log('Static about data: ' + JSON.stringify(aboutData), 'DEBUG');
      FWI_About.setAboutValue(
        '.about_platform .manufacturer',
        aboutData.manufacturer
      );
      FWI_About.setAboutValue('.about_platform .modelName', aboutData.model);
      FWI_About.setAboutValue(
        '.about_platform .hardwareVersion',
        aboutData.buildVersion
      );
      FWI_About.setAboutValue(
        '.about_platform .serialNumber',
        aboutData.serialNumber
      );
      FWI_Hardware.Serial = aboutData.serialNumber;
      HOST_DEVICE.setSetting('serial', aboutData.serialNumber);
      FWI_About.setAboutValue(
        '.about_platform .sdkVersion',
        aboutData.sdkVersion
      );

      if (aboutData.firmwareVersion) {
        HOST_DEVICE.setSetting(
          'fwi.device.fmVersion',
          aboutData.firmwareVersion
        );

        FWI_About.setAboutValue(
          '.about_platform .firmwareVersion',
          aboutData.firmwareVersion
        );
      }
    });
  },

  setAboutValue: function(selector, value) {
    if (value === undefined) {
      FWI_App.log(
        'About value "' + selector + '" is undefined, hiding',
        'DEBUG'
      );
      $(selector)
        .parent()
        .hide();
    } else {
      FWI_App.log('About value "' + selector + '" is: ' + value, 'DEBUG');
      $(selector).html(value);
    }
  },

  init: function() {
    FWI_App.log('Initializing About', 'DEBUG');
    // load static data
    this.getStaticData();

    // load dynamic data
    this.loadAboutData();
    FWI_App.log('About initialized', 'DEBUG');
  }
};
