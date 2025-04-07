/**
 * TextWarden Backend Test
 * 
 * This script tests the text analysis functionality of the backend
 */

const { analyzeText } = require('./utils/geminiClient');

// Test text with various errors
const testText = `
This is a test of the TextWarden system. It contians some common spelling errors.
Their are also some grammar mistakes in this sentance.
I recieved your email and I will definately respond soon.
This is a very good product that is really bad for the environment.
In order to improve the quality, we need to make changes due to the fact that our customers are complaining.
`;

// Test preferences
const testPreferences = {
  language: 'en-US',
  checkGrammar: true,
  checkSpelling: true,
  checkStyle: true,
  checkClarity: true
};

// Run the test
async function runTest() {
  console.log('TextWarden Backend Test');
  console.log('----------------------');
  console.log('Test text:');
  console.log(testText);
  console.log('----------------------');
  
  try {
    console.log('Analyzing text...');
    const suggestions = await analyzeText(testText, testPreferences);
    
    console.log('Analysis complete!');
    console.log('----------------------');
    console.log(`Found ${suggestions.length} suggestions:`);
    
    suggestions.forEach((suggestion, index) => {
      console.log(`\n[${index + 1}] ${suggestion.type.toUpperCase()} ISSUE:`);
      console.log(`Text: "${suggestion.text}"`);
      console.log(`Position: ${suggestion.position.start}-${suggestion.position.end}`);
      console.log(`Suggestions: ${suggestion.suggestions.join(', ')}`);
      console.log(`Explanation: ${suggestion.explanation}`);
    });
    
    console.log('\n----------------------');
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runTest();
