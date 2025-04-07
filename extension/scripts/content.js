/**
 * TextWarden Content Script
 *
 * This script is injected into web pages to:
 * 1. Detect text input fields
 * 2. Monitor text changes
 * 3. Send text to background script for analysis
 * 4. Highlight issues and display suggestions
 */

// Configuration
const CONFIG = {
    debounceTime: 1000, // Wait 1 second after typing stops before analyzing
    minTextLength: 5, // Minimum text length to analyze
    apiEndpoint: "http://localhost:3000/analyze", // Backend API endpoint
};

// State
let isEnabled = true;
let userPreferences = {
    language: "en-US",
    checkGrammar: true,
    checkSpelling: true,
    checkStyle: true,
    checkClarity: true,
};

// DOM Elements
let activeElement = null;
let suggestionPopup = null;

// Initialize the content script
function initialize() {
    console.log("TextWarden: Initializing content script");

    // Load user preferences
    chrome.storage.sync.get(["enabled", "preferences"], (result) => {
        if (result.enabled !== undefined) {
            isEnabled = result.enabled;
        }

        if (result.preferences) {
            userPreferences = { ...userPreferences, ...result.preferences };
        }

        if (isEnabled) {
            setupTextFieldListeners();
            createSuggestionPopup();
        }
    });

    // Listen for preference changes
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.enabled) {
            isEnabled = changes.enabled.newValue;

            if (isEnabled) {
                setupTextFieldListeners();
                createSuggestionPopup();
            } else {
                removeTextFieldListeners();
                removeSuggestionPopup();
                removeAllHighlights();
            }
        }

        if (changes.preferences) {
            userPreferences = {
                ...userPreferences,
                ...changes.preferences.newValue,
            };

            // Re-analyze current text with new preferences if enabled
            if (isEnabled && activeElement) {
                const text = getElementText(activeElement);
                if (text.length >= CONFIG.minTextLength) {
                    analyzeText(text, activeElement);
                }
            }
        }
    });
}

// Create suggestion popup element
function createSuggestionPopup() {
    if (suggestionPopup) return;

    suggestionPopup = document.createElement("div");
    suggestionPopup.className = "tw-suggestion-popup";
    document.body.appendChild(suggestionPopup);

    // Close popup when clicking outside
    document.addEventListener("click", (event) => {
        if (
            suggestionPopup &&
            !suggestionPopup.contains(event.target) &&
            !event.target.classList.contains("tw-error-highlight") &&
            !event.target.classList.contains("tw-style-highlight") &&
            !event.target.classList.contains("tw-clarity-highlight")
        ) {
            suggestionPopup.classList.remove("active");
        }
    });
}

// Remove suggestion popup
function removeSuggestionPopup() {
    if (suggestionPopup) {
        suggestionPopup.remove();
        suggestionPopup = null;
    }
}

// Find and attach listeners to text input fields
function setupTextFieldListeners() {
    // Find all text input fields
    const textFields = [
        ...document.querySelectorAll("textarea"),
        ...document.querySelectorAll('input[type="text"]'),
        ...document.querySelectorAll('[contenteditable="true"]'),
    ];

    // Attach input listeners
    textFields.forEach((field) => {
        field.addEventListener("input", handleTextInput);
        field.addEventListener("focus", handleFocus);
        field.addEventListener("blur", handleBlur);
    });

    // Use MutationObserver to detect dynamically added text fields
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (
                            node.tagName === "TEXTAREA" ||
                            (node.tagName === "INPUT" &&
                                node.type === "text") ||
                            node.getAttribute("contenteditable") === "true"
                        ) {
                            node.addEventListener("input", handleTextInput);
                            node.addEventListener("focus", handleFocus);
                            node.addEventListener("blur", handleBlur);
                        }

                        // Check for text fields within the added node
                        const childTextFields = [
                            ...node.querySelectorAll("textarea"),
                            ...node.querySelectorAll('input[type="text"]'),
                            ...node.querySelectorAll(
                                '[contenteditable="true"]'
                            ),
                        ];

                        childTextFields.forEach((field) => {
                            field.addEventListener("input", handleTextInput);
                            field.addEventListener("focus", handleFocus);
                            field.addEventListener("blur", handleBlur);
                        });
                    }
                });
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
}

// Remove listeners from text fields
function removeTextFieldListeners() {
    const textFields = [
        ...document.querySelectorAll("textarea"),
        ...document.querySelectorAll('input[type="text"]'),
        ...document.querySelectorAll('[contenteditable="true"]'),
    ];

    textFields.forEach((field) => {
        field.removeEventListener("input", handleTextInput);
        field.removeEventListener("focus", handleFocus);
        field.removeEventListener("blur", handleBlur);
    });
}

// Handle text input with debounce
const debounce = (func, delay) => {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
};

