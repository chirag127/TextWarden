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
const enableToggle = document.getElementById("enableToggle");
const languageSelect = document.getElementById("languageSelect");
const grammarCheck = document.getElementById("grammarCheck");
const spellingCheck = document.getElementById("spellingCheck");
const styleCheck = document.getElementById("styleCheck");
const clarityCheck = document.getElementById("clarityCheck");
const correctionsCount = document.getElementById("correctionsCount");
const suggestionsCount = document.getElementById("suggestionsCount");
const resetStatsBtn = document.getElementById("resetStatsBtn");
const clearCacheBtn = document.getElementById("clearCacheBtn");

// Custom Dictionary Elements
const customWordInput = document.getElementById("customWordInput");
const addWordBtn = document.getElementById("addWordBtn");
const customDictionaryList = document.getElementById("customDictionaryList");

// Load user preferences and stats
function loadSettings() {
    chrome.storage.sync.get(
        ["enabled", "preferences", "stats", "customDictionary"],
        (result) => {
            // Extension enabled state
            if (result.enabled !== undefined) {
                enableToggle.checked = result.enabled;
            }

            // User preferences
            if (result.preferences) {
                languageSelect.value = result.preferences.language || "en-US";
                grammarCheck.checked =
                    result.preferences.checkGrammar !== undefined
                        ? result.preferences.checkGrammar
                        : true;
                spellingCheck.checked =
                    result.preferences.checkSpelling !== undefined
                        ? result.preferences.checkSpelling
                        : true;
                styleCheck.checked =
                    result.preferences.checkStyle !== undefined
                        ? result.preferences.checkStyle
                        : true;
                clarityCheck.checked =
                    result.preferences.checkClarity !== undefined
                        ? result.preferences.checkClarity
                        : true;
            }

            // Statistics
            if (result.stats) {
                correctionsCount.textContent = result.stats.corrections || 0;
                suggestionsCount.textContent =
                    result.stats.suggestionsShown || 0;
            }

            // Custom Dictionary
            if (result.customDictionary && result.customDictionary.length > 0) {
                renderCustomDictionary(result.customDictionary);
            }
        }
    );
}

// Save user preferences
function savePreferences() {
    const preferences = {
        language: languageSelect.value,
        checkGrammar: grammarCheck.checked,
        checkSpelling: spellingCheck.checked,
        checkStyle: styleCheck.checked,
        checkClarity: clarityCheck.checked,
    };

    chrome.storage.sync.set({ preferences }, () => {
        console.log("TextWarden: Preferences saved");
    });
}

// Toggle extension enabled state
function toggleExtension() {
    const enabled = enableToggle.checked;

    chrome.storage.sync.set({ enabled }, () => {
        console.log(
            `TextWarden: Extension ${enabled ? "enabled" : "disabled"}`
        );
    });
}

// Reset statistics
function resetStats() {
    chrome.storage.sync.set(
        {
            stats: {
                corrections: 0,
                suggestionsShown: 0,
            },
        },
        () => {
            correctionsCount.textContent = "0";
            suggestionsCount.textContent = "0";
            console.log("TextWarden: Statistics reset");
        }
    );
}

// Clear response cache by sending a message to the background script
function clearCache() {
    chrome.runtime.sendMessage({ action: "clearCache" }, () => {
        console.log("TextWarden: Cache cleared");

        // Show feedback to the user
        clearCacheBtn.textContent = "Cleared!";
        setTimeout(() => {
            clearCacheBtn.textContent = "Clear Cache";
        }, 1500);
    });
}

// Custom Dictionary Functions

// Render the custom dictionary list
function renderCustomDictionary(dictionary) {
    // Clear the current list
    customDictionaryList.innerHTML = "";

    if (dictionary.length === 0) {
        const emptyMessage = document.createElement("div");
        emptyMessage.className = "empty-dictionary-message";
        emptyMessage.textContent = "No custom words added yet.";
        customDictionaryList.appendChild(emptyMessage);
        return;
    }

    // Add each word to the list
    dictionary.forEach((word) => {
        const item = document.createElement("div");
        item.className = "dictionary-item";

        const wordSpan = document.createElement("span");
        wordSpan.className = "dictionary-word";
        wordSpan.textContent = word;

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-word-btn";
        removeBtn.innerHTML = "&times;";
        removeBtn.title = "Remove word";
        removeBtn.addEventListener("click", () => removeWord(word));

        item.appendChild(wordSpan);
        item.appendChild(removeBtn);
        customDictionaryList.appendChild(item);
    });
}

// Add a word to the custom dictionary
function addWord() {
    const word = customWordInput.value.trim();

    if (!word) return;

    chrome.storage.sync.get(["customDictionary"], (result) => {
        const dictionary = result.customDictionary || [];

        // Check if word already exists
        if (dictionary.includes(word)) {
            // Show feedback (word already exists)
            customWordInput.classList.add("error");
            setTimeout(() => {
                customWordInput.classList.remove("error");
            }, 1500);
            return;
        }

        // Add the word to the dictionary
        dictionary.push(word);

        // Save the updated dictionary
        chrome.storage.sync.set({ customDictionary: dictionary }, () => {
            console.log("TextWarden: Word added to custom dictionary");

            // Clear the input
            customWordInput.value = "";

            // Update the UI
            renderCustomDictionary(dictionary);

            // Notify the background script
            chrome.runtime.sendMessage({
                action: "updateCustomDictionary",
                dictionary: dictionary,
            });
        });
    });
}

// Remove a word from the custom dictionary
function removeWord(word) {
    chrome.storage.sync.get(["customDictionary"], (result) => {
        const dictionary = result.customDictionary || [];

        // Remove the word from the dictionary
        const updatedDictionary = dictionary.filter((w) => w !== word);

        // Save the updated dictionary
        chrome.storage.sync.set({ customDictionary: updatedDictionary }, () => {
            console.log("TextWarden: Word removed from custom dictionary");

            // Update the UI
            renderCustomDictionary(updatedDictionary);

            // Notify the background script
            chrome.runtime.sendMessage({
                action: "updateCustomDictionary",
                dictionary: updatedDictionary,
            });
        });
    });
}

// Event Listeners
enableToggle.addEventListener("change", toggleExtension);
languageSelect.addEventListener("change", savePreferences);
grammarCheck.addEventListener("change", savePreferences);
spellingCheck.addEventListener("change", savePreferences);
styleCheck.addEventListener("change", savePreferences);
clarityCheck.addEventListener("change", savePreferences);
resetStatsBtn.addEventListener("click", resetStats);
clearCacheBtn.addEventListener("click", clearCache);

// Custom Dictionary Event Listeners
addWordBtn.addEventListener("click", addWord);
customWordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        addWord();
    }
});

// Initialize the popup
document.addEventListener("DOMContentLoaded", loadSettings);
