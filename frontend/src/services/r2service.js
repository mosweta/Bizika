// src/services/r2service.js - Complete Fixed Version
class R2Service {
  constructor() {
    let workerUrl = import.meta.env.VITE_R2_WORKER_URL || 'http://localhost:8787';
    workerUrl = workerUrl.replace(/\/r2$/, '');
    this.workerEndpoint = workerUrl;
    this.apiKey = import.meta.env.VITE_R2_API_KEY;
    
    console.log('R2Service initialized with endpoint:', this.workerEndpoint);
  }

  async uploadFile(file, options = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', options.folder || 'course-resources');
      formData.append('courseId', options.courseId || 'general');
      formData.append('userId', options.userId || 'admin');
      formData.append('metadata', JSON.stringify({
        type: options.type || 'document',
        description: options.description || '',
        category: options.category || 'document',
        ...options.metadata
      }));

      const headers = {
        'X-Request-ID': this.generateRequestId(),
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      };
      
      const response = await fetch(`${this.workerEndpoint}/api/upload`, {
        method: 'POST',
        body: formData,
        headers
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      const result = await response.json();
      return { success: true, data: result.data };
      
    } catch (error) {
      console.error('❌ R2 Upload Error:', error);
      return { 
        success: false, 
        error: error.message,
        data: null
      };
    }
  }

  async deleteFile(key) {
    try {
      const headers = {
        'X-Request-ID': this.generateRequestId(),
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      };
      
      const response = await fetch(`${this.workerEndpoint}/api/delete?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }
      
      const result = await response.json();
      return { success: true, data: result };
      
    } catch (error) {
      console.error('❌ R2 Delete Error:', error);
      return { success: false, error: error.message };
    }
  }

  async getUrl(key) {
    try {
      const response = await fetch(
        `${this.workerEndpoint}/api/signed-url?key=${encodeURIComponent(key)}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get URL');
      }
      
      const result = await response.json();
      return result.data.url;
      
    } catch (error) {
      console.error('❌ R2 URL Error:', error);
      throw error;
    }
  }

  // Alias for getUrl (for backward compatibility)
  async getSignedUrl(key, expiresIn = 3600) {
    return this.getUrl(key);
  }

  async listFiles(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.prefix) params.append('prefix', options.prefix);
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.courseId) params.append('courseId', options.courseId);
      
      const response = await fetch(`${this.workerEndpoint}/api/list?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to list files');
      }
      
      const result = await response.json();
      return result.data.files;
      
    } catch (error) {
      console.error('❌ R2 List Error:', error);
      throw error;
    }
  }

  extractKeyFromUrl(url) {
    try {
      if (url.includes('r2.cloudflarestorage.com')) {
        const urlObj = new URL(url);
        return urlObj.pathname.substring(1); // Remove leading slash
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async batchDeleteFiles(keys) {
    try {
      const results = await Promise.allSettled(
        keys.map(key => this.deleteFile(key))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
      const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => r.reason.message);
      
      return {
        successful,
        failed,
        total: keys.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('Batch delete error:', error);
      return { successful: 0, failed: keys.length, total: keys.length, errors: [error.message] };
    }
  }

  generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export default new R2Service();