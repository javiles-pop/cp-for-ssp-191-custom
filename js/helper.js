var FWI_Helper = {
  // Summary: Use to prefix encrypted values, so we know the value is encrypted.
  encryptionPrefix: 'FWI1\u0007',

  // Summary: Encodes the given text as HTML.
  encodeHtml: function(text) {
    return text
      ? $('<div/>')
          .text(text)
          .html()
      : text;
  },

  // Summary: Encrypts the given value using the given key.
  encrypt: function(value, key) {
    if (value) {
      value =
        FWI_Helper.encryptionPrefix +
        CryptoJS.AES.encrypt(value, key).toString();
    }

    return value;
  },

  // Summary: Decrypts the given value using the given key.
  decrypt: function(value, key) {
    if (value && value.indexOf(FWI_Helper.encryptionPrefix) === 0) {
      try {
        value = CryptoJS.AES.decrypt(
          value.substr(FWI_Helper.encryptionPrefix.length),
          key
        ).toString(CryptoJS.enc.Utf8);
      } catch (err) {
        // Ignore error.
      }
    }
    return value;
  },

  /* Misc Functions (Date/Filesize) */
  bytesToSize: function(bytes) {
    bytes = parseInt(bytes);

    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    if (bytes == 0) {
      return '0 Byte';
    }

    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));

    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  },

  byteSize: function(a, b) {
    if (0 === a) {
      return '0 Bytes';
    }

    var c = 1024,
      d = b || 2,
      e = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
      f = Math.floor(Math.log(a) / Math.log(c));

    return parseFloat((a / Math.pow(c, f)).toFixed(d)) + ' ' + e[f];
  },
  /* Sidebar timestamp + Update function timestamp */
  getTimestamp: function(hasDate) {
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];

    var date = hasDate || HOST_DEVICE.getTime();
    var month = date.getMonth();
    var day = date.getDate();
    var weekday = days[date.getDay()];
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;

    var strTime =
      weekday +
      ', ' +
      monthNames[month].substring(0, 3) +
      ' ' +
      day +
      ', ' +
      hours +
      ':' +
      minutes +
      ' ' +
      ampm;

    return strTime;
  },
  /* Ex: 2018-04-06T15:33:47.436Z */
  getDateIsoStr: function() {
    return HOST_DEVICE.getTime().toISOString();
  },

  getDateIsoEditStr: function() {
    var whentaken = HOST_DEVICE.getTime()
      .toISOString()
      .slice(0, -5);

    whentaken = whentaken + '-06:00';

    return whentaken;
  },

  getDateIsoStr0000Z: function() {
    return (
      HOST_DEVICE.getTime()
        .toISOString()
        .slice(0, -1) + '0000Z'
    );
  },

  getDateIso0000Offset: function() {
    var whentaken = HOST_DEVICE.getTime()
      .toISOString()
      .slice(0, -1);

    whentaken = whentaken + '0000-00:00';

    return whentaken;
  },

  formatAMPM: function(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12;
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;

    var strTime = hours + ':' + minutes + ' ' + ampm;

    return strTime;
  },

  time24to12: function(time24) {
    var ts = time24;
    var H = +ts.substr(0, 2);
    var h = H % 12 || 12;

    h = h < 10 ? '0' + h : h;

    var ampm = H < 12 ? ' AM' : ' PM';

    ts = h + ts.substr(2, 3) + ampm;

    return ts;
  },

  /* ex: 16:20:00 */
  time12to24: function(time12) {
    if (!time12) return null;
    if (time12.match(/AM|PM/i)) {
      // is the hour greater than 12?
      var h = time12.substring(0, time12.indexOf(':'));
      var m = time12.substring(
        time12.indexOf(':') + 1,
        time12.indexOf(':') + 3
      );
      var meridiem = time12.match(/AM/i) ? 'AM' : 'PM';

      if (meridiem === 'PM' && h < 12) {
        h = parseInt(h) + 12;
      }
      if (meridiem === 'AM' && h == 12) {
        h = '00';
      }

      time12 = h + ':' + m + ':00';
      return time12
        .replace('AM', '')
        .replace('PM', '')
        .trim();
    }
    return time12;
  },

  time12toIso: function(time12) {
    var hours = Number(time12.match(/^(\d+)/)[1]);
    var minutes = Number(time12.match(/:(\d+)/)[1]);
    var AMPM = time12.match(/\s(.*)$/)[1];

    if (AMPM === 'PM' && hours < 12) {
      hours = hours + 12;
    } else if (AMPM === 'AM' && hours === 12) {
      hours = hours - 12;
    }

    var sHours = hours.toString();
    var sMinutes = minutes.toString();

    if (hours < 10) {
      sHours = '0' + sHours;
    }

    if (minutes < 10) {
      sMinutes = '0' + sMinutes;
    }

    return new Date(new Date().setHours(sHours, sMinutes, 0, 0))
      .toISOString()
      .slice(0, -5);
  },

  time12toIsoLocal: function(time12) {
    var hours = Number(time12.match(/^(\d+)/)[1]);
    var minutes = Number(time12.match(/:(\d+)/)[1]);
    var AMPM = time12.match(/\s(.*)$/)[1];

    if (AMPM == 'PM' && hours < 12) {
      hours = hours + 12;
    } else if (AMPM == 'AM' && hours == 12) {
      hours = hours - 12;
    }

    var sHours = hours.toString();
    var sMinutes = minutes.toString();

    if (hours < 10) {
      sHours = '0' + sHours;
    }

    if (minutes < 10) {
      sMinutes = '0' + sMinutes;
    }

    var localDate = new Date().toISOString().slice(0, -13);

    localDate = localDate + sHours + ':' + sMinutes + ':00';

    return localDate;
  },

  time12toIso0000Offset: function(time12) {
    var hours = Number(time12.match(/^(\d+)/)[1]);
    var minutes = Number(time12.match(/:(\d+)/)[1]);
    var AMPM = time12.match(/\s(.*)$/)[1];

    if (AMPM == 'PM' && hours < 12) {
      hours = hours + 12;
    } else if (AMPM == 'AM' && hours == 12) {
      hours = hours - 12;
    }

    var sHours = hours.toString();
    var sMinutes = minutes.toString();

    if (hours < 10) {
      sHours = '0' + sHours;
    }

    if (minutes < 10) {
      sMinutes = '0' + sMinutes;
    }

    var addOffset = new Date(new Date().setHours(sHours, sMinutes, 0, 0))
      .toISOString()
      .slice(0, -1);

    return addOffset + '0000-00:00';
  },

  // Summary: Returns the number of seconds after midnight represented by the given time stamp
  //          on the format "hh:mm (A/P)M"
  time12ToSecondsAfterMidnight: function(time12) {
    var hours = Number(time12.match(/^(\d+)/)[1]);
    var minutes = Number(time12.match(/:(\d+)/)[1]);
    var AMPM = time12.match(/\s(.*)$/)[1];

    if (AMPM === 'PM' && hours < 12) {
      hours = hours + 12;
    } else if (AMPM === 'AM' && hours === 12) {
      hours = hours - 12;
    }

    return hours * 60 * 60 + minutes * 60;
  },

  // Summary: Converts the given number representing the number of seconds after midnight
  //          to a string on the form "hh:mm (A/P)M". It rounds the time to the closest
  //          minute.
  secondsAfterMidnightToTime12: function(seconds) {
    var hours = Math.floor(seconds / 3600);
    var remainder = seconds - hours * 3600;
    var minutes = Math.round(remainder / 60);

    if (minutes === 60) {
      ++hours;
      minutes = 0;
    }

    var amPm = hours >= 12 ? 'PM' : 'AM';

    if (hours > 12) {
      hours -= 12;
    }

    return (
      (hours < 10 ? '0' : '') +
      hours.toString() +
      ':' +
      (minutes < 10 ? '0' : '') +
      minutes.toString() +
      ' ' +
      amPm
    );
  },

  hourMinSecToSeconds: function(time) {
    if (!time) {
      return 0;
    }

    var a = time.split(':');
    var seconds = +a[0] * 60 * 60 + +a[1] * 60 + +a[2];

    return seconds;
  },

  getWeekDay: function(hasDate) {
    var date;

    if (hasDate) {
      date = hasDate;
    } else {
      date = HOST_DEVICE.getTime();
    }

    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return days[date.getDay()];
  },

  getYyyyMmDd: function(hasDate) {
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

    return yyyy + '-' + mm + '-' + dd;
  },
  // customjs Date functions
  processTimerDays: function(days) {
    var bitWise = 0;
    var dayStr = $.trim(days.replace(/ /g, ''));
    var dayVal = {
      mo: 1,
      tu: 2,
      we: 4,
      th: 8,
      fr: 16,
      sa: 32,
      su: 64
    };
    var dayArr = dayStr.split(',');

    $(dayArr).each(function() {
      bitWise += dayVal[this.toLowerCase()];
    });

    return bitWise;
  },
  // Summary: Returns the number of ticks corresponding to the given value in seconds to ticks.
  secondsToTicks: function(seconds) {
    var ticks = 0;

    if (seconds) {
      ticks = seconds * 10000000;
    }

    return ticks;
  },
  /* Encode string for XML node */
  encodeForXML: function(string) {
    return string
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  },

  insertOrReplaceQueryParam: function(key, value, url) {
    if (value == null) {
      value = '';
    }
    if (url) {
      var pattern = new RegExp('\\b(' + key + '=).*?(&|#|$)');
      if (url.search(pattern) >= 0) {
        return url.replace(pattern, '$1' + value + '$2');
      }
      url = url.replace(/[?#]$/, '');
      return url + (url.indexOf('?') > 0 ? '&' : '?') + key + '=' + value;
    }
    return url;
  },

  removeQueryParam: function(key, url) {
    if (key == null) {
      return url;
    }

    var urlParts = url.split('?');

    if (urlParts.length === 1) {
      return url;
    }

    var queryParams = urlParts[1].split('&');

    return queryParams.reduce(function(finalUrl, param) {
      var paramParts = param.split('=');
      if (paramParts[0] === key) {
        return finalUrl;
      } else {
        return FWI_Helper.insertOrReplaceQueryParam(
          paramParts[0],
          paramParts[1],
          finalUrl
        );
      }
    }, urlParts[0]);
  },

  /* Removes unnecessary query params from UI elements in Cloud / Shadow */
  getUserFacingURL: function(url) {
    if (!url) {
      return '';
    }

    var dirtyStrings = [
      '_',
      'v',
      '_fwi',
      '_fwi_cloudCompanyId',
      '_fwi_accessToken',
      'width',
      'height'
    ];

    dirtyStrings.map(function(queryParam) {
      url = FWI_Helper.removeQueryParam(queryParam, url);
    });

    return url;
  },

  timeStringToDate: function(timeString) {
    if (!timeString) {
      return new Date();
    }
    var now = new Date();
    var date = new Date();
    var parts = timeString.match(/(\d{0,2}):(\d{0,2}) (AM|PM)/i);
    if (parts && parts.length >= 4) {
      var meridiem = parts[3];
      var m = parseInt(parts[2]);
      var h =
        parseInt(parts[1]) === 12 && meridiem === 'AM' ? 0 : parseInt(parts[1]);
      h = meridiem === 'PM' && h !== 12 ? h + 12 : h;
      date.setHours(h);
      date.setMinutes(m);
      // if the time has already passed, assume we mean tomorrow.
      date = date < now ? dateFns.addDays(date, 1) : date;
      date.setSeconds(0);

      return date;
    }
  },

  /*==========================//
  // Shadow Helper Functions //
  //=========================*/

  /**
   * @description takes an array of strings with full names of days of week and returns bitwise Int values corresponding to day. To be used in place of FWI_Hardware.extractDays().
   * @param {Array<string>} dayStrArray ex: ['Monday', 'Tuesday', 'Wednesday' ... ];
   * @returns {string} ex: 'Mon, Tue, Wed, Thur
   */
  convertDayofWeekStrings: function(dayStrArray) {
    if (dayStrArray.length === 7) {
      return 'Everyday';
    }
    var returnVal = [];
    dayStrArray.map(function(day) {
      // limit to first 3 chars; add ', '
      returnVal.push(day.substring(0, 3) + ', ');
    });

    return returnVal.join('').replace(/, +$/, '');
  },

  /**
   * @description takes an array of strings with full names of days of week and returns bitwise Int value corresponding to days. To be used in FWI_Hardware.extractDays().
   * @param {Array<string>} dayStrArray ex: ['Monday', 'Tuesday', 'Wednesday' ... ];
   * @returns {Number} ex: bitwise integer value that describes days of week for some reason.
   */
  convertDayofWeekArraytoBitwise: function(dayStrArray) {
    if (dayStrArray.length === 7) {
      return 127;
    }
    var bitwiseVal = 0;
    dayStrArray.map(function(day) {
      day = day.toUpperCase();
      switch (day) {
        case 'MONDAY':
          bitwiseVal += 1;
          break;
        case 'TUESDAY':
          bitwiseVal += 2;
          break;
        case 'WEDNESDAY':
          bitwiseVal += 4;
          break;
        case 'THURSDAY':
          bitwiseVal += 8;
          break;
        case 'FRIDAY':
          bitwiseVal += 16;
          break;
        case 'SATURDAY':
          bitwiseVal += 32;
          break;
        case 'SUNDAY':
          bitwiseVal += 64;
          break;
        case 'FRAPTUIOUSDAY':
          // lol jk.
          break;
        default:
          FWI_App.log(
            'bad value:' +
              day +
              ' in FWI_Helper.convertDayofWeekArraytoBitwise()',
            'ERROR'
          );
          break;
      }
    });
    return bitwiseVal;
  },

  /**
   * @returns {Array<string>} array of strings containing the full names of each weekday. returns array of all 7 days if indicates 'Everyday';
   */
  enumerateDayStrings: function(dayStr) {
    /* enum */
    var weekdays = {
      MON: 'MONDAY',
      TUE: 'TUESDAY',
      WED: 'WEDNESDAY',
      THU: 'THURSDAY',
      FRI: 'FRIDAY',
      SAT: 'SATURDAY',
      SUN: 'SUNDAY'
    };

    var days = [];

    // if everyday, we actually need to return every day in an array.
    if (dayStr.indexOf('Everyday') !== -1) {
      return Object.keys(weekdays).map(function(key) {
        return weekdays[key];
      });
    }
    // otherwise we need to split this up.
    var asArray = dayStr.split(', ');

    // key : value lookup
    asArray.map(function(day) {
      day = day.toUpperCase();
      if (weekdays.hasOwnProperty(day)) {
        days.push(weekdays[day].toUpperCase());
      }
    });
    return days;
  },

  /**
   * @description converts timer object format used by shim to format used by device shadow.
   * @param {Object<ShimTimer>} onOffTimers {on: timeObj, off: timeObj, week: bitwiseInt, dayStr: String}
   * @returns {Object<ShadowTimer>} {days: Array<String>, onTime: timeString, offTime: timeString}
   */
  formatTimersForShadow: function(onOffTimers) {
    if (typeof onOffTimers === 'string') {
      try {
        onOffTimers = JSON.parse(onOffTimers);
      } catch (error) {
        FWI_App.log(
          'FAILED to parse On/Off Timers as string when formatting for the shadow:',
          'ERROR'
        );
      }
    }

    if (onOffTimers && onOffTimers.length > 0) {
      return onOffTimers.map(function(timerObj) {
        // create the structure for the return type.
        var formattedTimer = {
          days: [],
          onTime: '',
          offTime: ''
        };

        // format the hour and minute values is they're less than 10.
        var fmtTime = function(t) {
          return parseInt(t) < 10 ? '0' + t : t;
        };

        // hydrate the object.
        formattedTimer.days = FWI_Helper.enumerateDayStrings(timerObj.dayStr);

        formattedTimer.onTime =
          fmtTime(timerObj.on.hour) + ':' + fmtTime(timerObj.on.minute) + ':00';

        formattedTimer.offTime =
          fmtTime(timerObj.off.hour) +
          ':' +
          fmtTime(timerObj.off.minute) +
          ':00';
        return formattedTimer;
      });
    }
    return [];
  },

  /**
   * @description converts timer object format used by Cloud to format used by device.
   * @param {Object<ShadowTimer>} {days: Array<String>, onTime: timeString, offTime: timeString}
   * @returns {Object<ShimTimer>} onOffTimers {on: timeObj, off: timeObj, week: bitwiseInt, dayStr: String}
   */
  formatTimersForDevice: function(shadowTimers) {
    var formattedTimers = [];

    shadowTimers.map(function(sTimer) {
      var newTimer = {};
      var off12h = FWI_Helper.time24to12(sTimer.offTime);
      var on12h = FWI_Helper.time24to12(sTimer.onTime);

      newTimer.on = {
        hour: parseInt(sTimer.onTime.substring(0, 2)),
        minute: parseInt(sTimer.onTime.substring(3, 5)),
        week: FWI_Helper.convertDayofWeekArraytoBitwise(sTimer.days),
        dupeCheck: FWI_Helper.weekdayArrayToDayStr(sTimer.days) + '|' + on12h
      };

      newTimer.off = {
        hour: parseInt(sTimer.offTime.substring(0, 2)),
        minute: parseInt(sTimer.offTime.substring(3, 5)),
        week: FWI_Helper.convertDayofWeekArraytoBitwise(sTimer.days),
        dupeCheck: FWI_Helper.weekdayArrayToDayStr(sTimer.days) + '|' + off12h
      };

      newTimer.week = FWI_Helper.convertDayofWeekArraytoBitwise(sTimer.days);

      newTimer.dayStr = FWI_Helper.weekdayArrayToDayStr(sTimer.days);

      formattedTimers.push(newTimer);
    });

    return formattedTimers;
  },

  /**
   * Takes an array of weekday string names and turns it into the goofy-ass format used by devices.
   * @param {Array<String>} [ 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
   * @returns {String} 'Mon, Tue, Wed, Thu, Fri'
   */
  weekdayArrayToDayStr: function(weekdays) {
    var shortenedDays = weekdays.map(function(day) {
      // first 3 chars
      day = day.toLowerCase().slice(0, 3);
      // capitalize first letter
      return day.charAt(0).toUpperCase() + day.slice(1);
    });
    // csv
    return shortenedDays.join(', ');
  },

  /**
   * Takes something that should be easy and complicates it a little more
   * @param {String} timezone 'MST'
   * @returns {String} 'MST - US Mountain Time'
   */
  convertTimeZoneForShadow: function(timezone) {
    switch (timezone) {
      case 'EST':
        return 'EST - US Eastern Time';
      case 'CST':
        return 'CST - US Central Time';
      case 'MST':
        return 'MST - US Mountain Time';
      case 'PST':
        return 'PST - US Pacific Time';
      case 'AKST':
        return 'AKST - Alaska Time';
      case 'HST':
        return 'HST - Hawaii - Aleutian Time without Daylight Saving Time (Hawaii)';
      case 'HST1':
        return 'HST1 - Hawaii - Aleutian Time with Daylight Saving Time';
      case 'MST1':
        return 'MST1 - US Mountain Time without Daylight Saving Time (Arizona)';
      case 'EST1':
        return 'EST1 - US Eastern Time without Daylight Saving Time (East Indiana)';
      case 'AST':
        return 'AST - Atlantic Time';
      case 'CST2':
        return 'CST2 - Mexico (Mexico City)';
      case 'MST2':
        return 'MST2 - Mexico (Chihuahua)';
      case 'PST2':
        return 'PST2 - Mexico (Tijuana)';
      case 'BRT':
        return 'BRT - Brazil Time (São Paulo)';
      case 'NST':
        return 'NST - Newfoundland Time';
      case 'AZOT':
        return 'AZOT - Azores Time';
      case 'GMTBST':
        return 'GMTBST - London / Dublin Time';
      case 'WET':
        return 'WET - Western European Time (Lisbon)';
      case 'CET':
        return 'CET - Central European Time (Copenhagen, Berlin, Paris)';
      case 'EET':
        return 'EET - Eastern European Time (Helsinki)';
      case 'MSK':
        return 'MSK - Moscow Time';
      case 'SAMT':
        return 'SAMT - Delta Time Zone (Samara)';
      case 'YEKT':
        return 'YEKT - Echo Time Zone (Yekaterinburg)';
      case 'IST':
        return 'IST - Indian Standard Time';
      case 'NPT':
        return 'NPT - Nepal Time';
      case 'OMST':
        return 'OMST - Foxtrot Time Zone (Omsk)';
      case 'JST':
        return 'JST - Japanese Standard Time';
      case 'CXT':
        return 'CXT - Christmas Island Time (Australia)';
      case 'AWST':
        return 'AWST - Australian Western Time with Daylight Saving Time';
      case 'AWST1':
        return 'AWST1 - Australian Western Time without Daylight Saving Time';
      case 'ACST':
        return 'ACST - Australian Central Standard Time (CST) with Daylight Saving Time';
      case 'ACST1':
        return 'ACST1 - Darwin, Australia and Australian Central Standard Time (CST) without Daylight Saving Time';
      case 'AEST':
        return 'AEST - Australian Eastern Time with Daylight Saving Time';
      case 'AEST1':
        return 'AEST1 - Australian Eastern Time without Daylight Saving Time (Brisbane)';
      case 'NFT':
        return 'NFT - Norfolk (Island) Time (Australia)';
      case 'NZST':
        return 'NZST - New Zealand Time (Auckland)';
      case 'CHAST':
        return 'CHAST - Fiji Time, Fiji, Pacific / Fiji, Yankee Time Zone (Fiji)';
      case 'SST':
        return 'SST - X-ray Time Zone (Pago Pago)';
      case 'GMT':
        return 'GMT - Greenwich Mean Time';
      case 'GMT-1':
        return 'GMT-1 - 1 hour behind Greenwich Mean Time';
      case 'GMT-2':
        return 'GMT-2 - 2 hours behind Greenwich Mean Time';
      case 'GMT-3':
        return 'GMT-3 - 3 hours behind Greenwich Mean Time';
      case 'GMT-3:30':
        return 'GMT-3: 30 - 3.5 hours behind Greenwich Mean Time';
      case 'GMT-4':
        return 'GMT-4 - 4 hours behind Greenwich Mean Time';
      case 'GMT-4:30':
        return 'GMT-4: 30 - 4.5 hours behind Greenwich Mean Time';
      case 'GMT-5':
        return 'GMT-5 - 5 hours behind Greenwich Mean Time';
      case 'GMT-6':
        return 'GMT-6 - 6 hours behind Greenwich Mean Time';
      case 'GMT-7':
        return 'GMT-7 - 7 hours behind Greenwich Mean Time';
      case 'GMT-8':
        return 'GMT-8 - 8 hours behind Greenwich Mean Time';
      case 'GMT-9':
        return 'GMT-9 - 9 hours behind Greenwich Mean Time';
      case 'GMT-9:30':
        return 'GMT-9: 30 - 9.5 hours behind Greenwich Mean Time';
      case 'GMT-10':
        return 'GMT-10 - 10 hours behind Greenwich Mean Time';
      case 'GMT-11':
        return 'GMT-11 - 11 hours behind Greenwich Mean Time';
      case 'GMT-12':
        return 'GMT-12 - 12 hours behind Greenwich Mean Time';
      case 'GMT-13':
        return 'GMT-13 - 13 hours behind Greenwich Mean Time';
      case 'GMT-14':
        return 'GMT-14 - 14 hours behind Greenwich Mean Time';
      case 'GMT+1':
        return 'GMT+1 - 1 hour ahead of Greenwich Mean Time';
      case 'GMT+2':
        return 'GMT+2 - 2 hours ahead of Greenwich Mean Time';
      case 'GMT+3':
        return 'GMT+3 - 3 hours ahead of Greenwich Mean Time';
      case 'GMT+3:30':
        return 'GMT+3: 30 - 3.5 hours ahead of Greenwich Mean Time';
      case 'GMT+4':
        return 'GMT+4 - 4 hours ahead of Greenwich Mean Time';
      case 'GMT+4:30':
        return 'GMT+4: 30 - 4.5 hours ahead of Greenwich Mean Time';
      case 'GMT+5':
        return 'GMT+5 - 5 hours ahead of Greenwich Mean Time';
      case 'GMT+5:30':
        return 'GMT+5: 30 - 5.5 hours ahead of Greenwich Mean Time';
      case 'GMT+6':
        return 'GMT+6 - 6 hours ahead of Greenwich Mean Time';
      case 'GMT+6:30':
        return 'GMT+6: 30 - 6.5 hours ahead of Greenwich Mean Time';
      case 'GMT+7':
        return 'GMT+7 - 7 hours ahead of Greenwich Mean Time';
      case 'GMT+7:30':
        return 'GMT+7: 30 - 7.5 hours ahead of Greenwich Mean Time';
      case 'GMT+8':
        return 'GMT+8 - 8 hours ahead of Greenwich Mean Time';
      case 'GMT+8:30':
        return 'GMT+8: 30 - 8.5 hours ahead of Greenwich Mean Time';
      case 'GMT+9':
        return 'GMT+9 - 9 hours ahead of Greenwich Mean Time';
      case 'GMT+9:30':
        return 'GMT+9: 30 - 9.5 hours ahead of Greenwich Mean Time';
      case 'GMT+10':
        return 'GMT+10 - 10 hours ahead of Greenwich Mean Time';
      case 'GMT+10:30':
        return 'GMT+10: 30 - 10.5 hours ahead of Greenwich Mean Time';
      case 'GMT+11':
        return 'GMT+11 - 11 hours ahead of Greenwich Mean Time';
      case 'GMT+11:30':
        return 'GMT+11: 30 - 11.5 hours ahead of Greenwich Mean Time';
      case 'GMT+12':
        return 'GMT+12 - 12 hours ahead of Greenwich Mean Time';
      case 'GMT+12:30':
        return 'GMT+12: 30 - 12.5 hours ahead of Greenwich Mean Time';
      case 'GMT+13':
        return 'GMT+13 - 13 hours ahead of Greenwich Mean Time';
      case 'GMT+14':
        return 'GMT+14 - 14 hours ahead of Greenwich Mean Time';
      default:
        return 'MST - US Mountain Time';
    }
  },

  /**
   * Takes a device orientation string and turns it into a shadow friendly string.
   * @param {String} orientation  e.g DEGREE_90
   * @returns {String} orientation e.g. 90 Degrees
   */
  convertOrientationForShadow: function(orientation) {
    switch (orientation) {
      case '90 Degrees':
      case 90:
      case 'DEGREE_90':
      case 'PORTRAIT':
        return '90 Degrees';

      case '180 Degrees':
      case 180:
      case 'DEGREE_180':
        return '180 Degrees';

      case '270 Degrees':
      case 270:
      case 'DEGREE_270':
        return '270 Degrees';

      case 'LANDSCAPE':
      case 0:
      case 'DEGREE_0':
      default:
        return '0 Degrees';
    }
  },

  /**
   * Takes a device orientation string and turns it into a shadow friendly string.
   * @param {String} orientation e.g. 90 Degrees
   * @returns {String} orientation  e.g DEGREE_90
   */
  convertTimeZoneForDevice: function(timezone) {
    switch (timezone) {
      case 'EST - US Eastern Time':
        return 'EST';
      case 'CST - US Central Time':
        return 'CST';
      case 'MST - US Mountain Time':
        return 'MST';
      case 'PST - US Pacific Time':
        return 'PST';
      case 'AKST - Alaska Time':
        return 'AKST';
      case 'HST - Hawaii - Aleutian Time without Daylight Saving Time (Hawaii)':
        return 'HST';
      case 'HST1 - Hawaii - Aleutian Time with Daylight Saving Time':
        return 'HST1';
      case 'MST1 - US Mountain Time without Daylight Saving Time (Arizona)':
        return 'MST1';
      case 'EST1 - US Eastern Time without Daylight Saving Time (East Indiana)':
        return 'EST1';
      case 'AST - Atlantic Time':
        return 'AST';
      case 'CST2 - Mexico (Mexico City)':
        return 'CST2';
      case 'MST2 - Mexico (Chihuahua)':
        return 'MST2';
      case 'PST2 - Mexico (Tijuana)':
        return 'PST2';
      case 'BRT - Brazil Time (São Paulo)':
        return 'BRT';
      case 'NST - Newfoundland Time':
        return 'NST';
      case 'AZOT - Azores Time':
        return 'AZOT';
      case 'GMTBST - London / Dublin Time':
        return 'GMTBST';
      case 'WET - Western European Time (Lisbon)':
        return 'WET';
      case 'CET - Central European Time (Copenhagen, Berlin, Paris)':
        return 'CET';
      case 'EET - Eastern European Time (Helsinki)':
        return 'EET';
      case 'MSK - Moscow Time':
        return 'MSK';
      case 'SAMT - Delta Time Zone (Samara)':
        return 'SAMT';
      case 'YEKT - Echo Time Zone (Yekaterinburg)':
        return 'YEKT';
      case 'IST - Indian Standard Time':
        return 'IST';
      case 'NPT - Nepal Time':
        return 'NPT';
      case 'OMST - Foxtrot Time Zone (Omsk)':
        return 'OMST';
      case 'JST - Japanese Standard Time':
        return 'JST';
      case 'CXT - Christmas Island Time (Australia)':
        return 'CXT';
      case 'AWST - Australian Western Time with Daylight Saving Time':
        return 'AWST';
      case 'AWST1 - Australian Western Time without Daylight Saving Time':
        return 'AWST1';
      case 'ACST - Australian Central Standard Time (CST) with Daylight Saving Time':
        return 'ACST';
      case 'ACST1 - Darwin, Australia and Australian Central Standard Time (CST) without Daylight Saving Time':
        return 'ACST1';
      case 'AEST - Australian Eastern Time with Daylight Saving Time':
        return 'AEST';
      case 'AEST1 - Australian Eastern Time without Daylight Saving Time (Brisbane)':
        return 'AEST1';
      case 'NFT - Norfolk (Island) Time (Australia)':
        return 'NFT';
      case 'NZST - New Zealand Time (Auckland)':
        return 'NZST';
      case 'CHAST - Fiji Time, Fiji, Pacific / Fiji, Yankee Time Zone (Fiji)':
        return 'CHAST';
      case 'SST - X-ray Time Zone (Pago Pago)':
        return 'SST';
      case 'GMT - Greenwich Mean Time':
        return 'GMT';
      case 'GMT-1 - 1 hour behind Greenwich Mean Time':
        return 'GMT-1';
      case 'GMT-2 - 2 hours behind Greenwich Mean Time':
        return 'GMT-2';
      case 'GMT-3 - 3 hours behind Greenwich Mean Time':
        return 'GMT-3';
      case 'GMT-3: 30 - 3.5 hours behind Greenwich Mean Time':
        return 'GMT-3:30';
      case 'GMT-4 - 4 hours behind Greenwich Mean Time':
        return 'GMT-4';
      case 'GMT-4: 30 - 4.5 hours behind Greenwich Mean Time':
        return 'GMT-4:30';
      case 'GMT-5 - 5 hours behind Greenwich Mean Time':
        return 'GMT-5';
      case 'GMT-6 - 6 hours behind Greenwich Mean Time':
        return 'GMT-6';
      case 'GMT-7 - 7 hours behind Greenwich Mean Time':
        return 'GMT-7';
      case 'GMT-8 - 8 hours behind Greenwich Mean Time':
        return 'GMT-8';
      case 'GMT-9 - 9 hours behind Greenwich Mean Time':
        return 'GMT-9';
      case 'GMT-9: 30 - 9.5 hours behind Greenwich Mean Time':
        return 'GMT-9:30';
      case 'GMT-10 - 10 hours behind Greenwich Mean Time':
        return 'GMT-10';
      case 'GMT-11 - 11 hours behind Greenwich Mean Time':
        return 'GMT-11';
      case 'GMT-12 - 12 hours behind Greenwich Mean Time':
        return 'GMT-12';
      case 'GMT-13 - 13 hours behind Greenwich Mean Time':
        return 'GMT-13';
      case 'GMT-14 - 14 hours behind Greenwich Mean Time':
        return 'GMT-14';
      case 'GMT+1 - 1 hour ahead of Greenwich Mean Time':
        return 'GMT+1';
      case 'GMT+2 - 2 hours ahead of Greenwich Mean Time':
        return 'GMT+2';
      case 'GMT+3 - 3 hours ahead of Greenwich Mean Time':
        return 'GMT+3';
      case 'GMT+3: 30 - 3.5 hours ahead of Greenwich Mean Time':
        return 'GMT+3:30';
      case 'GMT+4 - 4 hours ahead of Greenwich Mean Time':
        return 'GMT+4';
      case 'GMT+4: 30 - 4.5 hours ahead of Greenwich Mean Time':
        return 'GMT+4:30';
      case 'GMT+5 - 5 hours ahead of Greenwich Mean Time':
        return 'GMT+5';
      case 'GMT+5: 30 - 5.5 hours ahead of Greenwich Mean Time':
        return 'GMT+5:30';
      case 'GMT+6 - 6 hours ahead of Greenwich Mean Time':
        return 'GMT+6';
      case 'GMT+6: 30 - 6.5 hours ahead of Greenwich Mean Time':
        return 'GMT+6:30';
      case 'GMT+7 - 7 hours ahead of Greenwich Mean Time':
        return 'GMT+7';
      case 'GMT+7: 30 - 7.5 hours ahead of Greenwich Mean Time':
        return 'GMT+7:30';
      case 'GMT+8 - 8 hours ahead of Greenwich Mean Time':
        return 'GMT+8';
      case 'GMT+8: 30 - 8.5 hours ahead of Greenwich Mean Time':
        return 'GMT+8:30';
      case 'GMT+9 - 9 hours ahead of Greenwich Mean Time':
        return 'GMT+9';
      case 'GMT+9: 30 - 9.5 hours ahead of Greenwich Mean Time':
        return 'GMT+9:30';
      case 'GMT+10 - 10 hours ahead of Greenwich Mean Time':
        return 'GMT+10';
      case 'GMT+10: 30 - 10.5 hours ahead of Greenwich Mean Time':
        return 'GMT+10:30';
      case 'GMT+11 - 11 hours ahead of Greenwich Mean Time':
        return 'GMT+11';
      case 'GMT+11: 30 - 11.5 hours ahead of Greenwich Mean Time':
        return 'GMT+11:30';
      case 'GMT+12 - 12 hours ahead of Greenwich Mean Time':
        return 'GMT+12';
      case 'GMT+12: 30 - 12.5 hours ahead of Greenwich Mean Time':
        return 'GMT+12:30';
      case 'GMT+13 - 13 hours ahead of Greenwich Mean Time':
        return 'GMT+13';
      case 'GMT+14 - 14 hours ahead of Greenwich Mean Time':
        return 'GMT+14';
      default:
        return 'MST';
    }
  },

  /**
   * Cast it to a boolean!
   * @param {any} val
   * @returns {Boolean}
   */
  parseBool: function(val) {
    var bool;
    try {
      bool = !!JSON.parse(val);
    } catch (err) {
      bool = false;
    }
    return bool;
  },

  /**
   * This is needed because if you send an empty string to the shadow, it will not change the
   * actual value. this way if it is an empty string, it will return null instead.
   * @return {string}
   */
  getAccessCodeForShadow: function() {
    var code = HOST_DEVICE.getSetting('access_code');
    return code && code.length > 0 ? code : '';
  },

  dateToPosix: function(date) {
    return Math.floor(date.getTime() / 1000);
  },

  posixToDate: function(posix) {
    return new Date(posix * 1000);
  },

  // Copied from https://stackoverflow.com/a/17415677/1678843
  // Outputs YYYY-MM-DDThh:mm:ss+|-hh:mm
  dateToISO8601: function(date) {
    var offset = -date.getTimezoneOffset(),
      dif = offset >= 0 ? '+' : '-',
      pad = function(num) {
        var norm = Math.floor(Math.abs(num));
        return (norm < 10 ? '0' : '') + norm;
      };

    return (
      date.getFullYear() +
      '-' +
      pad(date.getMonth() + 1) +
      '-' +
      pad(date.getDate()) +
      'T' +
      pad(date.getHours()) +
      ':' +
      pad(date.getMinutes()) +
      ':' +
      pad(date.getSeconds()) +
      dif +
      pad(offset / 60) +
      ':' +
      pad(offset % 60)
    );
  },

  createImageFromCanvas: function(background = 'black', text = false) {
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (text) { 
      ctx.font = '40px sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }

    const dataURL = canvas.toDataURL('image/jpeg');
    return dataURL;
  }
};
