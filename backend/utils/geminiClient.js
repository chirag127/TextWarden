/**
 * Gemini API Client
 *
 * Handles communication with Gemini 2.0 Flash Lite API for text analysis
 */

require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the Google Generative AI with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "mock_key");

// Use Gemini 2.0 Flash Lite model
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

/**
 * Analyze text using Gemini 2.0 Flash Lite
 * @param {string} text - The text to analyze
 * @param {object} preferences - User preferences for analysis
 * @returns {Promise<Array>} Array of suggestions
 */
async function analyzeText(text, preferences = {}) {
    try {
        // Check if we have a valid API key
        if (
            !process.env.GEMINI_API_KEY ||
            process.env.GEMINI_API_KEY === "your_api_key_here" ||
            process.env.GEMINI_API_KEY === "mock_key"
        ) {
            console.log(
                "No valid Gemini API key found. Using mock suggestions."
            );
            return generateMockSuggestions(text, preferences);
        }

        // Format the prompt for Gemini
        const prompt = formatPrompt(text, preferences);

        // Call the Gemini API
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();

        // Parse the response
        const suggestions = parseResponse(responseText);

        // If no suggestions were found or parsing failed, fall back to mock suggestions
        if (!suggestions || suggestions.length === 0) {
            console.log(
                "No suggestions found in Gemini response. Using mock suggestions."
            );
            return generateMockSuggestions(text, preferences);
        }

        return suggestions;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        console.log("Falling back to mock suggestions.");
        return generateMockSuggestions(text, preferences);
    }
}

/**
 * Generate mock suggestions for testing
 * @param {string} text - The text to analyze
 * @param {object} preferences - User preferences for analysis
 * @returns {Array} Array of suggestions
 */
