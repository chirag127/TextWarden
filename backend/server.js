/**
 * TextWarden Backend Server
 *
 * Express.js server that:
 * 1. Handles API requests from the browser extension
 * 2. Communicates with Gemini 2.0 Flash Lite for text analysis
 * 3. Returns suggestions and explanations to the frontend
 */

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const analyzeRoute = require("./routes/analyze");

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
app.use("/analyze", analyzeRoute);

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// Start the server
app.listen(PORT, () => {
    console.log(`TextWarden server running on port ${PORT}`);
});

module.exports = app;
