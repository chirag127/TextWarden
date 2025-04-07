/**
 * Gemini API Client
 *
 * Handles communication with Gemini 2.0 Flash Lite API for text analysis
 */

require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the Google Generative AI with your API key
const apiKey = process.env.GEMINI_API_KEY;

// Check if API key is available
if (!apiKey) {
    console.error(
        "ERROR: Gemini API key not found. Please set GEMINI_API_KEY in your .env file."
    );
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// Use Gemini 2.0 Flash Lite model
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
});

// Generation configuration
const generationConfig = {
    temperature: 0.2, // Lower temperature for more deterministic responses
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
};

/**
 * Analyze text using Gemini 2.0 Flash Lite
 * @param {string} text - The text to analyze
 * @param {object} preferences - User preferences for analysis
 * @returns {Promise<Array>} Array of suggestions
 */
async function analyzeText(text, preferences = {}) {
    try {
        // Format the prompt for Gemini
        const prompt = formatPrompt(text, preferences);

        // Create a chat session
        const chatSession = model.startChat({
            generationConfig,
            history: [],
        });

        // Send the message to the chat session
        console.log("Sending text to Gemini API for analysis...");
        const result = await chatSession.sendMessage(prompt);

        // Get the response text
        const responseText = result.response.text();
        console.log("Received response from Gemini API.");

        // Log response details for debugging
        console.log(`Response length: ${responseText.length} characters`);
        console.log(
            `Response starts with: ${responseText.substring(0, 50)}...`
        );

        // Check if the response looks like it might contain JSON
        if (!responseText.includes("{") || !responseText.includes("}")) {
            console.warn("Response does not appear to contain JSON objects");
        }

        // Parse the response
        const suggestions = parseResponse(responseText);

        // If no suggestions were found or parsing failed
        if (!suggestions || suggestions.length === 0) {
            console.log("No suggestions found in Gemini response.");
            return [];
        }

        return suggestions;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error(`Failed to analyze text: ${error.message}`);
    }
}

/**
 * Format a prompt for Gemini API
 * @param {string} text - The text to analyze
 * @param {object} preferences - User preferences for analysis
 * @returns {string} Formatted prompt
 */
function formatPrompt(text, preferences) {
    const {
        language = "en-US",
        checkGrammar = true,
        checkSpelling = true,
        checkStyle = true,
        checkClarity = true,
    } = preferences;

    let prompt = `You are an expert writing assistant specializing in grammar, spelling, style, and clarity improvements. Analyze the following text for `;
    const checks = [];

    if (checkGrammar) checks.push("grammar errors");
    if (checkSpelling) checks.push("spelling errors");
    if (checkStyle) checks.push("style improvements");
    if (checkClarity) checks.push("clarity enhancements");

    prompt += checks.join(", ");
    prompt += `. Use ${language === "en-US" ? "American" : "British"} English.

You will analyze the text and identify issues in these categories:
- Grammar: Subject-verb agreement, tense consistency, article usage, etc.
- Spelling: Misspelled words, typos, incorrect word forms
- Style: Wordiness, passive voice, weak word choices, repetition
- Clarity: Confusing sentences, ambiguous references, overly complex phrasing

For each issue found, you MUST provide:
1. The exact type of issue as one of: "grammar", "spelling", "style", or "clarity"
2. The precise position with start and end index (0-based, character position)
3. The exact problematic text
4. 1-3 suggested corrections
5. A brief, helpful explanation

Your response MUST be a valid JSON array with this exact structure:
[
  {
    "id": "issue-1",
    "type": "spelling",
    "position": {
      "start": 10,
      "end": 15
    },
    "text": "problematic text",
    "suggestions": ["correction1", "correction2"],
    "explanation": "Brief explanation"
  }
]

Critical requirements:
- Return ONLY valid JSON with no markdown formatting, no code blocks, no explanatory text
- Provide accurate character positions (0-based index)
- Include only genuine issues, not stylistic preferences
- Ensure all JSON fields are present for each issue

Text to analyze:
"""
${text}
"""

Respond ONLY with the JSON array.`;

    return prompt;
}

/**
 * Parse Gemini API response
 * @param {string} responseText - The API response text
 * @returns {Array} Array of suggestions
 */
