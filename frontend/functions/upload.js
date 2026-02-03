const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const express = require("express");
const cors = require("cors");
const multer = require("multer");

// Set region
setGlobalOptions({
  region: "africa-south1",
});

// Initialize Express app
const app = express();

// CORS configuration
app.use(cors({ origin: true }));

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});

// ========== ROUTES ==========

// Health check endpoint - MUST BE FIRST
app.get("/health", (req, res) => {
  console.log("Health check called");
  res.json({
    status: "healthy",
    service: "upload-service",
    timestamp: Date.now(),
    secretsLoaded: !!process.env.R2_ACCOUNT_ID,
  });
});

// Upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    console.log("Upload endpoint called");
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }
    
    // For now, just return success to test
    res.json({
      success: true,
      message: "File received",
      file: {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
      },
    });
    
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Catch-all route for debugging
app.all("/*", (req, res) => {
  console.log(`Unhandled route: ${req.method} ${req.path}`);
  res.status(404).json({
    error: "Route not found",
    method: req.method,
    path: req.path,
    availableRoutes: ["GET /health", "POST /upload"],
  });
});

// ========== EXPORT ==========
// This is the key part - export the Express app directly
exports.uploadResource = onRequest({
  secrets: [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_DOMAIN",
  ],
  timeoutSeconds: 60,
  memory: "256MiB",
}, app);