const debouncedAnalyze = debounce((text, element) => {
    analyzeText(text, element);
}, CONFIG.debounceTime);

// Handle text input event
function handleTextInput(event) {
    if (!isEnabled) return;

    const text = getElementText(event.target);
    activeElement = event.target;

    if (text.length >= CONFIG.minTextLength) {
        debouncedAnalyze(text, event.target);
    } else {
        removeHighlights(event.target);
    }
}

// Handle focus event
function handleFocus(event) {
    activeElement = event.target;

    // Check if there's already text to analyze
    const text = getElementText(event.target);
    if (isEnabled && text.length >= CONFIG.minTextLength) {
        debouncedAnalyze(text, event.target);
    }
}

// Handle blur event
function handleBlur(event) {
    // Keep activeElement reference for potential corrections
}

// Get text from different types of elements
function getElementText(element) {
    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
        return element.value;
    } else if (element.getAttribute("contenteditable") === "true") {
        return element.innerText;
    }
    return "";
}

// Analyze text using the background script
function analyzeText(text, element) {
    console.log("TextWarden: Analyzing text");

    // Send text to background script for analysis
    chrome.runtime.sendMessage(
        {
            action: "analyzeText",
            text: text,
            preferences: userPreferences,
        },
        (response) => {
            if (chrome.runtime.lastError) {
                console.error(
                    "TextWarden: Error sending message to background script",
                    chrome.runtime.lastError
                );
                return;
            }

            if (response && response.suggestions) {
                highlightIssues(element, text, response.suggestions);
            }
        }
    );
}

// Highlight issues in the text
function highlightIssues(element, text, suggestions) {
    // First remove any existing highlights
    removeHighlights(element);

    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
        // For input elements, we need to create an overlay
        createInputOverlay(element, text, suggestions);
    } else if (element.getAttribute("contenteditable") === "true") {
        // For contenteditable elements, we can modify the HTML directly
        highlightContentEditable(element, suggestions);
    }
}

// Create an overlay for input and textarea elements
function createInputOverlay(element, text, suggestions) {
    // Ensure the element has an ID for reference
    if (!element.id) {
        element.id = `tw-field-${Math.random().toString(36).substring(2, 9)}`;
    }

    // Remove any existing overlay
    const existingOverlay = document.querySelector(
        `[data-tw-overlay-for="${element.id}"]`
    );
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // Create overlay container
    const overlay = document.createElement("div");
    overlay.className = "tw-text-overlay";
    overlay.setAttribute("data-tw-overlay", "true");
    overlay.setAttribute("data-tw-overlay-for", element.id);

    // Position the overlay
    positionOverlay(overlay, element);

    // Create the content with highlights
    const content = document.createElement("div");
    content.className = "tw-overlay-content";

    // Apply styles to match the input element
    copyStyles(element, content);

    // Create highlighted content
    createHighlightedContent(content, text, suggestions);

    // Add the content to the overlay
    overlay.appendChild(content);

    // Add the overlay to the document
    document.body.appendChild(overlay);

    // Add event listeners to keep the overlay in sync with the input
    setupOverlaySync(overlay, element);

    // Add necessary styles to the document if not already added
    addOverlayStyles();
}

// Position the overlay to match the input element
function positionOverlay(overlay, element) {
    const rect = element.getBoundingClientRect();

    overlay.style.position = "absolute";
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.pointerEvents = "none"; // Allow clicks to pass through to the input
    overlay.style.overflow = "hidden";
    overlay.style.zIndex = "9999";
}

// Copy relevant styles from the input element to the overlay
function copyStyles(element, overlay) {
    const computedStyle = window.getComputedStyle(element);

    // Copy text-related styles
    const stylesToCopy = [
        "font-family",
        "font-size",
        "font-weight",
        "font-style",
        "line-height",
        "letter-spacing",
        "text-transform",
        "text-indent",
        "text-align",
        "color",
        "direction",
        "white-space",
        "word-spacing",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "box-sizing",
        "border-top-width",
        "border-right-width",
        "border-bottom-width",
        "border-left-width",
    ];

    stylesToCopy.forEach((style) => {
        overlay.style[style] = computedStyle[style];
    });

    // Special handling for textarea
    if (element.tagName === "TEXTAREA") {
        overlay.style.whiteSpace = "pre-wrap";
        overlay.style.wordWrap = "break-word";
        overlay.style.overflowWrap = "break-word";
    }
}

