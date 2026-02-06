// src/index.js - Fixed version for Cloudflare Worker
// Update corsHeaders to include reCAPTCHA token header
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Request-ID, X-Recaptcha-Token',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Expose-Headers': 'X-Upload-Id, X-File-Key, X-File-Size'
};

export default {
  async fetch(request, env, ctx) {
    const { method } = request;
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Handle preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204
      });
    }

    // API routes
    if (pathname === '/api/contact' && method === 'POST') {
      return handleContactForm(request, env);
    }
    
    if (pathname === '/api/upload' && method === 'POST') {
      return handleUpload(request, env);
    }
    
    if (pathname === '/api/delete' && method === 'DELETE') {
      return handleDelete(request, env, url);
    }
    
    if (pathname === '/api/signed-url' && method === 'GET') {
      return handleSignedUrl(request, env, url);
    }
    
    if (pathname === '/api/list' && method === 'GET') {
      return handleList(request, env, url);
    }

    if (pathname === '/health' && method === 'GET') {
      return handleHealth(env);
    }

    if (pathname === '/cdn/' || pathname.startsWith('/cdn/')) {
      return serveFromR2(request, env, pathname);
    }

    // Default response
    return new Response(JSON.stringify({
      message: "Bizika API Running 🚀",
      endpoints: {
        contact: "POST /api/contact",
        upload: "POST /api/upload",
        delete: "DELETE /api/delete?key=FILE_KEY",
        list: "GET /api/list?prefix=PREFIX&limit=LIMIT",
        cdn: "GET /cdn/FILE_KEY",
        health: "GET /health"
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  },
};

// ============================================================================
// UPDATED HANDLERS - SINGLE SET (Remove the old ones at the bottom)
// ============================================================================

// Updated List Handler
async function handleList(request, env, url) {
  try {
    const prefix = url.searchParams.get('prefix') || '';
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const courseId = url.searchParams.get('courseId');
    
    let listPrefix = prefix;
    if (courseId) {
      listPrefix = `uploads/${courseId}/${prefix}`;
    }

    const options = {
      prefix: listPrefix,
      limit: Math.min(limit, 1000)
    };

    console.log('Listing files with options:', options);
    
    const list = await env.CORRESOURCES.list(options);
    
    // Use Promise.all to handle async operations in map
    const files = await Promise.all(
      list.objects.map(async (obj) => {
        const fileName = obj.key.split('/').pop();
        const fileExt = fileName.split('.').pop().toLowerCase();
        
        // Get signed URL (async operation)
        const signedUrl = await env.CORRESOURCES.get(obj.key, { 
          sign: { expiresIn: 3600 } 
        });
        
        return {
          key: obj.key,
          name: fileName,
          originalName: obj.customMetadata?.originalName || fileName,
          size: obj.size,
          formattedSize: formatBytes(obj.size),
          uploaded: obj.uploaded,
          url: `${new URL(request.url).origin}/cdn/${obj.key}`,
          signedUrl,
          metadata: {
            contentType: obj.httpMetadata?.contentType || getFileType(obj.key),
            originalName: obj.customMetadata?.originalName,
            type: obj.customMetadata?.type || getFileType(obj.key).split('/')[0],
            description: obj.customMetadata?.description,
            courseId: obj.customMetadata?.courseId,
            lessonId: obj.customMetadata?.lessonId,
            ...obj.customMetadata
          }
        };
      })
    );
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        files,
        total: files.length,
        truncated: list.truncated,
        cursor: list.cursor
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    console.error('List error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to list files', 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
// Updated Upload Handler
async function handleUpload(request, env) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Content-Type must be multipart/form-data' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'course-resources';
    const courseId = formData.get('courseId') || 'general';
    const userId = formData.get('userId') || 'admin';
    const metadataStr = formData.get('metadata');
    
    if (!file) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'No file uploaded' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const filename = file.name;
    const fileBuffer = await file.arrayBuffer();
    
    // Parse metadata
    let metadata = {};
    try {
      if (metadataStr) {
        metadata = JSON.parse(metadataStr);
      }
    } catch (e) {
      console.warn('Failed to parse metadata:', e);
    }
    
    // Generate unique key
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${folder}/${courseId}/${timestamp}_${randomId}_${safeFilename}`;
    
    // Upload to R2
    await env.CORRESOURCES.put(key, fileBuffer, {
      httpMetadata: {
        contentType: file.type || getFileType(filename)
      },
      customMetadata: {
        originalName: filename,
        uploadedAt: new Date().toISOString(),
        size: fileBuffer.byteLength.toString(),
        folder,
        courseId,
        userId,
        ...metadata
      }
    });

    // Generate URLs
    const baseUrl = new URL(request.url).origin;
    const fileUrl = `${baseUrl}/cdn/${key}`;
    const signedUrl = await env.CORRESOURCES.get(key, { sign: { expiresIn: 86400 } });
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        key,
        filename,
        originalName: filename,
        size: fileBuffer.byteLength,
        formattedSize: formatBytes(fileBuffer.byteLength),
        url: fileUrl,
        signedUrl,
        contentType: file.type || getFileType(filename),
        metadata: {
          folder,
          courseId,
          userId,
          uploadedAt: new Date().toISOString(),
          ...metadata
        },
        message: 'File uploaded successfully'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Upload failed', 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// Updated Signed URL Handler
async function handleSignedUrl(request, env, url) {
  try {
    const key = url.searchParams.get('key');
    const expiresIn = parseInt(url.searchParams.get('expiresIn') || '3600');
    
    if (!key) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Missing key parameter' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const signedUrl = await env.CORRESOURCES.get(key, {
      sign: { expiresIn }
    });
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        url: signedUrl,
        expiresIn,
        key
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    console.error('Signed URL error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to generate signed URL', 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// Updated Delete Handler
async function handleDelete(request, env, url) {
  try {
    const key = url.searchParams.get('key');
    
    if (!key) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Missing key parameter' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Check if file exists
    const object = await env.CORRESOURCES.get(key);
    if (!object) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'File not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    await env.CORRESOURCES.delete(key);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        message: 'File deleted successfully',
        key
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    console.error('Delete error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Delete failed', 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// ============================================================================
// EXISTING HANDLERS (Keep these as they are)
// ============================================================================

// Fix the escapeHtml function for Cloudflare Workers
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==================== RATE LIMITING FUNCTIONS ====================

/**
 * Simple IP-based rate limiter: 10 requests per hour
 */
async function checkRateLimit(request, env) {
  try {
    // Get client IP (Cloudflare provides the real IP)
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    
    // Skip rate limiting for localhost/development
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'unknown') {
      return { allowed: true, remaining: 10 };
    }
    
    // Create rate limit key: contact:{ip}:{current-hour}
    const now = new Date();
    const hour = now.getHours();
    const key = `contact:${ip}:${hour}`;
    
    const limit = 10; // 10 requests per hour
    const window = 3600; // 1 hour in seconds
    
    // Get current count
    const current = await env.RATE_LIMITER.get(key);
    let count = current ? parseInt(current) : 0;
    
    console.log(`Rate limit check for ${ip}: count=${count}, limit=${limit}`);
    
    if (count >= limit) {
      // Calculate when they can try again (next hour)
      const nextHour = new Date(now);
      nextHour.setHours(hour + 1, 0, 0, 0);
      const waitMinutes = Math.ceil((nextHour - now) / 1000 / 60);
      
      return {
        allowed: false,
        message: `Maximum submissions reached. You can submit again in ${waitMinutes} minutes.`,
        reset: nextHour.getTime(),
        waitMinutes
      };
    }
    
    // Increment count
    count++;
    await env.RATE_LIMITER.put(key, count.toString(), {
      expirationTtl: window
    });
    
    return {
      allowed: true,
      remaining: limit - count,
      reset: now.setHours(hour + 1, 0, 0, 0)
    };
    
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow the request if rate limiting fails
    return { allowed: true, remaining: 10, error: error.message };
  }
}

/**
 * Clean up old rate limit keys (optional maintenance)
 */
async function cleanupOldKeys(env) {
  try {
    // Run cleanup with 1% probability (once every 100 requests)
    if (Math.random() < 0.01) {
      const keys = await env.RATE_LIMITER.list();
      const now = Date.now();
      
      for (const key of keys.keys) {
        // Cleanup keys older than 24 hours
        if (key.name.startsWith('contact:')) {
          const [, , hour] = key.name.split(':');
          const keyTime = new Date();
          keyTime.setHours(parseInt(hour), 0, 0, 0);
          
          if (now - keyTime > 24 * 3600 * 1000) {
            await env.RATE_LIMITER.delete(key.name);
          }
        }
      }
    }
  } catch (error) {
    // Silently fail - cleanup is optional
  }
}
// Contact Form Handler - FIXED Resend email configuration
async function handleContactForm(request, env) {
  try {
    // Parse request body
    const body = await request.json();
    
    const { 
      name, 
      email, 
      subject, 
      message, 
      token: recaptchaToken 
    } = body;
    
    // Validate required fields
    if (!name || !email || !subject || !message || !recaptchaToken) {
      return new Response(
        JSON.stringify({ 
          error: 'All fields are required including reCAPTCHA token' 
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }
    
    // Verify reCAPTCHA token
    const recaptchaVerified = await verifyRecaptcha(recaptchaToken, env);
    
    if (!recaptchaVerified) {
      return new Response(
        JSON.stringify({ 
          error: 'reCAPTCHA verification failed. Please try again.' 
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }

    // Get email configuration from environment
    const RESEND_API_KEY = env.VITE_RESEND_API_KEY;
    const ADMIN_EMAIL = env.VITE_ADMIN_EMAIL || 'admin@bizika.com';
    const NOTIFICATION_EMAIL = env.VITE_NOTIFICATION_EMAIL || ADMIN_EMAIL;
    
    if (!RESEND_API_KEY) {
      console.error('Resend API key not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured',
          message: 'Your message was received but could not be sent via email. Our team will contact you soon.'
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }
    
    // FIX: Use Resend's verified domain for testing
    const fromEmail = 'onboarding@resend.dev'; // Verified by Resend
    const senderName = 'Pavoc LMS';
    
    let emailsSent = false;
    
    try {
      // Send email to admin
      const adminEmailData = {
        to: NOTIFICATION_EMAIL,
        subject: `New Contact Form: ${subject}`,
        from: `${senderName} <${fromEmail}>`,
        reply_to: email,
        html: generateAdminEmailTemplate(name, email, subject, message),
        text: generatePlainTextEmail(name, email, subject, message)
      };
      
      console.log('Sending admin email to:', NOTIFICATION_EMAIL);
      const emailResult = await sendEmail(adminEmailData, RESEND_API_KEY);
      console.log('Admin email sent successfully');
      
      // Send auto-reply to user
      const autoReplyData = {
        to: email,
        subject: 'Thank you for contacting Pavoc LMS',
        from: `${senderName} <${fromEmail}>`,
        html: generateAutoReplyTemplate(name),
        text: generateAutoReplyPlainText(name)
      };
      
      console.log('Sending auto-reply to:', email);
      await sendEmail(autoReplyData, RESEND_API_KEY);
      console.log('Auto-reply sent successfully');
      
      emailsSent = true;
      
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Continue processing even if email fails
    }
    
    // Store in R2 for backup (optional)
    await storeContactSubmission(env, {
      name,
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('CF-Connecting-IP') || 'unknown'
    });
    
    if (emailsSent) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Message sent successfully! Our team will contact you within 24 hours.'
        }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: true,
          warning: 'Message received but email notification failed',
          message: 'Our team has received your message and will contact you soon.'
        }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }
    
  } catch (error) {
    console.error('Contact form error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process contact form',
        message: error.message || 'Please try again later.'
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  }
}

// Verify reCAPTCHA token
async function verifyRecaptcha(token, env) {
  try {
    const RECAPTCHA_SECRET_KEY = env.VITE_RECAPTCHA_SECRET;
    
    if (!RECAPTCHA_SECRET_KEY) {
      console.warn('reCAPTCHA secret key not configured, skipping verification');
      return true; // Allow in development
    }
    
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${encodeURIComponent(RECAPTCHA_SECRET_KEY)}&response=${encodeURIComponent(token)}`
    });
    
    const data = await response.json();
    
    return data.success === true;
    
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

// Send email via Resend
async function sendEmail(emailData, apiKey) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Resend API error:', response.status, errorText);
    throw new Error(`Email send failed: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

// Store contact submission in R2 (optional backup)
async function storeContactSubmission(env, data) {
  try {
    const timestamp = Date.now();
    const safeEmail = data.email.replace(/[^a-zA-Z0-9@._+-]/g, '_');
    const key = `contact-submissions/${timestamp}_${safeEmail}.json`;
    
    await env.CORRESOURCES.put(key, JSON.stringify(data, null, 2), {
      httpMetadata: {
        contentType: 'application/json'
      },
      customMetadata: {
        type: 'contact-submission',
        email: data.email,
        subject: data.subject,
        timestamp: data.timestamp
      }
    });
    
    console.log('Contact submission stored:', key);
  } catch (error) {
    console.error('Failed to store contact submission:', error);
    // Don't throw - this shouldn't fail the main flow
  }
}

// Email Template Functions
function generateAdminEmailTemplate(name, email, subject, message) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Contact Form Submission</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
        .field { margin-bottom: 20px; }
        .label { font-weight: bold; color: #4b5563; margin-bottom: 5px; }
        .value { padding: 10px; background: white; border-radius: 4px; border: 1px solid #d1d5db; }
        .message-box { white-space: pre-wrap; font-family: monospace; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
          <img src="https://bizika.pages.dev/logo3.png" 
                alt="Pavoc LMS"
                width="140"
                style="max-width: 140px; height: auto; border: 0; display: block; margin: 0 auto;">
            <h1>New Contact Form Submission</h1>
            <p>From Pavoc LMS Website</p>
        </div>
        <div class="content">
            <div class="field">
                <div class="label">From</div>
                <div class="value">
                    <strong>${escapeHtml(name)}</strong><br>
                    <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>
                </div>
            </div>
            
            <div class="field">
                <div class="label">Subject</div>
                <div class="value">${escapeHtml(subject)}</div>
            </div>
            
            <div class="field">
                <div class="label">Message</div>
                <div class="value message-box">${escapeHtml(message)}</div>
            </div>
            
            <div class="field">
    <div class="label">Timestamp</div>
        <div class="field">
    <div class="label">Timestamp</div>
    <div class="value">${new Date().toLocaleString('en-KE', {
        timeZone: 'Africa/Nairobi',
        dateStyle: 'medium',
        timeStyle: 'long'
    })}</div>
</div>
</div>
    </div>
            
            <div class="footer">
                <p>💡 <strong>Action Required:</strong> Please respond within 24 hours.</p>
                <p>📧 <strong>Reply to:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
                <p>📍 This message was sent from the Pavoc LMS contact form.</p>
            </div>
        </div>
    </div>
</body>
</html>
  `;
}

function generatePlainTextEmail(name, email, subject, message) {
  return `
NEW CONTACT FORM SUBMISSION
===========================

From: ${name}
Email: ${email}
Subject: ${subject}
Time: ${new Date().toLocaleString()}

MESSAGE:
${message}

---
Action Required: Please respond within 24 hours.
Reply to: ${email}
Sent from Pavoc LMS contact form
  `;
}

function generateAutoReplyTemplate(name) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank you for contacting us</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
        .highlight { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; text-align: center; }
        .steps { margin: 20px 0; }
        .step { display: flex; align-items: center; margin-bottom: 15px; }
        .step-number { background: #10b981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Thank you for contacting Pavoc LMS!</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
            
            <p>We've successfully received your message and our support team will review it shortly.</p>
            
            <div class="highlight">
                <h3>What happens next:</h3>
                <div class="steps">
                    <div class="step">
                        <div class="step-number">1</div>
                        <div>Our team reviews your inquiry</div>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div>We'll respond within 24 hours</div>
                    </div>
                    <div class="step">
                        <div class="step-number">3</div>
                        <div>We work on your request or question</div>
                    </div>
                </div>
            </div>
            
            <p><strong>Average response time:</strong> 4 hours during business hours (Monday-Friday, 9AM-5PM EST).</p>
            
            <div class="footer">
                <p><strong>Pavoc LMS Support Team</strong></p>
                <p>📍 Email: info@pavocsolutionsltd.co.ke</p>
                <p>🌐 Website: https://bizika.pages.dev</p>
                <p style="font-size: 12px; color: #9ca3af; margin-top: 15px;">
                    This is an automated message. Please do not reply to this email.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
  `;
}

function generateAutoReplyPlainText(name) {
  return `
Thank you for contacting Pavoc LMS!

Hello ${name},

We've successfully received your message and our support team will review it shortly.

What happens next:
1. Our team reviews your inquiry
2. We'll respond within 24 hours
3. We work on your request or question

Average response time: 4 hours during business hours (Monday-Friday, 9AM-5PM EST).

Pavoc LMS Support Team
Email: info@pavocsolutionsltd.co.ke
Website: https://bizika.pages.dev

This is an automated message. Please do not reply to this email.
  `;
}

// Health Check Handler
async function handleHealth(env) {
  try {
    // Test R2 connection
    await env.CORRESOURCES.list({ limit: 1 });
    
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        r2: 'connected',
        worker: 'running'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(JSON.stringify({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// Serve files from R2
async function serveFromR2(request, env, pathname) {
  try {
    const key = pathname.replace('/cdn/', '');
    
    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing file key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const object = await env.CORRESOURCES.get(key);
    
    if (!object) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Access-Control-Allow-Origin', '*');
    
    return new Response(object.body, { headers });
    
  } catch (error) {
    console.error('Serve error:', error);
    return new Response(JSON.stringify({ error: 'Failed to serve file', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// Helper functions
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFileType(filename) {
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