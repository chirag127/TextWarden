# TextWarden Documentation

## Overview

TextWarden is a browser extension that enhances writing across the web by providing real-time grammar, spelling, style, and clarity suggestions. This document provides detailed information on how to use, customize, and extend the extension.

## Table of Contents

1. [Installation](#installation)
2. [Usage](#usage)
3. [Features](#features)
4. [Customization](#customization)
5. [Technical Details](#technical-details)
6. [Troubleshooting](#troubleshooting)
7. [Development](#development)

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Chrome, Edge, Firefox, or another Chromium-based browser

### Installation Steps

1. Clone the repository:
   ```
   git clone https://github.com/chirag127/TextWarden.git
   cd TextWarden
   ```

2. Run the installation script:
   ```
   npm run install
   ```

3. Start the backend server:
   ```
   npm run start:backend
   ```

4. Load the extension in your browser:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top-right corner
   - Click "Load unpacked" and select the `extension` directory
   - The TextWarden extension should now be installed and visible in your browser toolbar

## Usage

### Basic Usage

1. Click the TextWarden icon in your browser toolbar to open the popup.
2. Toggle the extension on/off using the switch in the popup.
3. Start typing in any text field on the web, and TextWarden will analyze your text in real-time.
4. Hover over highlighted text to see suggestions and click on a suggestion to apply it.

### Testing

To test if the extension is working correctly, you can:

1. Open the included test page at `extension/test.html` in your browser.
2. Type in the provided text fields to see TextWarden in action.
3. Check if the expected errors are highlighted and if the suggestions are accurate.

## Features

### Real-Time Text Analysis

TextWarden continuously monitors text input fields and analyzes the text as you type. It waits for a brief pause in typing before sending the text for analysis to avoid excessive API calls.

### Error Detection

TextWarden can detect several types of issues:

- **Spelling Errors**: Misspelled words and typos
- **Grammar Errors**: Incorrect grammar usage, such as subject-verb agreement
- **Style Issues**: Weak or redundant language that could be improved
- **Clarity Problems**: Wordy or unclear phrases that could be simplified

### Suggestion Popup

When you hover over highlighted text, a popup appears with:

- The type of issue detected
- Suggested corrections
- A brief explanation of the issue

Click on a suggestion to apply it to your text.

## Customization

### Language Preference

You can choose between American English (en-US) and British English (en-GB) in the popup settings.

### Check Types

You can enable or disable specific types of checks:

- Grammar
- Spelling
- Style
- Clarity

### Statistics

The popup displays statistics about your usage:

- Number of corrections applied
- Number of suggestions shown

You can reset these statistics using the "Reset Stats" button.

## Technical Details

### Architecture

TextWarden consists of two main components:

1. **Browser Extension**: Built with Manifest V3, it includes:
   - Content script for detecting text fields and highlighting issues
   - Background script for API communication
   - Popup UI for user settings

2. **Backend Server**: Built with Express.js, it handles:
   - Text analysis using Gemini 2.0 Flash Lite
   - API endpoints for the extension
   - Text chunking for handling large inputs

### Data Flow

1. User types in a text field
2. Content script detects the change and sends the text to the background script
3. Background script checks its cache for existing analysis
4. If not cached, background script sends the text to the backend server
5. Backend server analyzes the text and returns suggestions
6. Background script caches the response and sends it to the content script
7. Content script highlights issues and displays suggestions

## Troubleshooting

### Extension Not Working

If the extension is not working as expected:

1. Check if the backend server is running (`npm run start:backend`)
2. Verify that the extension is enabled in the popup
3. Reload the extension from the browser's extension management page
4. Check the browser console for any error messages

### No Suggestions Appearing

If no suggestions are appearing:

1. Make sure you have typed enough text (at least 5 characters)
2. Check if all check types are enabled in the popup
3. Try reloading the page
4. Restart the backend server

### Backend Server Issues

If the backend server is not working:

1. Check if Node.js is installed correctly
2. Verify that all dependencies are installed (`npm run install:backend`)
3. Check the server logs for any error messages
4. Make sure no other service is using port 3000

## Development

### Project Structure

```
textwarden/
├── extension/              # Browser extension code
│   ├── manifest.json       # Manifest V3 configuration
│   ├── popup/              # Popup UI files
│   ├── scripts/            # Extension scripts
│   └── icons/              # Extension icons
├── backend/                # Backend server code
│   ├── server.js           # Express.js server
│   ├── routes/             # API endpoints
│   └── utils/              # Helper functions
└── README.md               # Project documentation
```

### Extension Development

To modify the extension:

1. Edit the files in the `extension` directory
2. Reload the extension in your browser to apply changes

### Backend Development

To modify the backend:

1. Edit the files in the `backend` directory
2. Restart the server to apply changes (`npm run start:backend`)

### Adding New Features

To add new features:

1. For UI changes, modify the popup files (`extension/popup/`)
2. For text analysis logic, modify the content script (`extension/scripts/content.js`)
3. For API communication, modify the background script (`extension/scripts/background.js`)
4. For backend functionality, modify the server files (`backend/`)

### Testing

To test your changes:

1. Run the backend test: `npm run test:backend`
2. Test the extension manually using the test page (`extension/test.html`)
3. Check the browser console for any error messages
