/**
 * TextWarden Background Script
 *
 * This script runs in the background and:
 * 1. Handles communication between content scripts and the backend
 * 2. Manages user preferences and extension state
 * 3. Caches API responses to improve performance
 */

// Configuration
const CONFIG = {
    apiEndpoint: "http://localhost:3000/analyze",
    cacheSize: 50, // Maximum number of cached responses
    cacheExpiry: 30 * 60 * 1000, // Cache expiry time (30 minutes)
};

// Simple LRU cache for API responses
class ResponseCache {
    constructor(maxSize = 50) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    // Generate a cache key from text and preferences
    generateKey(text, preferences) {
        return `${text}|${JSON.stringify(preferences)}`;
    }

    // Get a cached response
    get(text, preferences) {
        const key = this.generateKey(text, preferences);
        const cached = this.cache.get(key);

        if (cached) {
            // Check if the cache entry has expired
            if (Date.now() - cached.timestamp > CONFIG.cacheExpiry) {
                this.cache.delete(key);
                return null;
            }

            // Move this entry to the end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, cached);

            return cached.data;
        }

        return null;
    }

    // Set a cache entry
    set(text, preferences, data) {
        const key = this.generateKey(text, preferences);

        // If cache is full, remove the oldest entry
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }

        // Add the new entry
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    // Clear the cache
    clear() {
        this.cache.clear();
    }
}

// Initialize the response cache
const responseCache = new ResponseCache(CONFIG.cacheSize);

// Default user preferences
const defaultPreferences = {
    language: "en-US",
    checkGrammar: true,
    checkSpelling: true,
    checkStyle: true,
    checkClarity: true,
};

// Default extension state
const defaultState = {
    enabled: true,
    stats: {
        corrections: 0,
        suggestionsShown: 0,
    },
    customDictionary: [],
};

// Initialize extension data
function initializeExtension() {
    chrome.storage.sync.get(
        ["enabled", "preferences", "stats", "customDictionary"],
        (result) => {
            // Set default values if not present
            if (result.enabled === undefined) {
                chrome.storage.sync.set({ enabled: defaultState.enabled });
            }

            if (!result.preferences) {
                chrome.storage.sync.set({ preferences: defaultPreferences });
            }

            if (!result.stats) {
                chrome.storage.sync.set({ stats: defaultState.stats });
            }

            if (!result.customDictionary) {
                chrome.storage.sync.set({
                    customDictionary: defaultState.customDictionary,
                });
            }
        }
    );
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "analyzeText") {
        analyzeText(message.text, message.preferences)
            .then((suggestions) => {
                // Filter out suggestions for words in the custom dictionary
                chrome.storage.sync.get(["customDictionary"], (result) => {
                    const customDictionary = result.customDictionary || [];

                    if (customDictionary.length > 0) {
                        const filteredSuggestions = suggestions.filter(
                            (suggestion) => {
                                // Check if the suggestion text is in the custom dictionary
                                return !customDictionary.includes(
                                    suggestion.text.toLowerCase()
                                );
                            }
                        );

                        sendResponse({ suggestions: filteredSuggestions });

                        // Update stats for suggestions shown
                        updateSuggestionStats(filteredSuggestions.length);
                    } else {
                        sendResponse({ suggestions });

                        // Update stats for suggestions shown
                        updateSuggestionStats(suggestions.length);
                    }
                });
            })
            .catch((error) => {
                console.error("TextWarden: Error analyzing text", error);
                sendResponse({ error: "Failed to analyze text" });
            });

        // Return true to indicate we'll respond asynchronously
        return true;
    } else if (message.action === "updateCustomDictionary") {
        // Handle custom dictionary updates
        console.log("TextWarden: Custom dictionary updated");

        // Clear the cache since the custom dictionary has changed
        responseCache.clear();

        sendResponse({ success: true });
        return true;
    } else if (message.action === "clearCache") {
        // Clear the response cache
        responseCache.clear();
        console.log("TextWarden: Cache cleared");

        sendResponse({ success: true });
        return true;
    }
});

