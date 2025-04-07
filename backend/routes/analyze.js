/**
 * Text Analysis Route
 * 
 * Handles the /analyze endpoint for processing text and returning suggestions
 */

const express = require('express');
const router = express.Router();
const { analyzeText } = require('../utils/geminiClient');
const { chunkText } = require('../utils/textChunker');

/**
 * POST /analyze
 * 
 * Analyzes text and returns suggestions
 * 
 * Request body:
 * {
 *   text: string,
 *   preferences: {
 *     language: string,
 *     checkGrammar: boolean,
 *     checkSpelling: boolean,
 *     checkStyle: boolean,
 *     checkClarity: boolean
 *   }
 * }
 * 
 * Response:
 * {
 *   suggestions: [
 *     {
 *       id: string,
 *       type: string,
 *       position: {
 *         start: number,
 *         end: number
 *       },
 *       text: string,
 *       suggestions: string[],
 *       explanation: string
 *     }
 *   ]
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { text, preferences } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Check if text is too long and needs chunking
    const chunks = text.length > 1000 ? chunkText(text, 1000) : [text];
    
    // Process each chunk and combine results
    const allSuggestions = [];
    let offset = 0;
    
    for (const chunk of chunks) {
      const suggestions = await analyzeText(chunk, preferences);
      
      // Adjust positions based on offset
      suggestions.forEach(suggestion => {
        suggestion.position.start += offset;
        suggestion.position.end += offset;
      });
      
      allSuggestions.push(...suggestions);
      offset += chunk.length;
    }
    
    res.status(200).json({ suggestions: allSuggestions });
  } catch (error) {
    console.error('Error analyzing text:', error);
    res.status(500).json({ error: 'Failed to analyze text' });
  }
});

module.exports = router;
