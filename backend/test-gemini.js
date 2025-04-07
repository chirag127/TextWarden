/**
 * Test script for Gemini API integration
 * 
 * This script tests the direct connection to the Gemini API
 * without going through the full TextWarden backend
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Check if API key is available
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('ERROR: Gemini API key not found. Please set GEMINI_API_KEY in your .env file.');
  process.exit(1);
}

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(apiKey);

// Get the model
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-lite',
});

// Generation configuration
const generationConfig = {
  temperature: 0.2,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

// Test text with various errors
const testText = `
This is a test of the TextWarden system. It contians some common spelling errors.
Their are also some grammar mistakes in this sentance.
I recieved your email and I will definately respond soon.
This is a very good product that is really bad for the environment.
In order to improve the quality, we need to make changes due to the fact that our customers are complaining.
`;

// Create a prompt for text analysis
function createPrompt(text) {
  return `You are an expert writing assistant specializing in grammar, spelling, style, and clarity improvements. Analyze the following text for grammar errors, spelling errors, style improvements, clarity enhancements. Use American English.

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
}

// Run the test
async function runTest() {
  try {
    console.log('TextWarden Gemini API Test');
    console.log('-------------------------');
    console.log('Test text:');
    console.log(testText);
    console.log('-------------------------');
    
    console.log('Creating chat session...');
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });
    
    console.log('Sending prompt to Gemini API...');
    const prompt = createPrompt(testText);
    const result = await chatSession.sendMessage(prompt);
    
    console.log('Received response from Gemini API.');
    const responseText = result.response.text();
    
    console.log('-------------------------');
    console.log('Raw response:');
    console.log(responseText);
    console.log('-------------------------');
    
    // Try to parse the response as JSON
    try {
      const suggestions = JSON.parse(responseText);
      console.log(`Successfully parsed ${suggestions.length} suggestions:`);
      
      suggestions.forEach((suggestion, index) => {
        console.log(`\n[${index + 1}] ${suggestion.type.toUpperCase()} ISSUE:`);
        console.log(`Text: "${suggestion.text}"`);
        console.log(`Position: ${suggestion.position.start}-${suggestion.position.end}`);
        console.log(`Suggestions: ${suggestion.suggestions.join(', ')}`);
        console.log(`Explanation: ${suggestion.explanation}`);
      });
      
      console.log('\n-------------------------');
      console.log('Test completed successfully!');
    } catch (error) {
      console.error('Failed to parse response as JSON:', error);
      
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        console.log('Found JSON in code block, trying to parse it...');
        try {
          const suggestions = JSON.parse(jsonMatch[1]);
          console.log(`Successfully parsed ${suggestions.length} suggestions from code block.`);
        } catch (e) {
          console.error('Failed to parse JSON from code block:', e);
        }
      }
      
      // Try to find a JSON array in the text
      const arrayMatch = responseText.match(/\[\s*{[\s\S]*}\s*\]/);
      if (arrayMatch) {
        console.log('Found JSON array pattern, trying to parse it...');
        try {
          const suggestions = JSON.parse(arrayMatch[0]);
          console.log(`Successfully parsed ${suggestions.length} suggestions from array pattern.`);
        } catch (e) {
          console.error('Failed to parse JSON from array pattern:', e);
        }
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runTest();
