// src/services/r2service.js - Updated version
class R2Service {
  constructor() {
    // Remove trailing /r2 if present
    let workerUrl = import.meta.env.VITE_R2_WORKER_URL || 'http://localhost:8787';
    workerUrl = workerUrl.replace(/\/r2$/, '');
    this.workerEndpoint = workerUrl;
    this.apiKey = import.meta.env.VITE_R2_API_KEY;
    
    console.log('📦 R2Service initialized with endpoint:', this.workerEndpoint);
  }

  // Helper method for API calls
  async _fetchApi(endpoint, options = {}) {
    try {
      const url = `${this.workerEndpoint}${endpoint}`;
      console.log(`📡 API Call: ${options.method || 'GET'} ${url}`);
      
      const headers = {
        'X-Request-ID': this.generateRequestId(),
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        ...options.headers
      };
      
      const response = await fetch(url, { ...options, headers });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}`,
          message: response.statusText
        }));
        throw new Error(errorData.error || errorData.message || 'API request failed');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Operation failed');
      }
      
      return result.data;
      
    } catch (error) {
      console.error(`❌ API Error (${endpoint}):`, error);
      throw error;
    }
  }

// Enhanced R2Service with progress tracking
// Add to your R2Service class in r2service.js:

async uploadFile(file, metadata = {}, onProgress) {
  try {
    console.log(`📤 Uploading: ${file.name} (${this.formatBytes(file.size)})`);
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Add metadata
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (key !== 'file') {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
        }
      });
    }
    
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (result.success) {
              resolve({ success: true, data: result.data });
            } else {
              reject(new Error(result.error || 'Upload failed'));
            }
          } catch (error) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });
      
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });
      
      xhr.open('POST', `${this.workerEndpoint}/api/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${this.apiKey}`);
      xhr.send(formData);
    });
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
    return { 
      success: false, 
      error: error.message,
      data: null 
    };
  }
}

  // Delete file
  async deleteFile(key) {
    try {
      console.log(`🗑️ Deleting: ${key}`);
      const result = await this._fetchApi(`/api/delete?key=${encodeURIComponent(key)}`, {
        method: 'DELETE'
      });
      
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get file URL
// In R2Service class - ensure getUrl returns a string URL
async getUrl(key) {
  try {
    const result = await this._fetchApi(`/api/signed-url?key=${encodeURIComponent(key)}`);
    
    // Ensure we return a string URL
    if (typeof result === 'string') {
      return result;
    } else if (result?.url) {
      return result.url;
    } else if (result?.signedUrl) {
      return result.signedUrl;
    } else {
      // Fallback: construct URL
      return `${this.workerEndpoint}/cdn/${key}`;
    }
  } catch (error) {
    console.error('Failed to get URL:', error);
    // Fallback URL
    return `${this.workerEndpoint}/cdn/${key}`;
  }
}

  // List files
  async listFiles(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.prefix) params.append('prefix', options.prefix);
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.courseId) params.append('courseId', options.courseId);
      
      const result = await this._fetchApi(`/api/list?${params.toString()}`);
      return result.files;
    } catch (error) {
      console.error('List files error:', error);
      // Return empty array instead of throwing for better UX
      return [];
    }
  }

  // Get storage statistics
  async getStorageStats() {
    try {
      const files = await this.listFiles({ limit: 1000 });
      const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
      const fileCount = files.length;
      
      // Group by type
      const byType = files.reduce((acc, file) => {
        const type = file.metadata?.type || 
                    file.metadata?.contentType?.split('/')[0] || 
                    'other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      return {
        totalSize,
        fileCount,
        formattedSize: this.formatBytes(totalSize),
        byType,
        files
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalSize: 0,
        fileCount: 0,
        formattedSize: '0 Bytes',
        byType: {},
        files: []
      };
    }
  }

  // Batch operations
  async batchDeleteFiles(keys) {
    const results = await Promise.allSettled(
      keys.map(key => this.deleteFile(key))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    
    return {
      successful,
      failed,
      total: keys.length
    };
  }

  // Extract key from URL
  extractKeyFromUrl(url) {
    if (!url) return null;
    
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      // Handle different URL patterns
      if (path.startsWith('/cdn/')) {
        return path.substring(5); // Remove '/cdn/'
      }
      
      // Remove leading slash
      return path.startsWith('/') ? path.substring(1) : path;
    } catch {
      return null;
    }
  }

  // Utility methods
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Test connection
  async testConnection() {
    try {
      const response = await fetch(`${this.workerEndpoint}/health`);
      const data = await response.json();
      return { 
        connected: response.ok, 
        status: data.status || 'unknown' 
      };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
}

// Export singleton
export default new R2Service();