// Create the highlighted content in the overlay
function createHighlightedContent(container, text, suggestions) {
    // Sort suggestions by position (ascending)
    suggestions.sort((a, b) => a.position.start - b.position.start);

    let lastIndex = 0;

    // Process each suggestion and add highlighted spans
    suggestions.forEach((suggestion) => {
        // Add text before the suggestion
        if (suggestion.position.start > lastIndex) {
            const beforeText = document.createTextNode(
                text.substring(lastIndex, suggestion.position.start)
            );
            container.appendChild(beforeText);
        }

        // Create the highlighted span
        const span = document.createElement("span");
        span.className = getHighlightClass(suggestion.type);
        span.setAttribute("data-suggestion-id", suggestion.id);
        span.setAttribute("data-suggestion-type", suggestion.type);
        span.setAttribute("data-suggestion-text", suggestion.text);
        span.setAttribute(
            "data-suggestion-explanation",
            suggestion.explanation
        );
        span.textContent = text.substring(
            suggestion.position.start,
            suggestion.position.end
        );

        // Add event listener for showing the suggestion popup
        span.addEventListener("click", (event) => {
            showSuggestionPopup(event, suggestion);
            event.stopPropagation();
        });

        container.appendChild(span);

        // Update the last index
        lastIndex = suggestion.position.end;
    });

    // Add any remaining text
    if (lastIndex < text.length) {
        const afterText = document.createTextNode(text.substring(lastIndex));
        container.appendChild(afterText);
    }
}

// Set up event listeners to keep the overlay in sync with the input
function setupOverlaySync(overlay, element) {
    // Update overlay position on window resize and scroll
    const updatePosition = () => {
        positionOverlay(overlay, element);
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);
    element.addEventListener("scroll", () => {
        // Sync scroll position for textarea
        if (element.tagName === "TEXTAREA") {
            overlay.querySelector(".tw-overlay-content").scrollTop =
                element.scrollTop;
        }
    });

    // Remove overlay when element is removed from DOM
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === "childList") {
                mutation.removedNodes.forEach((node) => {
                    if (node === element || node.contains(element)) {
                        overlay.remove();
                        observer.disconnect();
                        window.removeEventListener("resize", updatePosition);
                        window.removeEventListener("scroll", updatePosition);
                    }
                });
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
}

// Add necessary styles for the overlay system
function addOverlayStyles() {
    // Check if styles are already added
    if (document.getElementById("tw-overlay-styles")) {
        return;
    }

    // Create style element
    const style = document.createElement("style");
    style.id = "tw-overlay-styles";
    style.textContent = `
    .tw-text-overlay {
      position: absolute;
      pointer-events: none;
      user-select: none;
      background: transparent;
      z-index: 9999;
      overflow: hidden;
    }

    .tw-overlay-content {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background: transparent;
      pointer-events: none;
    }

    .tw-overlay-content span {
      pointer-events: auto;
      cursor: pointer;
    }
  `;

    // Add style to document head
    document.head.appendChild(style);
}

// Highlight issues in contenteditable elements
function highlightContentEditable(element, suggestions) {
    // Get the current HTML content
    let html = element.innerHTML;

    // Sort suggestions by position (descending) to avoid position shifts
    suggestions.sort((a, b) => b.position.start - a.position.start);

    // Apply highlights for each suggestion
    suggestions.forEach((suggestion) => {
        const range = document.createRange();
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let charCount = 0;
        let startNode = null;
        let startOffset = 0;
        let endNode = null;
        let endOffset = 0;

        // Find the text nodes and offsets for the suggestion
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const nodeLength = node.nodeValue.length;

            if (
                !startNode &&
                charCount + nodeLength > suggestion.position.start
            ) {
                startNode = node;
                startOffset = suggestion.position.start - charCount;
            }

            if (!endNode && charCount + nodeLength >= suggestion.position.end) {
                endNode = node;
                endOffset = suggestion.position.end - charCount;
                break;
            }

            charCount += nodeLength;
        }

        if (startNode && endNode) {
            // Create the highlight span
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);

            const span = document.createElement("span");
            span.className = getHighlightClass(suggestion.type);
            span.setAttribute("data-suggestion-id", suggestion.id);
            span.setAttribute("data-suggestion-type", suggestion.type);
            span.setAttribute("data-suggestion-text", suggestion.text);
            span.setAttribute(
                "data-suggestion-explanation",
                suggestion.explanation
            );

            // Add event listener for showing the suggestion popup
            span.addEventListener("click", (event) => {
                showSuggestionPopup(event, suggestion);
                event.stopPropagation();
            });

            range.surroundContents(span);
        }
    });
}

// Get the appropriate highlight class based on suggestion type
function getHighlightClass(type) {
    switch (type) {
        case "grammar":
        case "spelling":
            return "tw-error-highlight";
        case "style":
            return "tw-style-highlight";
        case "clarity":
            return "tw-clarity-highlight";
        default:
            return "tw-error-highlight";
    }
}