function parseResponse(responseText) {
    try {
        // Try to extract JSON from the response text
        // The model might wrap the JSON in markdown code blocks or add additional text
        let jsonStr = responseText;

        console.log(
            "Raw response from Gemini API:",
            responseText.substring(0, 200) + "..."
        );

        // Check if the response contains a JSON array wrapped in code blocks
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            console.log("Found JSON in code block");
            jsonStr = jsonMatch[1];
        }

        // Try to find a JSON array in the text
        const arrayMatch = responseText.match(/\[\s*{[\s\S]*}\s*\]/);
        if (arrayMatch) {
            console.log("Found JSON array pattern");
            jsonStr = arrayMatch[0];
        }

        // Clean up the string - remove any non-JSON text before or after the array
        jsonStr = jsonStr.trim();
        if (jsonStr.indexOf("[") > 0) {
            jsonStr = jsonStr.substring(jsonStr.indexOf("["));
        }
        if (jsonStr.lastIndexOf("]") < jsonStr.length - 1) {
            jsonStr = jsonStr.substring(0, jsonStr.lastIndexOf("]") + 1);
        }

        // Parse the JSON
        let suggestions = JSON.parse(jsonStr);

        // Validate the suggestions format
        if (!Array.isArray(suggestions)) {
            console.warn("Gemini response is not an array:", suggestions);
            return [];
        }

        // Validate and format each suggestion
        suggestions = suggestions.filter((suggestion) => {
            // Check if the suggestion has all required fields
            if (
                !suggestion.type ||
                !suggestion.position ||
                !suggestion.text ||
                !suggestion.suggestions
            ) {
                console.warn("Invalid suggestion format:", suggestion);
                return false;
            }

            // Ensure the suggestion has an ID
            if (!suggestion.id) {
                suggestion.id = `gemini-${Math.random()
                    .toString(36)
                    .substring(2, 9)}`;
            }

            // Ensure the position has start and end
            if (
                suggestion.position.start === undefined ||
                suggestion.position.end === undefined
            ) {
                console.warn("Invalid position format:", suggestion.position);
                return false;
            }

            // Ensure suggestions is an array
            if (!Array.isArray(suggestion.suggestions)) {
                suggestion.suggestions = [suggestion.suggestions];
            }

            // Ensure explanation exists
            if (!suggestion.explanation) {
                suggestion.explanation = `Consider replacing "${suggestion.text}" with "${suggestion.suggestions[0]}".`;
            }

            return true;
        });

        return suggestions;
    } catch (error) {
        console.error("Error parsing Gemini API response:", error);
        console.error("Response text that failed to parse:", responseText);

        // Try a more lenient approach - look for any JSON-like structures
        try {
            // Look for objects with the expected fields
            const regex =
                /\{[^\{\}]*"type"[^\{\}]*"position"[^\{\}]*"text"[^\{\}]*"suggestions"[^\{\}]*\}/g;
            const matches = responseText.match(regex);

            if (matches && matches.length > 0) {
                console.log(
                    `Found ${matches.length} potential suggestion objects using regex`
                );

                // Try to parse each match and create a valid array
                const validObjects = [];

                for (const match of matches) {
                    try {
                        // Add missing quotes to make it valid JSON if needed
                        let fixedJson = match.replace(
                            /([{,])\s*(\w+)\s*:/g,
                            '$1"$2":'
                        );
                        const obj = JSON.parse(fixedJson);

                        // Ensure it has the required fields
                        if (
                            obj.type &&
                            obj.position &&
                            obj.text &&
                            obj.suggestions
                        ) {
                            // Add an ID if missing
                            if (!obj.id) {
                                obj.id = `gemini-${Math.random()
                                    .toString(36)
                                    .substring(2, 9)}`;
                            }
                            validObjects.push(obj);
                        }
                    } catch (e) {
                        // Skip invalid objects
                        console.log(
                            "Failed to parse potential object:",
                            match.substring(0, 50) + "..."
                        );
                    }
                }

                if (validObjects.length > 0) {
                    console.log(
                        `Successfully recovered ${validObjects.length} suggestion objects`
                    );
                    return validObjects;
                }
            }
        } catch (recoveryError) {
            console.error("Recovery attempt also failed:", recoveryError);
        }

        return [];
    }
}

module.exports = {
    analyzeText,
};
