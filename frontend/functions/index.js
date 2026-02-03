// functions/index.js - CORRECTED VERSION
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, onRequest } = require("firebase-functions/v2/https");
const { HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { S3Client, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Initialize Firebase Admin FIRST
const adminApp = initializeApp();

// ----- GLOBAL VARIABLES -----
let r2Client = null;

// ----- HELPER FUNCTION FOR CONFIG -----
const getFirebaseConfig = () => {
  // In Firebase Cloud Functions, config is available via process.env
  // For Firebase Functions, we should use functions.config() but need to require it properly
  try {
    // Import functions inside the helper to avoid circular dependencies
    const functions = require('firebase-admin/functions');
    const adminFunctions = functions.getFunctions(adminApp);
    
    // Get runtime config
    const config = process.env.FUNCTIONS_EMULATOR 
      ? require('./config.json') // Local development
      : require('firebase-functions').config(); // Production
    
    console.log("📋 Config keys:", Object.keys(config || {}));
    
    return config;
  } catch (error) {
    console.error("Error getting config:", error);
    
    // Fallback to environment variables (for local development)
    return {
      r2: {
        account_id: process.env.R2_ACCOUNT_ID,
        access_key: process.env.R2_ACCESS_KEY,
        secret_key: process.env.R2_SECRET_KEY,
        bucket_name: process.env.R2_BUCKET_NAME || "bizika-web"
      }
    };
  }
};

// ----- R2 CLIENT HELPER (FIXED) -----
const getR2Client = () => {
  if (!r2Client) {
    try {
      console.log("🔄 Initializing R2 client...");
      
      // Get config
      const config = getFirebaseConfig();
      
      if (!config.r2) {
        console.error("❌ R2 config not found");
        console.error("Available config:", config);
        throw new Error("R2 configuration missing");
      }
      
      const { account_id, access_key, secret_key, bucket_name } = config.r2;
      
      console.log("🔑 R2 Config loaded:", {
        accountId: account_id ? account_id.substring(0, 10) + '...' : 'MISSING',
        hasAccessKey: !!access_key,
        hasSecretKey: !!secret_key,
        bucketName: bucket_name || 'bizika-web'
      });
      
      if (!account_id || !access_key || !secret_key) {
        throw new Error(`Missing R2 credentials`);
      }
      
      r2Client = new S3Client({
        region: "auto",
        endpoint: `https://${account_id}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: access_key,
          secretAccessKey: secret_key,
        },
      });
      
      console.log("✅ R2 Client initialized successfully");
      
    } catch (error) {
      console.error("❌ Failed to initialize R2 client:", error);
      console.error("Error stack:", error.stack);
      throw error;
    }
  }
  return r2Client;
};

// ----- HELPER FUNCTIONS -----
const isAdmin = async (userId) => {
  const firestore = getFirestore();
  const userDoc = await firestore.collection("users").doc(userId).get();
  return userDoc.exists && userDoc.data().role === "admin";
};

// ----- CLOUD FUNCTIONS -----

// 1. Update Course Rating (EXISTING - Keep as is)
exports.updateCourseRating = onDocumentWritten(
  {
    document: "reviews/{reviewId}",
    region: "africa-south1",
    timeoutSeconds: 30,
    memory: "128MB",
    maxInstances: 3,
  },
  async (event) => {
    // ... keep existing code unchanged ...
    try {
      const review = event.data.after.data() || event.data.before.data();
      
      if (!review || !review.courseId) {
        console.log("No courseId found, skipping update");
        return;
      }
      
      const courseId = review.courseId;
      console.log(`Updating rating for course: ${courseId}`);

      const firestore = getFirestore();
      
      const reviewsSnapshot = await firestore
        .collection("reviews")
        .where("courseId", "==", courseId)
        .get();

      let totalRating = 0;
      let reviewCount = 0;
      
      reviewsSnapshot.forEach((doc) => {
        const rating = doc.data().rating;
        if (rating >= 1 && rating <= 5) {
          totalRating += rating;
          reviewCount++;
        }
      });

      const averageRating = reviewCount > 0
        ? Math.round((totalRating / reviewCount) * 10) / 10
        : 0;

      console.log(`Calculated: ${averageRating} from ${reviewCount} reviews`);

      await firestore
        .collection("courses")
        .doc(courseId)
        .update({
          averageRating,
          totalReviews: reviewCount,
          updatedAt: FieldValue.serverTimestamp(),
        });

      console.log(`✅ Successfully updated course: ${courseId}`);

    } catch (error) {
      console.error("Error updating course rating:", error);
    }
  }
);

// 2. HTTP Function with CORS (FIXED NAME)
exports.generateResourceUrlHttpEndpoint = onRequest(  // ← CHANGED NAME
  {
    region: "africa-south1",
    cors: true,
    timeoutSeconds: 30,
    memory: "256MB",
    maxInstances: 5,
  },
  async (req, res) => {
    console.log("🌐 HTTP Function called");
    
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.status(204).send("");
      return;
    }
    
    try {
      // Check auth
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      
      const { fileKey, expiresIn = 3600 } = req.body;
      
      if (!fileKey) {
        res.status(400).json({ error: "File key required" });
        return;
      }
      
      const client = getR2Client();
      const bucketName = "bizika-web";
      
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });
      
      const signedUrl = await getSignedUrl(client, command, { 
        expiresIn: expiresIn 
      });
      
      res.json({
        success: true,
        url: signedUrl,
        expiresAt: Date.now() + (expiresIn * 1000),
        fileKey
      });
      
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// 3. Callable Function (FIXED)
exports.generateResourceUrl = onCall(
  {
    region: "africa-south1",
    timeoutSeconds: 30,
    memory: "256MB",
    maxInstances: 5,
    cors: [
      "http://localhost:5173",
      "http://192.168.1.111:5173",
      "http://localhost:3000",
      "https://bizika-web.vercel.app"
    ],
  },
  async (request) => {
    console.log("🚀 === generateResourceUrl START ===");
    console.log("👤 User:", request.auth?.uid);
    console.log("📁 File key:", request.data?.fileKey);
    console.log("⏱️ Expires in:", request.data?.expiresIn || 3600);
    
    try {
      // 1. Authentication check
      if (!request.auth) {
        console.error("❌ No authentication");
        throw new HttpsError("unauthenticated", "Must be authenticated");
      }

      const { fileKey, expiresIn = 3600 } = request.data || {};
      
      if (!fileKey) {
        console.error("❌ No fileKey provided");
        throw new HttpsError("invalid-argument", "File key is required");
      }

      // 2. Get R2 client
      console.log("🔄 Getting R2 client...");
      const client = getR2Client();
      
      // 3. Set bucket name
      const bucketName = "bizika-web";
      console.log(`📦 Using bucket: ${bucketName}`);
      console.log(`🗂️ File path: ${fileKey}`);

      // 4. Create S3 command
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });

      // 5. Generate signed URL
      console.log("🔐 Generating signed URL...");
      const signedUrl = await getSignedUrl(client, command, { 
        expiresIn: expiresIn 
      });
      
      console.log(`✅ Generated URL length: ${signedUrl.length} chars`);
      console.log(`🔗 URL preview: ${signedUrl.substring(0, 100)}...`);
      console.log("🎉 === FUNCTION SUCCESS ===");
      
      return { 
        success: true, 
        url: signedUrl,
        expiresAt: Date.now() + (expiresIn * 1000),
        fileKey
      };
      
    } catch (error) {
      console.error("💥 === FUNCTION ERROR ===");
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
      
      // Specific error handling
      if (error.name === 'NoSuchKey' || error.code === 'NoSuchKey') {
        throw new HttpsError("not-found", "File not found in storage");
      } else if (error.name === 'AccessDenied' || error.code === 'AccessDenied') {
        throw new HttpsError("permission-denied", "Access denied to storage");
      } else if (error.message.includes("R2 configuration")) {
        throw new HttpsError("failed-precondition", "Server configuration error");
      } else if (error.message.includes("credentials")) {
        throw new HttpsError("failed-precondition", "Invalid storage credentials");
      }
      
      // Generic error
      throw new HttpsError("internal", 
        `Failed to generate download URL: ${error.message}`);
    }
  }
);

// 4. Delete R2 file (callable function) - Keep as is
exports.deleteResource = onCall(
  {
    region: "africa-south1",
    timeoutSeconds: 30,
    memory: "256MB",
    maxInstances: 5,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be authenticated");
      }

      const { fileKey } = request.data;
      
      if (!fileKey) {
        throw new HttpsError("invalid-argument", "File key is required");
      }

      const userIsAdmin = await isAdmin(request.auth.uid);
      if (!userIsAdmin) {
        throw new HttpsError("permission-denied", "Admin access required");
      }

      const client = getR2Client();
      const bucketName = "bizika-web";

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });

      await client.send(command);
      
      return { 
        success: true,
        message: "File deleted successfully",
        fileKey
      };
      
    } catch (error) {
      console.error("Error deleting R2 file:", error);
      throw new HttpsError("internal", error.message || "Failed to delete file");
    }
  }
);

// 5. Clean up orphaned R2 files - Keep as is
exports.cleanupCourseResources = onCall(
  {
    region: "africa-south1",
    timeoutSeconds: 60,
    memory: "512MB",
    maxInstances: 3,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be authenticated");
      }

      const userIsAdmin = await isAdmin(request.auth.uid);
      if (!userIsAdmin) {
        throw new HttpsError("permission-denied", "Admin access required");
      }

      const { courseId } = request.data;
      
      if (!courseId) {
        throw new HttpsError("invalid-argument", "Course ID is required");
      }

      const firestore = getFirestore();
      const client = getR2Client();
      const bucketName = "bizika-web";

      const lessonsSnapshot = await firestore
        .collection("courses")
        .doc(courseId)
        .collection("lessons")
        .get();

      let deletedCount = 0;
      const errors = [];

      for (const lessonDoc of lessonsSnapshot.docs) {
        const lesson = lessonDoc.data();
        
        const resourceArrays = [
          ...(lesson.slides || []),
          ...(lesson.documents || []),
          ...(lesson.templates || []),
          ...(lesson.resources || [])
        ];

        for (const resource of resourceArrays) {
          if (resource.key || resource.fileName) {
            try {
              const fileKey = resource.key || resource.fileName;
              
              const command = new DeleteObjectCommand({
                Bucket: bucketName,
                Key: fileKey,
              });

              await client.send(command);
              deletedCount++;
              console.log(`Deleted: ${fileKey}`);
            } catch (error) {
              console.error(`Failed to delete ${resource.key}:`, error);
              errors.push({ file: resource.key, error: error.message });
            }
          }
        }
      }

      return {
        success: true,
        deletedCount,
        errors: errors.length > 0 ? errors : null,
        message: `Cleaned up ${deletedCount} files${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
      };

    } catch (error) {
      console.error("Error cleaning up course resources:", error);
      throw new HttpsError("internal", error.message || "Failed to clean up resources");
    }
  }
);

// 6. Batch generate signed URLs - Keep as is
exports.batchGenerateUrls = onCall(
  {
    region: "africa-south1",
    timeoutSeconds: 30,
    memory: "256MB",
    maxInstances: 5,
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be authenticated");
      }

      const { fileKeys, expiresIn = 3600 } = request.data;
      
      if (!fileKeys || !Array.isArray(fileKeys)) {
        throw new HttpsError("invalid-argument", "File keys array is required");
      }

      const client = getR2Client();
      const bucketName = "bizika-web";

      const urlPromises = fileKeys.map(async (fileKey) => {
        try {
          const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
          });

          const signedUrl = await getSignedUrl(client, command, { expiresIn });
          
          return {
            fileKey,
            url: signedUrl,
            expiresAt: Date.now() + (expiresIn * 1000),
            success: true
          };
        } catch (error) {
          return {
            fileKey,
            error: error.message,
            success: false
          };
        }
      });

      const results = await Promise.all(urlPromises);
      
      return {
        success: true,
        results,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error("Error batch generating URLs:", error);
      throw new HttpsError("internal", error.message || "Failed to generate URLs");
    }
  }
);