// Analyze text using the backend API
async function analyzeText(text, preferences) {
    // Check cache first
    const cachedResponse = responseCache.get(text, preferences);
    if (cachedResponse) {
        console.log("TextWarden: Using cached response");
        return cachedResponse;
    }

    try {
        // Make API request to the backend
        const response = await fetch(CONFIG.apiEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text,
                preferences,
            }),
        });

        if (!response.ok) {
            throw new Error(
                `API request failed with status ${response.status}`
            );
        }

        const data = await response.json();

        // Cache the response
        responseCache.set(text, preferences, data.suggestions);

        return data.suggestions;
    } catch (error) {
        console.error("TextWarden: API request failed", error);

        // Return mock suggestions for testing or when API is unavailable
        return getMockSuggestions(text);
    }
}

// Generate mock suggestions for testing or when API is unavailable
function getMockSuggestions(text) {
    const mockSuggestions = [];

    // Simple spelling check for common errors
    const commonErrors = [
        { error: "teh", correction: "the", type: "spelling" },
        { error: "thier", correction: "their", type: "spelling" },
        { error: "recieve", correction: "receive", type: "spelling" },
        { error: "definately", correction: "definitely", type: "spelling" },
        { error: "seperate", correction: "separate", type: "spelling" },
        { error: "occured", correction: "occurred", type: "spelling" },
        { error: "alot", correction: "a lot", type: "spelling" },
        { error: "cant", correction: "can't", type: "spelling" },
        { error: "dont", correction: "don't", type: "spelling" },
        { error: "im", correction: "I'm", type: "spelling" },
        { error: "its a", correction: "it's a", type: "grammar" },
        {
            error: "your welcome",
            correction: "you're welcome",
            type: "grammar",
        },
        { error: "there are", correction: "they're", type: "grammar" },
        { error: "very good", correction: "excellent", type: "style" },
        { error: "really bad", correction: "terrible", type: "style" },
        { error: "in order to", correction: "to", type: "clarity" },
        {
            error: "due to the fact that",
            correction: "because",
            type: "clarity",
        },
    ];

    // Check for common errors in the text
    commonErrors.forEach(({ error, correction, type }) => {
        let index = text.toLowerCase().indexOf(error);
        while (index !== -1) {
            // Make sure it's a whole word
            const beforeChar = index === 0 ? " " : text[index - 1];
            const afterChar =
                index + error.length >= text.length
                    ? " "
                    : text[index + error.length];

            if (
                /\s/.test(beforeChar) ||
                /[.,;!?]/.test(beforeChar) ||
                index === 0
            ) {
                if (
                    /\s/.test(afterChar) ||
                    /[.,;!?]/.test(afterChar) ||
                    index + error.length === text.length
                ) {
                    // Create a suggestion
                    mockSuggestions.push({
                        id: `mock-${mockSuggestions.length}`,
                        type,
                        position: {
                            start: index,
                            end: index + error.length,
                        },
                        text: text.substring(index, index + error.length),
                        suggestions: [correction],
                        explanation: getExplanation(type, error, correction),
                    });
                }
            }

            // Find next occurrence
            index = text.toLowerCase().indexOf(error, index + 1);
        }
    });

    return mockSuggestions;
}

// Get explanation for mock suggestions
function getExplanation(type, error, correction) {
    switch (type) {
        case "spelling":
            return `"${error}" is misspelled. The correct spelling is "${correction}".`;
        case "grammar":
            return `"${error}" contains a grammar error. Consider using "${correction}" instead.`;
        case "style":
            return `Consider replacing "${error}" with "${correction}" for more impactful writing.`;
        case "clarity":
            return `"${error}" is wordy. "${correction}" is more concise.`;
        default:
            return `Consider replacing "${error}" with "${correction}".`;
    }
}

// Update suggestion statistics
function updateSuggestionStats(count) {
    chrome.storage.sync.get(["stats"], (result) => {
        const stats = result.stats || { corrections: 0, suggestionsShown: 0 };
        stats.suggestionsShown += count;

        chrome.storage.sync.set({ stats });
    });
}

// Initialize the extension when installed or updated
chrome.runtime.onInstalled.addListener(() => {
    initializeExtension();
});

// Initialize the extension when the background script starts
initializeExtension();
