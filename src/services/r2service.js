// src/services/r2service.js
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Create a singleton instance
class R2Service {
  constructor() {
    // Get environment variables
    const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
    const accessKeyId = import.meta.env.VITE_R2_ACCESS_KEY_ID;
    const secretAccessKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
    const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;
    
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      console.warn('R2 environment variables not fully configured');
    }
    
    // Initialize S3 client for R2
    this.client = new S3Client({
      region: "auto", // Required for R2
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
      forcePathStyle: true, // Important for R2
    });
    
    this.bucketName = bucketName;
    this.publicDomain = import.meta.env.VITE_R2_PUBLIC_DOMAIN || `${accountId}.r2.cloudflarestorage.com`;
  }

  // Generate unique filename
  generateUniqueFileName(originalName) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop() || '';
    const nameWithoutExt = originalName.lastIndexOf('.') > 0 
      ? originalName.substring(0, originalName.lastIndexOf('.'))
      : originalName;
    
    // Clean filename
    const cleanName = nameWithoutExt
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 100);
    
    return extension ? `${timestamp}_${randomString}_${cleanName}.${extension}` : `${timestamp}_${randomString}_${cleanName}`;
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Upload file to R2
  async uploadFile(file, folder = 'course-resources') {
    try {
      console.log('📤 Starting R2 upload for:', file.name);
      
      const fileName = this.generateUniqueFileName(file.name);
      const key = `${folder}/${fileName}`;
      
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: file.type || 'application/octet-stream',
        Metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          size: file.size.toString(),
          uploadedBy: 'course-manager'
        }
      };

      console.log('📁 Upload params:', { 
        bucket: this.bucketName, 
        key, 
        size: file.size 
      });
      
      // Upload file
      const command = new PutObjectCommand(params);
      const result = await this.client.send(command);
      
      console.log('✅ File uploaded successfully:', result);
      
      // Construct public URL
      const publicUrl = `https://${this.publicDomain}/${key}`;
      
      return {
        url: publicUrl,
        key: key,
        fileName: fileName,
        originalName: file.name,
        size: this.formatFileSize(file.size),
        rawSize: file.size,
        type: file.type || this.getFileType(file.name),
        uploadedAt: new Date().toISOString(),
        publicUrl: publicUrl,
        etag: result.ETag
      };
      
    } catch (error) {
      console.error('❌ Error uploading to R2:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Get signed URL for download
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      
      const url = await getSignedUrl(this.client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  // Delete file from R2
  async deleteFile(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      
      await this.client.send(command);
      console.log('✅ File deleted from R2:', key);
      return true;
    } catch (error) {
      console.error('Error deleting file from R2:', error);
      throw error;
    }
  }

  // Helper to determine file type from extension
  getFileType(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    const typeMap = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'zip': 'application/zip',
      'txt': 'text/plain'
    };
    
    return typeMap[extension] || 'application/octet-stream';
  }
}

export default R2Service;