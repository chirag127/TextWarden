/**
 * TextWarden Popup Script
 * 
 * This script handles the popup UI:
 * 1. Loads and saves user preferences
 * 2. Updates UI based on current settings
 * 3. Displays statistics
 * 4. Handles user interactions
 */

// DOM Elements
const enableToggle = document.getElementById('enableToggle');
const languageSelect = document.getElementById('languageSelect');
const grammarCheck = document.getElementById('grammarCheck');
const spellingCheck = document.getElementById('spellingCheck');
const styleCheck = document.getElementById('styleCheck');
const clarityCheck = document.getElementById('clarityCheck');
const correctionsCount = document.getElementById('correctionsCount');
const suggestionsCount = document.getElementById('suggestionsCount');
const resetStatsBtn = document.getElementById('resetStatsBtn');
const clearCacheBtn = document.getElementById('clearCacheBtn');

// Load user preferences and stats
function loadSettings() {
  chrome.storage.sync.get(['enabled', 'preferences', 'stats'], (result) => {
    // Extension enabled state
    if (result.enabled !== undefined) {
      enableToggle.checked = result.enabled;
    }
    
    // User preferences
    if (result.preferences) {
      languageSelect.value = result.preferences.language || 'en-US';
      grammarCheck.checked = result.preferences.checkGrammar !== undefined ? result.preferences.checkGrammar : true;
      spellingCheck.checked = result.preferences.checkSpelling !== undefined ? result.preferences.checkSpelling : true;
      styleCheck.checked = result.preferences.checkStyle !== undefined ? result.preferences.checkStyle : true;
      clarityCheck.checked = result.preferences.checkClarity !== undefined ? result.preferences.checkClarity : true;
    }
    
    // Statistics
    if (result.stats) {
      correctionsCount.textContent = result.stats.corrections || 0;
      suggestionsCount.textContent = result.stats.suggestionsShown || 0;
    }
  });
}

// Save user preferences
function savePreferences() {
  const preferences = {
    language: languageSelect.value,
    checkGrammar: grammarCheck.checked,
    checkSpelling: spellingCheck.checked,
    checkStyle: styleCheck.checked,
    checkClarity: clarityCheck.checked
  };
  
  chrome.storage.sync.set({ preferences }, () => {
    console.log('TextWarden: Preferences saved');
  });
}

// Toggle extension enabled state
function toggleExtension() {
  const enabled = enableToggle.checked;
  
  chrome.storage.sync.set({ enabled }, () => {
    console.log(`TextWarden: Extension ${enabled ? 'enabled' : 'disabled'}`);
  });
}

// Reset statistics
function resetStats() {
  chrome.storage.sync.set({ 
    stats: { 
      corrections: 0, 
      suggestionsShown: 0 
    } 
  }, () => {
    correctionsCount.textContent = '0';
    suggestionsCount.textContent = '0';
    console.log('TextWarden: Statistics reset');
  });
}

// Clear response cache by sending a message to the background script
function clearCache() {
  chrome.runtime.sendMessage({ action: 'clearCache' }, () => {
    console.log('TextWarden: Cache cleared');
    
    // Show feedback to the user
    clearCacheBtn.textContent = 'Cleared!';
    setTimeout(() => {
      clearCacheBtn.textContent = 'Clear Cache';
    }, 1500);
  });
}

// Event Listeners
enableToggle.addEventListener('change', toggleExtension);
languageSelect.addEventListener('change', savePreferences);
grammarCheck.addEventListener('change', savePreferences);
spellingCheck.addEventListener('change', savePreferences);
styleCheck.addEventListener('change', savePreferences);
clarityCheck.addEventListener('change', savePreferences);
resetStatsBtn.addEventListener('click', resetStats);
clearCacheBtn.addEventListener('click', clearCache);

// Initialize the popup
document.addEventListener('DOMContentLoaded', loadSettings);
