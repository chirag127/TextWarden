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
    responseModalities: [],
    responseMimeType: "text/plain",
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
        checkClarity = true 
    } = preferences;
    
    let prompt = `You are an expert writing assistant. Analyze the following text for `;
    const checks = [];
    
    if (checkGrammar) checks.push('grammar errors');
    if (checkSpelling) checks.push('spelling errors');
    if (checkStyle) checks.push('style improvements');
    if (checkClarity) checks.push('clarity enhancements');
    
    prompt += checks.join(', ');
    prompt += `. Use ${language === 'en-US' ? 'American' : 'British'} English.

For each issue found, provide:
1. The type of issue (grammar, spelling, style, or clarity)
2. The position (start and end index, 0-based)
3. The problematic text
4. Suggested corrections
5. A brief explanation

Format your response as a JSON array of objects with the following structure:
[
  {
    "id": "unique-id",
    "type": "grammar|spelling|style|clarity",
    "position": {
      "start": 0,
      "end": 0
    },
    "text": "problematic text",
    "suggestions": ["correction1", "correction2"],
    "explanation": "Brief explanation"
  }
]

Make sure to:
- Provide accurate start and end positions (0-based index)
- Include only real issues, not stylistic preferences
- Provide clear, concise explanations
- Format the response as valid JSON

Text to analyze:
"""
${text}
"""

Return ONLY the JSON array with no additional text or explanation.`;

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
            console.warn('Gemini response is not an array:', suggestions);
            return [];
        }
        
        // Validate and format each suggestion
        suggestions = suggestions.filter(suggestion => {
            // Check if the suggestion has all required fields
            if (!suggestion.type || !suggestion.position || !suggestion.text || !suggestion.suggestions) {
                console.warn('Invalid suggestion format:', suggestion);
                return false;
            }
            
            // Ensure the suggestion has an ID
            if (!suggestion.id) {
                suggestion.id = `gemini-${Math.random().toString(36).substring(2, 9)}`;
            }
            
            // Ensure the position has start and end
            if (suggestion.position.start === undefined || suggestion.position.end === undefined) {
                console.warn('Invalid position format:', suggestion.position);
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
