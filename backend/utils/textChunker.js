/**
 * Text Chunking Utility
 * 
 * Splits large text into smaller chunks for processing while preserving:
 * 1. Sentence boundaries
 * 2. Paragraph structure
 * 3. Context between chunks
 */

/**
 * Split text into chunks of approximately the specified size
 * @param {string} text - The text to chunk
 * @param {number} maxChunkSize - Maximum size of each chunk
 * @param {number} overlap - Number of characters to overlap between chunks
 * @returns {string[]} Array of text chunks
 */
function chunkText(text, maxChunkSize = 1000, overlap = 100) {
  // If text is smaller than max chunk size, return it as is
  if (text.length <= maxChunkSize) {
    return [text];
  }
  
  const chunks = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    // Calculate end index for this chunk
    let endIndex = startIndex + maxChunkSize;
    
    // Don't go beyond text length
    if (endIndex > text.length) {
      endIndex = text.length;
    } else {
      // Try to find a sentence boundary
      const sentenceBoundary = findSentenceBoundary(text, endIndex);
      if (sentenceBoundary > startIndex) {
        endIndex = sentenceBoundary;
      } else {
        // If no sentence boundary, try to find a word boundary
        const wordBoundary = findWordBoundary(text, endIndex);
        if (wordBoundary > startIndex) {
          endIndex = wordBoundary;
        }
      }
    }
    
    // Extract the chunk
    chunks.push(text.substring(startIndex, endIndex));
    
    // Move to next chunk with overlap
    startIndex = endIndex - overlap;
    
    // Ensure we're making progress
    if (startIndex >= text.length || endIndex === text.length) {
      break;
    }
    
    // Avoid starting in the middle of a word
    if (startIndex > 0 && !isWhitespace(text[startIndex])) {
      const wordStart = findWordStart(text, startIndex);
      if (wordStart > 0) {
        startIndex = wordStart;
      }
    }
  }
  
  return chunks;
}

/**
 * Find the nearest sentence boundary before the given index
 * @param {string} text - The text to search
 * @param {number} index - The index to search from
 * @returns {number} Index of the sentence boundary
 */
function findSentenceBoundary(text, index) {
  // Look for sentence-ending punctuation followed by whitespace or end of text
  for (let i = index; i >= Math.max(0, index - 100); i--) {
    if (i < text.length && (text[i] === '.' || text[i] === '!' || text[i] === '?')) {
      // Check if this is actually the end of a sentence (not part of an abbreviation, etc.)
      if (i + 1 === text.length || isWhitespace(text[i + 1])) {
        return i + 1;
      }
    }
  }
  
  return -1;
}

/**
 * Find the nearest word boundary before the given index
 * @param {string} text - The text to search
 * @param {number} index - The index to search from
 * @returns {number} Index of the word boundary
 */
function findWordBoundary(text, index) {
  for (let i = index; i >= Math.max(0, index - 50); i--) {
    if (isWhitespace(text[i])) {
      return i + 1;
    }
  }
  
  return index;
}

/**
 * Find the start of a word after the given index
 * @param {string} text - The text to search
 * @param {number} index - The index to search from
 * @returns {number} Index of the word start
 */
function findWordStart(text, index) {
  for (let i = index; i < Math.min(text.length, index + 50); i++) {
    if (isWhitespace(text[i])) {
      return i + 1;
    }
  }
  
  return index;
}

/**
 * Check if a character is whitespace
 * @param {string} char - The character to check
 * @returns {boolean} True if the character is whitespace
 */
function isWhitespace(char) {
  return /\s/.test(char);
}

module.exports = {
  chunkText
};
