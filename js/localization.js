var FWI_Localization = {
  // Summary: Gets a localized resource.
  getResource: function(bundle, resourceKey, defaultText) {
    // FIXME KJO Implement proper look up of bundle and handling of parameter substitution.
    var result = this.defaultBundle[resourceKey] || defaultText;
    return result;
  },

  defaultBundle: {
    label_cancel: 'Cancel', // Label for the button to cancel a selection / dialog, "Cancel".
    label_ipAddress: 'IP address', // Label for the field to enter an IP address, "IP address".
    label_subnetMask: 'Subnet mask', // Label for the field to enter a subnet mask, "Subnet mask".
    label_defaultGateway: 'Def. gateway', // Label for the field to enter a default gateway IP address, "Def. gateway".
    label_dns1: 'DNS 1', // Label for the field to enter a DNS IP address (first), "DNS 1".
    label_dns2: 'DNS 2', // Label for the field to enter a DNS IP address (second), "DNS 2".
    label_dns3: 'DNS 3', // Label for the field to enter a DNS IP address (third), "DNS 3".
    label_select: 'Select', // Label for the button to confirm a selection, "Select".
    label_timeZone: 'Time Zone', // Label for the header to specify a time zone, "Time Zone".
    label_timeServer: 'Time Server', // Label for the header to specify a time server, "Time Server".
    label_useStaticIpAddress: 'Use a static IP address', // Label for the checkbox to determine whether a static IP address should be used,"Use a static IP address".
    timeZone_EST: 'EST - US Eastern Time', // "EST - US Eastern Time".
    timeZone_CST: 'CST - US Central Time', // "CST - US Central Time".
    timeZone_MST: 'MST - US Mountain Time', // "MST - US Mountain Time".
    timeZone_PST: 'PST - US Pacific Time', // "PST - US Pacific Time".
    timeZone_AKST: 'AKST - Alaska Time', // "AKST - Alaska Time".
    timeZone_HST:
      'HST - Hawaii-Aleutian Time without Daylight Saving Time (Hawaii)', // "HST - Hawaii-Aleutian Time without Daylight Saving Time (Hawaii)".
    timeZone_HST1: 'HST1 - Hawaii-Aleutian Time with Daylight Saving Time', // "HST1 - Hawaii-Aleutian Time with Daylight Saving Time".
    timeZone_MST1:
      'MST1 - US Mountain Time without Daylight Saving Time (Arizona)', // "MST1 - US Mountain Time without Daylight Saving Time (Arizona)".
    timeZone_EST1:
      'EST1 - US Eastern Time without Daylight Saving Time (East Indiana)', // "EST1 - US Eastern Time without Daylight Saving Time (East Indiana)".
    timeZone_AST: 'AST - Atlantic Time', // "AST - Atlantic Time".
    timeZone_CST2: 'CST2 - Mexico (Mexico City)', // "CST2 - Mexico (Mexico City)".
    timeZone_MST2: 'MST2 - Mexico (Chihuahua)', // "MST2 - Mexico (Chihuahua)".
    timeZone_PST2: 'PST2 - Mexico (Tijuana)', // "PST2 - Mexico (Tijuana)".
    timeZone_BRT: 'BRT - Brazil Time (Sao Paulo)', // "BRT - Brazil Time (Sao Paulo)".
    timeZone_NST: 'NST - Newfoundland Time', // "NST - Newfoundland Time".
    timeZone_AZOT: 'AZOT - Azores Time', // "AZOT - Azores Time".
    timeZone_GMTBST: 'GMTBST - London / Dublin Time', // "GMTBST - London / Dublin Time".
    timeZone_WET: 'WET - Western European Time (Lisbon)', // "WET - Western European Time (Lisbon)"
    timeZone_CET: 'CET - Central European Time (Berlin, Copenhagen, Paris)', // "CET - Central European Time (Berlin, Copenhagen, Paris)"
    timeZone_EET: 'EET - Eastern European Time (Helsinki)', // "EET - Eastern European Time (Helsinki)"
    timeZone_MSK: 'MSK - Moscow Time', // "MSK - Moscow Time".
    timeZone_SAMT: 'SAMT - Delta Time Zone (Samara)', // "SAMT - Delta Time Zone (Samara)".
    timeZone_YEKT: 'YEKT - Echo Time Zone (Yekaterinburg)', // "YEKT - Echo Time Zone (Yekaterinburg)".
    timeZone_IST: 'IST - Indian Standard Time', // "IST - Indian Standard Time".
    timeZone_NPT: 'NPT - Nepal Time', // "NPT - Nepal Time".
    timeZone_OMST: 'OMST - Foxtrot Time Zone (Omsk)', // "OMST - Foxtrot Time Zone (Omsk)".
    timeZone_JST: 'JST - Japanese Standard Time', // "JST - Japanese Standard Time".
    timeZone_CXT: 'CXT - Christmas Island Time (Australia)', // "CXT - Christmas Island Time (Australia)".
    timeZone_AWST: 'AWST - Australian Western Time with Daylight Saving Time', // "AWST - Australian Western Time with Daylight Saving Time".
    timeZone_AWST1:
      'AWST - Australian Western Time without Daylight Saving Time', // "AWST - Australian Western Time without Daylight Saving Time".
    timeZone_ACST:
      'ACST - Australian Central Standard Time (CST) with Daylight Saving Time', // "ACST - Australian Central Standard Time (CST) with Daylight Saving Time".
    timeZone_ACST1:
      'ACST1 - Darwin, Australia and Australian Central Standard Time (CST) without Daylight Saving Time', // "ACST1 - Darwin, Australia and Australian Central Standard Time (CST) without Daylight Saving Time".
    timeZone_AEST: 'AEST - Australian Eastern Time with Daylight Saving Time', // "AEST - Australian Eastern Time with Daylight Saving Time".
    timeZone_AEST1:
      'AEST1 - Australian Eastern Time without Daylight Saving Time (Brisbane)', // "AEST1 - Australian Eastern Time without Daylight Saving Time (Brisbane)".
    timeZone_NFT: 'NFT - Norfolk (Island) Time (Australia)', // "NFT - Norfolk (Island) Time (Australia)".
    timeZone_NZST: 'NZST - New Zealand Time (Auckland)', // "NZST - New Zealand Time (Auckland)".
    timeZone_CHAST:
      'CHAST - Fiji Time, Fiji, Pacific / Fiji, Yankee Time Zone (Fiji)', // "CHAST - Fiji Time, Fiji, Pacific / Fiji, Yankee Time Zone (Fiji)".
    timeZone_SST: 'SST - X-ray Time Zone (Pago Pago)', // "SST - X-ray Time Zone (Pago Pago)".
    timeZone_GMT: 'GMT - Greenwich Mean Time', // "GMT - Greenwich Mean Time".
    'timeZone_GMT-1': 'GMT-1 - 1 hour behind GMT', // "GMT-1 - 1 hour behind GMT".
    'timeZone_GMT-2': 'GMT-2 - 2 hours behind GMT', // "GMT-2 - 2 hours behind GMT".
    'timeZone_GMT-3': 'GMT-3 - 3 hours behind GMT', // "GMT-3 - 3 hours behind GMT".
    'timeZone_GMT-3:30': 'GMT-3:30 - 3.5 hours behind GMT', // "GMT-3:30 - 3.5 hours behind GMT".
    'timeZone_GMT-4': 'GMT-4 - 4 hours behind GMT', // "GMT-4 - 4 hours behind GMT".
    'timeZone_GMT-4:30': 'GMT-4:30 - 4.5 hours behind GMT', // "GMT-4:30 - 4.5 hours behind GMT".
    'timeZone_GMT-5': 'GMT-5 - 5 hours behind GMT', // "GMT-5 - 5 hours behind GMT".
    'timeZone_GMT-6': 'GMT-6 - 6 hours behind GMT', // "GMT-6 - 6 hours behind GMT".
    'timeZone_GMT-7': 'GMT-7 - 7 hours behind GMT', // "GMT-7 - 7 hours behind GMT".
    'timeZone_GMT-8': 'GMT-8 - 8 hours behind GMT', // "GMT-8 - 8 hours behind GMT".
    'timeZone_GMT-9': 'GMT-9 - 9 hours behind GMT', // "GMT-9 - 9 hours behind GMT".
    'timeZone_GMT-9:30': 'GMT-9:30 - 9.5 hours behind GMT', // "GMT-9:30 - 9.5 hours behind GMT".
    'timeZone_GMT-10': 'GMT-10 - 10 hours behind GMT', // "GMT-10 - 10 hours behind GMT".
    'timeZone_GMT-11': 'GMT-11 - 11 hours behind GMT', // "GMT-11 - 11 hours behind GMT".
    'timeZone_GMT-12': 'GMT-12 - 12 hours behind GMT', // "GMT-12 - 12 hours behind GMT".
    'timeZone_GMT-13': 'GMT-13 - 13 hours behind GMT', // "GMT-13 - 13 hours behind GMT".
    'timeZone_GMT-14': 'GMT-14 - 14 hours behind GMT', // "GMT-14 - 14 hours behind GMT".
    'timeZone_GMT+1': 'GMT+1 - 1 hour ahead of GMT', // "GMT+1 - 1 hour ahead of GMT".
    'timeZone_GMT+2': 'GMT+2 - 2 hours ahead of GMT', // "GMT+2 - 2 hours ahead of GMT".
    'timeZone_GMT+3': 'GMT+3 - 3 hours ahead of GMT', // "GMT+3 - 3 hours ahead of GMT".
    'timeZone_GMT+3:30': 'GMT+3:30 - 3.5 hours ahead of GMT', // "GMT+3:30 - 3.5 hours ahead of GMT".
    'timeZone_GMT+4': 'GMT+4 - 4 hours ahead of GMT', // "GMT+4 - 4 hours ahead of GMT".
    'timeZone_GMT+4:30': 'GMT+4:30 - 4.5 hours ahead of GMT', // "GMT+4:30 - 4.5 hours ahead of GMT".
    'timeZone_GMT+5': 'GMT+5 - 5 hours ahead of GMT', // "GMT+5 - 5 hours ahead of GMT"
    'timeZone_GMT+5:30': 'GMT+5:30 - 5.5 hours ahead of GMT', // "GMT+5:30 - 5.5 hours ahead of GMT".
    'timeZone_GMT+6': 'GMT+6 - 6 hours ahead of GMT', // "GMT+6 - 6 hours ahead of GMT".
    'timeZone_GMT+6:30': 'GMT+6:30 - 6.5 hours ahead of GMT', // "GMT+6:30 - 6.5 hours ahead of GMT".
    'timeZone_GMT+7': 'GMT+7 - 7 hours ahead of GMT', // "GMT+7 - 7 hours ahead of GMT".
    'timeZone_GMT+7:30': 'GMT+7:30 - 7.5 hours ahead of GMT', // "GMT+7:30 - 7.5 hours ahead of GMT".
    'timeZone_GMT+8': 'GMT+8 - 8 hours ahead of GMT', // "GMT+8 - 8 hours ahead of GMT"
    'timeZone_GMT+8:30': 'GMT+8:30 - 8.5 hours ahead of GMT', // "GMT+8:30 - 8.5 hours ahead of GMT".
    'timeZone_GMT+9': 'GMT+9 - 9 hours ahead of GMT', // "GMT+9 - 9 hours ahead of GMT".
    'timeZone_GMT+9:30': 'GMT+9:30 - 9.5 hours ahead of GMT', // "GMT+9:30 - 9.5 hours ahead of GMT".
    'timeZone_GMT+10': 'GMT+10 - 10 hours ahead of GMT', // "GMT+10 - 10 hours ahead of GMT".
    'timeZone_GMT+10:30': 'GMT+10:30 - 10.5 hours ahead of GMT', // "GMT+10:30 - 10.5 hours ahead of GMT".
    'timeZone_GMT+11': 'GMT+11 - 11 hours ahead of GMT', // "GMT+11 - 11 hours ahead of GMT".
    'timeZone_GMT+11:30': 'GMT+11:30 - 11.5 hours ahead of GMT', // "GMT+11:30 - 11.5 hours ahead of GMT".
    'timeZone_GMT+12': 'GMT+12 - 12 hours ahead of GMT', // "GMT+12 - 12 hours ahead of GMT".
    'timeZone_GMT+12:30': 'GMT+12:30 - 12.5 hours ahead of GMT', // "GMT+12:30 - 12.5 hours ahead of GMT".
    'timeZone_GMT+13': 'GMT+13 - 13 hours ahead of GMT', // "GMT+13 - 13 hours ahead of GMT".
    'timeZone_GMT+14': 'GMT+14 - 14 hours ahead of GMT' // "GMT+14 - 14 hours ahead of GMT."
  }
};

