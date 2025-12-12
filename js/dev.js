var FWI_Dev = {
  bindDevElements: function() {
    $('.signin_btn_lower.btn_reboot').on('click', function(e) {
      e.preventDefault();
      HOST_DEVICE.rebootDevice();
    });
    $('.signin_btn_lower.btn_consoleclear').on('click', function(e) {
      e.preventDefault();
      HOST_DEVICE.clearConsoleLog();
      FWI_App.log('FWI - Dev Console Cleared');
    });
    $('.signin_btn_lower.btn_reload').on('click', function() {
      HOST_DEVICE.reloadPlayer();
    });
  },

  init: function() {
    FWI_App.log('FWI - Dev Items Loaded');
    /* Bind Inputs */
    this.bindDevElements();
  }
};