// Show suggestion popup
function showSuggestionPopup(event, suggestion) {
    if (!suggestionPopup) return;

    // Position the popup near the highlighted text
    const rect = event.target.getBoundingClientRect();
    suggestionPopup.style.left = `${rect.left + window.scrollX}px`;
    suggestionPopup.style.top = `${rect.bottom + window.scrollY + 5}px`;

    // Create popup content
    let title = "";
    switch (suggestion.type) {
        case "grammar":
            title = "Grammar Issue";
            break;
        case "spelling":
            title = "Spelling Error";
            break;
        case "style":
            title = "Style Suggestion";
            break;
        case "clarity":
            title = "Clarity Improvement";
            break;
        default:
            title = "Suggestion";
    }

    // Build the popup HTML
    let popupHTML = `
    <div class="tw-suggestion-title">${title}</div>
    <div class="tw-suggestion-options">
  `;

    // Add suggestion options
    suggestion.suggestions.forEach((option, index) => {
        popupHTML += `
      <div class="tw-suggestion-option" data-index="${index}" data-text="${option}">
        ${option}
      </div>
    `;
    });

    popupHTML += `
    </div>
    <div class="tw-suggestion-explanation">${suggestion.explanation}</div>
  `;

    suggestionPopup.innerHTML = popupHTML;
    suggestionPopup.classList.add("active");

    // Add click event listeners to suggestion options
    const options = suggestionPopup.querySelectorAll(".tw-suggestion-option");
    options.forEach((option) => {
        option.addEventListener("click", () => {
            applySuggestion(event.target, option.getAttribute("data-text"));
            suggestionPopup.classList.remove("active");

            // Update stats
            updateCorrectionStats();
        });
    });
}

// Apply a suggestion to the text
function applySuggestion(highlightElement, replacementText) {
    // Find the target element - either the element itself or the element referenced by the overlay
    let element;
    const overlay = highlightElement.closest(".tw-text-overlay");

    if (overlay) {
        // This is a highlight in an overlay
        const elementId = overlay.getAttribute("data-tw-overlay-for");
        element = document.getElementById(elementId);
    } else {
        // This is a highlight directly in a contenteditable element
        element = highlightElement.closest('[contenteditable="true"]');
    }

    if (!element) return;

    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
        // For input/textarea elements, we need to find the position from the highlight
        const suggestionId =
            highlightElement.getAttribute("data-suggestion-id");

        // Find the suggestion data
        const suggestionType = highlightElement.getAttribute(
            "data-suggestion-type"
        );
        const suggestionText = highlightElement.getAttribute(
            "data-suggestion-text"
        );

        if (suggestionText) {
            // Find the position of this text in the element's value
            const currentText = element.value;
            const textIndex = currentText.indexOf(suggestionText);

            if (textIndex !== -1) {
                // Replace the text at this position
                element.value =
                    currentText.substring(0, textIndex) +
                    replacementText +
                    currentText.substring(textIndex + suggestionText.length);

                // Trigger input event to update any listeners and re-analyze
                element.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }
    } else if (element.getAttribute("contenteditable") === "true") {
        // For contenteditable elements, replace the highlight with the new text
        highlightElement.outerHTML = replacementText;

        // Trigger input event to update any listeners
        element.dispatchEvent(new Event("input", { bubbles: true }));
    }
}

// Remove all highlights from an element
function removeHighlights(element) {
    if (!element) return;

    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
        // Remove any overlay we might have created
        const overlay = document.querySelector(
            `[data-tw-overlay-for="${element.id}"]`
        );
        if (overlay) {
            overlay.remove();
        }
    } else if (element.getAttribute("contenteditable") === "true") {
        // Remove highlight spans
        const highlights = element.querySelectorAll(
            ".tw-error-highlight, .tw-style-highlight, .tw-clarity-highlight"
        );
        highlights.forEach((highlight) => {
            // Replace the highlight with its text content
            const textNode = document.createTextNode(highlight.textContent);
            highlight.parentNode.replaceChild(textNode, highlight);
        });
    }
}

// Remove all highlights from the page
function removeAllHighlights() {
    // Remove all highlight spans
    const highlights = document.querySelectorAll(
        ".tw-error-highlight, .tw-style-highlight, .tw-clarity-highlight"
    );
    highlights.forEach((highlight) => {
        // Replace the highlight with its text content
        const textNode = document.createTextNode(highlight.textContent);
        highlight.parentNode.replaceChild(textNode, highlight);
    });

    // Remove any overlays
    const overlays = document.querySelectorAll("[data-tw-overlay]");
    overlays.forEach((overlay) => overlay.remove());
}

// Update correction statistics
function updateCorrectionStats() {
    chrome.storage.sync.get(["stats"], (result) => {
        const stats = result.stats || { corrections: 0, suggestionsShown: 0 };
        stats.corrections += 1;

        chrome.storage.sync.set({ stats });
    });
}

// Initialize the content script when the page loads
document.addEventListener("DOMContentLoaded", initialize);

// Also run initialize immediately in case the page is already loaded
initialize();