/*
 * Bundle: "browserBased"
"deploy_message_clickToVerify": "Please Click to Verify", // Deploy message, "Please Click to Verify".
"deploy_message_badUrlFormat": "Bad URL Format. Please Try Again.", // Deploy error message when the sign URL format is incorrect, "Bad URL Format. Please Try Again.".
"deploy_message_incorrectCredentials": "Username/Password Credentials are Incorrect.", // Deploy error message when the sign credentials are incorrect, "Username/Password Credentials are Incorrect.".
"deploy_message_credentialsRequired": "Username/Password Credentials Required", // Deploy error message when credentials are needed and there is none, "Username/Password Credentials Required".
"deploy_message_invalidDeploymentUrl": "Invalid Deployment URL. Please Try Again.", // Deploy error message when the supplied URL has been deemed invalid, "Invalid Deployment URL. Please Try Again.".
"deploy_message_unsupportedUrl": "Unsupported URL.", // Deploy error message when the supplied URL is not supported, "Unsupported URL.".
"deploy_message_connectionError": "Error with Connection.", // Deploy error message when there is a problem with the connection, "Error with Connection.".
"settings_message_invalidAccessCode": "Code Doesn't Match.", // Settings error message when entered access code is invalid, "Code Doesn't Match.".
"settings_message_enterAccessCode", "Please Enter Code.", // Settings message when no access code has been provided, "Please Enter Code.".
"advanced_message_connectionError": "Error with Connection.", // Advanced error message when there is a problem with the connection, "Error with Connection.".
"message_servicesEnabled": "FWI Services Enabled.", // Advanced status message when the connection to FWI Services is working, "FWI Services Enabled.".
"message_invalidStaticIpAddress": "Static IP Address Invalid", // Status message when the static IP address entered is invalid, "Static IP Address Invalid".
"message_invalidSubnetMask": "Subnet Mask Invalid", // Status message when the subnet mask entered is invalid, "Subnet Mask Invalid".
"message_invalidDefaultGatewayAddress": "Default Gateway Address Invalid", // Status message when the default gateway address is invalid, "Default Gateway Address Invalid".
"message_invalidDNS1Address": "DNS 1 Address Invalid", // Status message when the DNS 1 address is invalid,  "DNS 1 Address Invalid".
"message_invalidDNS2Address": "DNS 2 Address Invalid", // Status message when the DNS 2 address is invalid,  "DNS 2 Address Invalid".
"message_invalidDNS3Address": "DNS 3 Address Invalid", // Status message when the DNS 3 address is invalid,  "DNS 3 Address Invalid".
"message_networkConfigurationUpdated": "Network Configuration Updated", // Status message when the network configuration has been successfully updated, "Network Configuration Updated".
"message_errorUpdatingNetworkConfiguration": "Error Updating Network Configuration", // Status message when the network configuration could not be updated, "Error Updating Network Configuration".
*/

/*
The localization files are like this:
({
"aboutDialog_title": "Om Content Manager Web", // About dialog title
})

So it's a JSON object surrounded by parentheses.
*/
