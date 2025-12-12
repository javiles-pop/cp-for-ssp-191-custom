# FWISSSP - Digital Signage Management System

A comprehensive digital signage management system with monitoring, hardware integration, and multi-platform device support.

## Overview

FWISSSP is a web-based digital signage solution that provides device monitoring, content management, and hardware integration for Samsung SSSP displays and other digital signage devices.

## Key Features

- **Device Monitoring**: Real-time status monitoring with automated uploads
- **Hardware Integration**: Samsung SSSP API integration for device control
- **Screenshot Capture**: Automated screenshot functionality with error handling
- **Scheduler System**: Intelligent log and data upload scheduling
- **Multi-Platform Support**: Works across different digital signage hardware
- **Comprehensive Logging**: Detailed logging system for debugging and monitoring

## Recent Fixes & Improvements

This project includes comprehensive fixes for monitoring system issues:

✅ **Device Status Uploads** - Fixed null reference errors in XML encoding  
✅ **UI Event Bindings** - Complete rewrite with proper timing and cleanup  
✅ **Log Upload Scheduler** - Fixed immediate upload bug with proper time window handling  
✅ **Screenshot Capture** - Samsung QMR orientation error handling  
✅ **Hardware Information** - Active retrieval from Samsung device APIs  
✅ **Comprehensive Logging** - Full debugging capability throughout system  

See [MONITORING_FIXES.md](MONITORING_FIXES.md) for detailed documentation of all fixes.

## Project Structure

```
FWISSSP/
├── js/
│   ├── main.js              # Core application logic and logging
│   ├── s_monitoring.js      # Monitoring system with comprehensive fixes
│   ├── scheduler.js         # Upload scheduling with time window logic
│   ├── sssp.js             # Samsung SSSP device integration
│   ├── s_hardware.js       # Hardware information management
│   ├── helper.js           # Utility functions
│   └── ...
├── css/                    # Stylesheets
├── images/                 # Image assets
├── MONITORING_FIXES.md     # Comprehensive fix documentation
└── README.md              # This file
```

## Quick Start

### Prerequisites
- FWI Services must be configured in Advanced tab
- Network connectivity for uploads
- Samsung SSSP device (for Samsung-specific features)

### Testing Commands

```javascript
// Test monitoring system
FWI_Monitoring.testMonitoringSystem();

// Test hardware information
FWI_Hardware.testHardwareInfo();

// Test screenshot capture
FWI_SSSP.testScreenshot();

// Debug status uploads
debugStatus();
```

## Configuration

### Monitoring Settings
- **Status Upload Interval**: 30 seconds minimum
- **Screenshot Interval**: 5+ minutes recommended
- **Upload Time Window**: Configure for business hours

### Hardware Requirements
- Samsung SSSP compatible display (for Samsung features)
- Network connectivity
- Proper system time configuration

## Development

### Key Files Modified
- `s_monitoring.js` - Major monitoring system overhaul
- `scheduler.js` - Fixed upload scheduling logic
- `sssp.js` - Samsung QMR compatibility fixes
- `s_hardware.js` - Active hardware information retrieval

### Debug Functions
- `debugStatus()` - Test status upload functionality
- `enableMonitoringForTesting()` - Force enable monitoring
- `FWI_Hardware.testHardwareInfo()` - Test hardware retrieval
- `bindMonitoringElements()` - Manual UI binding

## Troubleshooting

### Common Issues
1. **UI Not Responding**: Elements now bind automatically with proper timing
2. **Status Upload Failures**: Fixed null reference errors in XML encoding
3. **Screenshot Failures**: Added Samsung QMR orientation error handling
4. **Hardware Info Missing**: Now actively retrieves from device APIs

### Logging
Comprehensive logging is available in browser console with different log levels:
- DEBUG: Detailed operation information
- INFO: General status updates
- WARN: Non-critical issues
- ERROR: Critical failures

## Contributing

1. Review [MONITORING_FIXES.md](MONITORING_FIXES.md) for current system status
2. Test changes using provided debug functions
3. Ensure comprehensive logging for new features
4. Update documentation for any new fixes

## License

[Add your license information here]

## Support

For technical issues, refer to the comprehensive logging system and debug functions provided in the codebase.