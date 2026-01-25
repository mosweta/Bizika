// src/services/r2Service.js
import { S3Client, PutObjectCommand, DeleteObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";

class R2Service {
  static s3Client = null;
  
  static getConfig() {
    return {
      accountId: import.meta.env.VITE_R2_ACCOUNT_ID,
      accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY,
      secretAccessKey: import.meta.env.VITE_R2_SECRET_KEY,
      bucketName: import.meta.env.VITE_R2_BUCKET_NAME,
      publicDomain: import.meta.env.VITE_R2_PUBLIC_DOMAIN
    };
  }
  
  static initialize() {
    if (!this.s3Client) {
      const config = this.getConfig();
      const { accountId, accessKeyId, secretAccessKey } = config;
      
      if (!accountId || !accessKeyId || !secretAccessKey) {
        console.error("R2 configuration missing. Check your .env file:", config);
        throw new Error("R2 configuration missing. Please check your .env file.");
      }
      
      // Create S3 client with browser-compatible configuration
      this.s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
        // Add these options for browser compatibility
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      });
      
      console.log("✅ R2 Client initialized successfully");
    }
  }

  // File validation constants
  static ALLOWED_FILE_TYPES = {
    'application/pdf': ['pdf'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
    'application/vnd.ms-excel': ['xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
    'application/vnd.ms-powerpoint': ['ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
    'application/zip': ['zip'],
    'text/plain': ['txt'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'video/mp4': ['mp4'],
    'video/webm': ['webm'],
  };

  static MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  static validateFile(file) {
    const fileType = file.type;
    const fileSize = file.size;

    if (fileSize > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds ${this.MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
    }

    if (!this.ALLOWED_FILE_TYPES[fileType] && 
        !Object.keys(this.ALLOWED_FILE_TYPES).some(type => 
          this.ALLOWED_FILE_TYPES[type].some(ext => 
            file.name.toLowerCase().endsWith(`.${ext}`)
          )
        )) {
      const allowedExtensions = Object.values(this.ALLOWED_FILE_TYPES)
        .flat()
        .map(ext => ext.toUpperCase())
        .join(', ');
      throw new Error(`File type not supported. Allowed: ${allowedExtensions}`);
    }

    return true;
  }

  static generateFileName(file, prefix = 'course-resources') {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const originalName = file.name.replace(/\.[^/.]+$/, "");
    const safeName = originalName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const extension = file.name.split('.').pop().toLowerCase();
    
    return `${prefix}/${timestamp}_${randomString}_${safeName}.${extension}`;
  }

  // Upload file to R2 - Browser compatible version
  static async uploadFile(file, folder = 'course-resources') {
    try {
      console.log("Starting R2 upload...");
      this.initialize();
      this.validateFile(file);
      
      const config = this.getConfig();
      const fileName = this.generateFileName(file, folder);
      const fileType = file.type;

      console.log('Uploading to R2:', {
        fileName,
        fileType,
        size: this.formatFileSize(file.size),
        bucket: config.bucketName
      });

      // Convert File to ArrayBuffer for browser compatibility
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const uploadCommand = new PutObjectCommand({
        Bucket: config.bucketName,
        Key: fileName,
        Body: uint8Array, // Use Uint8Array instead of File
        ContentType: fileType,
        Metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          size: file.size.toString(),
        },
      });

      console.log("Sending upload command to R2...");
      await this.s3Client.send(uploadCommand);
      
      // Generate public URL
      const publicUrl = `${config.publicDomain}/${fileName}`;

      console.log('✅ Upload successful:', publicUrl);

      return {
        url: publicUrl,
        fileName: fileName,
        originalName: file.name,
        size: this.formatFileSize(file.size),
        type: this.getFileType(file),
        uploadedAt: new Date().toISOString(),
        key: fileName,
        publicUrl: publicUrl,
      };

    } catch (error) {
      console.error('❌ Error uploading to R2:', error);
      
      // Provide more helpful error messages
      if (error.name === 'CredentialsProviderError') {
        throw new Error('R2 credentials are invalid. Please check your API keys.');
      } else if (error.name === 'AccessDenied') {
        throw new Error('Access denied. Check bucket permissions and CORS settings.');
      } else if (error.message.includes('getReader')) {
        throw new Error('Browser compatibility issue. Please try a different file or browser.');
      }
      
      throw error;
    }
  }

  // Alternative upload method using fetch API (simpler, more reliable)
  static async uploadFileViaPresignedUrl(file, folder = 'course-resources') {
    try {
      console.log("Starting R2 upload via presigned URL...");
      this.validateFile(file);
      
      const config = this.getConfig();
      const fileName = this.generateFileName(file, folder);
      const fileType = file.type;

      // Generate presigned URL for upload
      const uploadCommand = new PutObjectCommand({
        Bucket: config.bucketName,
        Key: fileName,
        ContentType: fileType,
      });

      // For presigned URLs, you would need to generate them server-side
      // For now, we'll use direct upload as above
      return await this.uploadFile(file, folder);
      
    } catch (error) {
      console.error('❌ Error uploading via presigned URL:', error);
      throw error;
    }
  }

  // Delete file from R2
  static async deleteFile(fileKey) {
    try {
      this.initialize();
      const config = this.getConfig();
      
      const command = new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      console.log('✅ File deleted from R2:', fileKey);
      return true;
    } catch (error) {
      console.error('Error deleting from R2:', error);
      throw error;
    }
  }

  // Helper methods
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static getFileType(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    const typeMap = {
      pdf: 'pdf',
      doc: 'document',
      docx: 'document',
      xls: 'spreadsheet',
      xlsx: 'spreadsheet',
      ppt: 'presentation',
      pptx: 'presentation',
      txt: 'text',
      zip: 'archive',
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      mp4: 'video',
      webm: 'video',
    };
    return typeMap[extension] || 'file';
  }

  // Check if R2 is configured
  static isConfigured() {
    const config = this.getConfig();
    const { accountId, accessKeyId, secretAccessKey } = config;
    return !!(accountId && accessKeyId && secretAccessKey);
  }
}

export default R2Service;