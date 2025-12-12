# FWISSSP - Digital Signage Content Player for Samsung SSSP

A modified version of our digital signage content player for Samsung SSSP based on version 1.9.1, updated to fix FWI Services issues when running on Samsung QMR displays.

## Overview

This project is an enhanced version of the FWI digital signage content player specifically designed for Samsung SSSP (Smart Signage Platform) devices. The original v1.9.1 codebase has been modified to resolve critical monitoring and hardware integration issues encountered on Samsung QMR displays.

## Key Features

- **Samsung SSSP Integration**: Native Samsung Smart Signage Platform support
- **QMR Display Compatibility**: Specifically tested and fixed for Samsung QMR displays
- **Device Monitoring**: Real-time status monitoring with automated uploads
- **Hardware Information Retrieval**: Active Samsung API calls for IP, MAC, and serial data
- **Screenshot Capture**: Automated screenshot functionality with QMR orientation error handling
- **Scheduler System**: Intelligent log and data upload scheduling
- **FWI Services Integration**: Fixed monitoring system for proper FWI Services communication
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

## Version History

**Base Version**: FWI Digital Signage Content Player v1.9.1  
**Modified Version**: v1.9.1-QMR-FIXED  
**Target Hardware**: Samsung QMR displays with SSSP support  
**Primary Fixes**: FWI Services monitoring system integration  

## Samsung QMR Specific Improvements

- **Orientation API Error Handling**: Fixed "Input Source is not Existed" errors during screenshot capture
- **Hardware Information Retrieval**: Active Samsung API calls to populate IP, MAC, and serial number data
- **FWI Services Communication**: Resolved monitoring system failures specific to QMR hardware
- **UI Event Binding**: Fixed timing issues with DOM element interactions on QMR displays
- **Upload Scheduling**: Corrected immediate upload bugs in log scheduler system

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