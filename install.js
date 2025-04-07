/**
 * TextWarden Installation Script
 * 
 * This script helps set up the TextWarden browser extension
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  },
  
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m'
  }
};

// Print a styled message
function printMessage(message, color = colors.fg.white) {
  console.log(color + message + colors.reset);
}

// Print a section header
function printHeader(message) {
  console.log('\n' + colors.fg.cyan + colors.bright + '=== ' + message + ' ===' + colors.reset);
}

// Print a success message
function printSuccess(message) {
  console.log(colors.fg.green + '✓ ' + message + colors.reset);
}

// Print an error message
function printError(message) {
  console.log(colors.fg.red + '✗ ' + message + colors.reset);
}

// Run a command and handle errors
function runCommand(command, errorMessage) {
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    printError(errorMessage || `Command failed: ${command}`);
    return false;
  }
}

// Check if a directory exists
function directoryExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (error) {
    return false;
  }
}

// Main installation function
async function install() {
  printHeader('TextWarden Installation');
  printMessage('This script will help you set up the TextWarden browser extension.');
  
  // Check Node.js version
  const nodeVersion = process.version;
  printMessage(`Node.js version: ${nodeVersion}`);
  
  const versionMatch = nodeVersion.match(/v(\d+)\./);
  if (versionMatch && parseInt(versionMatch[1]) < 14) {
    printError('TextWarden requires Node.js v14 or higher. Please upgrade your Node.js installation.');
    process.exit(1);
  }
  
  // Install backend dependencies
  printHeader('Installing Backend Dependencies');
  if (directoryExists(path.join(__dirname, 'backend'))) {
    process.chdir(path.join(__dirname, 'backend'));
    if (runCommand('npm install', 'Failed to install backend dependencies.')) {
      printSuccess('Backend dependencies installed successfully.');
    } else {
      process.exit(1);
    }
    process.chdir(__dirname);
  } else {
    printError('Backend directory not found. Make sure you are in the correct directory.');
    process.exit(1);
  }
  
  // Test the backend
  printHeader('Testing Backend');
  process.chdir(path.join(__dirname, 'backend'));
  if (runCommand('node test.js', 'Backend test failed.')) {
    printSuccess('Backend test completed successfully.');
  }
  process.chdir(__dirname);
  
  // Installation complete
  printHeader('Installation Complete');
  printMessage('TextWarden has been installed successfully!');
  printMessage('\nTo start the backend server:');
  printMessage('  npm run start:backend', colors.fg.yellow);
  printMessage('\nTo load the extension in Chrome:');
  printMessage('1. Open Chrome and navigate to chrome://extensions/', colors.fg.yellow);
  printMessage('2. Enable "Developer mode" in the top-right corner', colors.fg.yellow);
  printMessage('3. Click "Load unpacked" and select the "extension" directory', colors.fg.yellow);
  printMessage('4. The TextWarden extension should now be installed and visible in your browser toolbar', colors.fg.yellow);
}

// Run the installation
install().catch(error => {
  printError(`Installation failed: ${error.message}`);
  process.exit(1);
});
