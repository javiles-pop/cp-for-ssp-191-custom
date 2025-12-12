var FWI_Validate = {
  validateTimeServerURL: function(url) {
    var pattern = /^(ntp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
    return url && pattern.test(url) ? true : false;
  },

  validateURL: function(url) {
    var pattern = /^(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
    if (url && pattern.test(url)) {
      return true;
    } else {
      return false;
    }
  },

  softwareTime: function(h1, h2, m1, m2) {
    return (
      (h1 == 1 && h2 < 3 && m1 < 6 && m2 >= 0) ||
      (h1 == 0 && h2 > 0 && m1 < 6 && m2 >= 0)
    );
  },

  validateTime4: function(h1, h2, m1, m2) {
    return (
      (h1 == 1 && h2 < 3 && m1 < 6 && m2 >= 0) ||
      (h1 == 0 && h2 > 0 && m1 < 6 && m2 >= 0)
    );
  },

  validateTime6: function(h1, h2, m1, m2, s1, s2) {
    return (
      (h1 == 1 && h2 < 3 && m1 < 6 && m2 >= 0 && s1 < 6 && s2 >= 0) ||
      (h1 == 0 && h2 > 0 && m1 < 6 && m2 >= 0 && s1 < 6 && s2 >= 0)
    );
  },

  // Validates the given time span and returns whether it's at least 30 seconds in total.
  validateTime6Int: function(h1, h2, m1, m2, s1, s2) {
    if (
      $.isNumeric(h1) &&
      $.isNumeric(h2) &&
      $.isNumeric(m1) &&
      $.isNumeric(m2) &&
      $.isNumeric(s1) &&
      $.isNumeric(s2) &&
      (m1 < 6 && m2 && s1 < 6 && s2 >= 0)
    ) {
      var totalSeconds = 0;
      var hours = parseInt(h1.toString() + h2, 10);
      var minutes = parseInt(m1.toString() + m2, 10);
      var seconds = parseInt(s1.toString() + s2, 10);

      totalSeconds += hours * 60 * 60 + minutes * 60 + seconds;

      if (totalSeconds >= 30) {
        return true;
      } else {
        FWI_App.log('Timer Error: value less than 30 seconds.');
      }
    }

    return false;
  }
};