function generateMockSuggestions(text, preferences) {
    const suggestions = [];
    let suggestionId = 0;

    // Only generate suggestions for enabled check types
    const {
        checkGrammar = true,
        checkSpelling = true,
        checkStyle = true,
        checkClarity = true,
    } = preferences;

    // Common spelling errors
    if (checkSpelling) {
        const spellingErrors = [
            { error: "teh", correction: "the" },
            { error: "thier", correction: "their" },
            { error: "recieve", correction: "receive" },
            { error: "definately", correction: "definitely" },
            { error: "seperate", correction: "separate" },
            { error: "occured", correction: "occurred" },
            { error: "alot", correction: "a lot" },
            { error: "wierd", correction: "weird" },
            { error: "accomodate", correction: "accommodate" },
            { error: "beleive", correction: "believe" },
            { error: "concious", correction: "conscious" },
            { error: "foriegn", correction: "foreign" },
            { error: "goverment", correction: "government" },
            { error: "gaurd", correction: "guard" },
            { error: "independant", correction: "independent" },
            { error: "liason", correction: "liaison" },
            { error: "millenium", correction: "millennium" },
            { error: "neccessary", correction: "necessary" },
            { error: "occassion", correction: "occasion" },
            { error: "posession", correction: "possession" },
        ];

        for (const { error, correction } of spellingErrors) {
            let index = text.toLowerCase().indexOf(error);

            while (index !== -1) {
                // Check if it's a whole word
                const beforeChar = index === 0 ? " " : text[index - 1];
                const afterChar =
                    index + error.length >= text.length
                        ? " "
                        : text[index + error.length];

                if (isWordBoundary(beforeChar) && isWordBoundary(afterChar)) {
                    suggestions.push({
                        id: `suggestion-${suggestionId++}`,
                        type: "spelling",
                        position: {
                            start: index,
                            end: index + error.length,
                        },
                        text: text.substring(index, index + error.length),
                        suggestions: [correction],
                        explanation: `"${error}" is misspelled. The correct spelling is "${correction}".`,
                    });
                }

                // Find next occurrence
                index = text.toLowerCase().indexOf(error, index + 1);
            }
        }
    }

    // Grammar errors
    if (checkGrammar) {
        const grammarErrors = [
            {
                pattern: /\b(its)\s+(?=a|an|the)\b/gi,
                correction: "it's",
                explanation:
                    'Use "it\'s" (contraction of "it is") instead of "its" (possessive).',
            },
            {
                pattern: /\b(your)\s+(?=welcome|right|correct|the\s+one)\b/gi,
                correction: "you're",
                explanation:
                    'Use "you\'re" (contraction of "you are") instead of "your" (possessive).',
            },
            {
                pattern: /\b(there)\s+(?=is|are|were|was|have|has|going)\b/gi,
                correction: "they're",
                explanation:
                    'Use "they\'re" (contraction of "they are") instead of "there" (location).',
            },
            {
                pattern: /\b(then)\s+(?=than)\b/gi,
                correction: "more",
                explanation: 'Use "more than" instead of "then than".',
            },
            {
                pattern: /\b(affect|effect)\b/gi,
                correction: function (match) {
                    // This is simplified; in reality, you'd need context to determine the correct word
                    return match.toLowerCase() === "affect"
                        ? "effect"
                        : "affect";
                },
                explanation:
                    '"Affect" is usually a verb meaning to influence. "Effect" is usually a noun meaning result.',
            },
        ];

        for (const { pattern, correction, explanation } of grammarErrors) {
            const matches = [...text.matchAll(pattern)];

            for (const match of matches) {
                const index = match.index;
                const matchedText = match[0];
                const correctionText =
                    typeof correction === "function"
                        ? correction(matchedText)
                        : correction;

                suggestions.push({
                    id: `suggestion-${suggestionId++}`,
                    type: "grammar",
                    position: {
                        start: index,
                        end: index + matchedText.length,
                    },
                    text: matchedText,
                    suggestions: [correctionText],
                    explanation: explanation,
                });
            }
        }
    }

    // Style suggestions
    if (checkStyle) {
        const styleImprovements = [
            {
                pattern: /\b(very\s+good)\b/gi,
                correction: "excellent",
                explanation:
                    'Use stronger, more specific adjectives instead of "very" + adjective.',
            },
            {
                pattern: /\b(really\s+bad)\b/gi,
                correction: "terrible",
                explanation:
                    'Use stronger, more specific adjectives instead of "really" + adjective.',
            },
            {
                pattern: /\b(very\s+big)\b/gi,
                correction: "enormous",
                explanation:
                    'Use stronger, more specific adjectives instead of "very" + adjective.',
            },
            {
                pattern: /\b(really\s+small)\b/gi,
                correction: "tiny",
                explanation:
                    'Use stronger, more specific adjectives instead of "really" + adjective.',
            },
            {
                pattern: /\b(a\s+lot\s+of)\b/gi,
                correction: "many",
                explanation:
                    'Use more precise quantifiers instead of "a lot of".',
            },
        ];

        for (const { pattern, correction, explanation } of styleImprovements) {
            const matches = [...text.matchAll(pattern)];

            for (const match of matches) {
                const index = match.index;
                const matchedText = match[0];

                suggestions.push({
                    id: `suggestion-${suggestionId++}`,
                    type: "style",
                    position: {
                        start: index,
                        end: index + matchedText.length,
                    },
                    text: matchedText,
                    suggestions: [correction],
                    explanation: explanation,
                });
            }
        }
    }

    // Clarity improvements
    if (checkClarity) {
        const clarityImprovements = [
            {
                pattern: /\b(in\s+order\s+to)\b/gi,
                correction: "to",
                explanation: '"To" is more concise than "in order to".',
            },
            {
                pattern: /\b(due\s+to\s+the\s+fact\s+that)\b/gi,
                correction: "because",
                explanation:
                    '"Because" is more concise than "due to the fact that".',
            },
            {
                pattern: /\b(at\s+this\s+point\s+in\s+time)\b/gi,
                correction: "now",
                explanation:
                    '"Now" is more concise than "at this point in time".',
            },
            {
                pattern: /\b(for\s+the\s+purpose\s+of)\b/gi,
                correction: "for",
                explanation: '"For" is more concise than "for the purpose of".',
            },
            {
                pattern: /\b(in\s+the\s+event\s+that)\b/gi,
                correction: "if",
                explanation: '"If" is more concise than "in the event that".',
            },
        ];

        for (const {
            pattern,
            correction,
            explanation,
        } of clarityImprovements) {
            const matches = [...text.matchAll(pattern)];

            for (const match of matches) {
                const index = match.index;
                const matchedText = match[0];

                suggestions.push({
                    id: `suggestion-${suggestionId++}`,
                    type: "clarity",
                    position: {
                        start: index,
                        end: index + matchedText.length,
                    },
                    text: matchedText,
                    suggestions: [correction],
                    explanation: explanation,
                });
            }
        }
    }

    return suggestions;
}

/**
 * Check if a character is a word boundary
 * @param {string} char - The character to check
 * @returns {boolean} True if the character is a word boundary
 */
function isWordBoundary(char) {
    return /[\s.,;!?()[\]{}'":]/.test(char) || char === undefined;
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

    let prompt = `Analyze the following text for `;
    const checks = [];

    if (checkGrammar) checks.push("grammar errors");
    if (checkSpelling) checks.push("spelling errors");
    if (checkStyle) checks.push("style improvements");
    if (checkClarity) checks.push("clarity enhancements");

    prompt += checks.join(", ");
    prompt += `. Use ${language === "en-US" ? "American" : "British"} English.

For each issue found, provide:
1. The type of issue (grammar, spelling, style, or clarity)
2. The position (start and end index)
3. The problematic text
4. Suggested corrections
5. A brief explanation

Format your response as a JSON array of objects with the following structure:
{
  "type": "grammar|spelling|style|clarity",
  "position": {
    "start": 0,
    "end": 0
  },
  "text": "problematic text",
  "suggestions": ["correction1", "correction2"],
  "explanation": "Brief explanation"
}

Text to analyze:
"""
${text}
"""`;

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

        // Check if the response contains a JSON array wrapped in code blocks
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonStr = jsonMatch[1];
        }

        // Try to find a JSON array in the text
        const arrayMatch = responseText.match(/\[\s*{[\s\S]*}\s*\]/);
        if (arrayMatch) {
            jsonStr = arrayMatch[0];
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
            if (!suggestion.position.start || !suggestion.position.end) {
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
        return [];
    }
}

module.exports = {
    analyzeText,
};
