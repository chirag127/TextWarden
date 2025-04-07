/**
 * Text Analysis Route
 *
 * Handles the /analyze endpoint for processing text and returning suggestions
 */

const express = require("express");
const router = express.Router();
const { analyzeText } = require("../utils/geminiClient");
const { chunkText } = require("../utils/textChunker");

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
router.post("/", async (req, res) => {
    try {
        const { text, preferences } = req.body;

        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        console.log(
            `Analyzing text (${text.length} characters) with preferences:`,
            preferences
        );

        // Check if text is too long and needs chunking
        const chunks = text.length > 1000 ? chunkText(text, 1000) : [text];
        console.log(`Text split into ${chunks.length} chunks`);

        // Process each chunk and combine results
        const allSuggestions = [];
        let offset = 0;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(
                `Processing chunk ${i + 1}/${chunks.length} (${
                    chunk.length
                } characters)`
            );

            try {
                // Add a small delay between API calls to avoid rate limiting
                if (i > 0) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                }

                const suggestions = await analyzeText(chunk, preferences);
                console.log(
                    `Received ${suggestions.length} suggestions for chunk ${
                        i + 1
                    }`
                );

                // Adjust positions based on offset
                suggestions.forEach((suggestion) => {
                    suggestion.position.start += offset;
                    suggestion.position.end += offset;
                });

                allSuggestions.push(...suggestions);
            } catch (chunkError) {
                console.error(`Error analyzing chunk ${i + 1}:`, chunkError);
                // Continue with other chunks instead of failing completely
            }

            offset += chunk.length;
        }

        console.log(
            `Analysis complete. Returning ${allSuggestions.length} total suggestions`
        );
        res.status(200).json({ suggestions: allSuggestions });
    } catch (error) {
        console.error("Error analyzing text:", error);
        res.status(500).json({
            error: "Failed to analyze text",
            message: error.message,
            stack:
                process.env.NODE_ENV === "development"
                    ? error.stack
                    : undefined,
        });
    }
});

module.exports = router;
