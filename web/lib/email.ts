import nodemailer from 'nodemailer'

// Amazon SES SMTP configuration
const transporter = nodemailer.createTransport({
  host: process.env.SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com',
  port: 465,
  secure: true, // true for port 465
  auth: {
    user: process.env.SES_SMTP_USER,
    pass: process.env.SES_SMTP_PASSWORD,
  },
})

// Check if email is configured
function isEmailConfigured(): boolean {
  return Boolean(process.env.SES_SMTP_USER && process.env.SES_SMTP_PASSWORD)
}

// Sender email (must be verified in SES)
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@maxapogee.com'
const FROM_NAME = process.env.SES_FROM_NAME || 'Max Apogee'

// Contact email destination
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || FROM_EMAIL

interface SendEmailOptions {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
}

/**
 * Sanitize email header value to prevent header injection attacks.
 * Removes newlines, carriage returns, and other control characters that could inject headers.
 */
function sanitizeEmailHeader(value: string): string {
  if (!value || typeof value !== 'string') return ''
  // Remove newlines, carriage returns, null bytes, and other control characters
  return value
    .replace(/[\r\n\x00-\x1f\x7f]/g, '')
    .trim()
    .slice(0, 254) // RFC 5321 max email length
}

/**
 * Validate email address format strictly (RFC 5322 compliant subset)
 * Also ensures no injection characters are present
 */
function isValidEmailStrict(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  // Check for newlines, carriage returns, or other control characters
  if (/[\r\n\x00-\x1f\x7f]/.test(email)) return false
  // Strict email regex that disallows most special characters
  const strictEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  return strictEmailRegex.test(email) && email.length <= 254
}

/**
 * Send an email using Amazon SES SMTP
 */
async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.warn('Email not configured - SES_SMTP_USER and SES_SMTP_PASSWORD required')
    return { success: false, error: 'Email service not configured' }
  }

  // Validate and sanitize email addresses
  const sanitizedTo = sanitizeEmailHeader(options.to)
  const sanitizedReplyTo = options.replyTo ? sanitizeEmailHeader(options.replyTo) : undefined

  if (!isValidEmailStrict(sanitizedTo)) {
    return { success: false, error: 'Invalid recipient email address' }
  }

  if (sanitizedReplyTo && !isValidEmailStrict(sanitizedReplyTo)) {
    return { success: false, error: 'Invalid reply-to email address' }
  }

  // Sanitize subject to prevent header injection
  const sanitizedSubject = sanitizeEmailHeader(options.subject)

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: sanitizedTo,
      subject: sanitizedSubject,
      text: options.text,
      html: options.html,
      replyTo: sanitizedReplyTo,
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to send email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error',
    }
  }
}

/**
 * Send contact form submission to admin
 */
export async function sendContactFormEmail(data: {
  name: string
  email: string
  subject?: string
  message: string
}): Promise<{ success: boolean; error?: string }> {
  const { name, email, subject, message } = data

  const emailSubject = subject
    ? `[Max Apogee Contact] ${subject}`
    : `[Max Apogee Contact] New message from ${name}`

  const text = `
New contact form submission from Max Apogee:

Name: ${name}
Email: ${email}
Subject: ${subject || 'Not provided'}

Message:
${message}

---
This email was sent from the Max Apogee contact form.
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; }
    .value { margin-top: 4px; }
    .message-box { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin-top: 15px; }
    .footer { margin-top: 20px; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">New Contact Form Submission</h2>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">From</div>
        <div class="value">${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</div>
      </div>
      ${subject ? `
      <div class="field">
        <div class="label">Subject</div>
        <div class="value">${escapeHtml(subject)}</div>
      </div>
      ` : ''}
      <div class="field">
        <div class="label">Message</div>
        <div class="message-box">${escapeHtml(message).replace(/\n/g, '<br>')}</div>
      </div>
    </div>
    <div class="footer">
      This email was sent from the Max Apogee contact form.
    </div>
  </div>
</body>
</html>
  `.trim()

  return sendEmail({
    to: CONTACT_EMAIL,
    subject: emailSubject,
    text,
    html,
    replyTo: email,
  })
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(data: {
  email: string
  name?: string
}): Promise<{ success: boolean; error?: string }> {
  const { email, name } = data
  const greeting = name ? `Hi ${name}` : 'Welcome'

  const text = `
${greeting},

Welcome to Max Apogee! We're excited to have you join our rocket science education community.

Here's what you can do:
- Explore our interactive lessons on rocket science and aerospace
- Use AI-powered explanations to understand complex concepts
- Track your progress as you learn
- Take quizzes to test your knowledge

Get started: https://maxapogee.com/learn

Happy learning!
The Max Apogee Team
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f8fafc; padding: 30px 20px; border: 1px solid #e2e8f0; border-top: none; }
    .features { margin: 20px 0; }
    .feature { display: flex; align-items: flex-start; margin-bottom: 12px; }
    .feature-icon { width: 24px; height: 24px; margin-right: 12px; color: #3b82f6; }
    .cta { text-align: center; margin: 30px 0; }
    .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; }
    .footer { background: #1e293b; color: #94a3b8; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Max Apogee!</h1>
    </div>
    <div class="content">
      <p>${escapeHtml(greeting)},</p>
      <p>We're excited to have you join our rocket science education community!</p>

      <div class="features">
        <p><strong>Here's what you can do:</strong></p>
        <ul>
          <li>Explore interactive lessons on rocket science and aerospace</li>
          <li>Use AI-powered explanations to understand complex concepts</li>
          <li>Track your progress as you learn</li>
          <li>Take quizzes to test your knowledge</li>
        </ul>
      </div>

      <div class="cta">
        <a href="https://maxapogee.com/learn" class="cta-button">Start Learning</a>
      </div>
    </div>
    <div class="footer">
      <p>Happy learning!</p>
      <p>The Max Apogee Team</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  return sendEmail({
    to: email,
    subject: 'Welcome to Max Apogee!',
    text,
    html,
  })
}

/**
 * Send a notification email
 */
export async function sendNotificationEmail(data: {
  email: string
  subject: string
  message: string
  ctaText?: string
  ctaUrl?: string
}): Promise<{ success: boolean; error?: string }> {
  const { email, subject, message, ctaText, ctaUrl } = data

  const text = `
${message}

${ctaText && ctaUrl ? `${ctaText}: ${ctaUrl}` : ''}

---
Max Apogee
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
    .cta { text-align: center; margin: 25px 0; }
    .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; }
    .footer { margin-top: 20px; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">Max Apogee</h2>
    </div>
    <div class="content">
      <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      ${ctaText && ctaUrl ? `
      <div class="cta">
        <a href="${escapeHtml(ctaUrl)}" class="cta-button">${escapeHtml(ctaText)}</a>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      Max Apogee - Learn Rocket Science
    </div>
  </div>
</body>
</html>
  `.trim()

  return sendEmail({
    to: email,
    subject,
    text,
    html,
  })
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  }

  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char)
}

/**
 * Verify email configuration is working
 */
export async function verifyEmailConfig(): Promise<{ configured: boolean; verified: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return { configured: false, verified: false, error: 'Email credentials not set' }
  }

  try {
    await transporter.verify()
    return { configured: true, verified: true }
  } catch (error) {
    return {
      configured: true,
      verified: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    }
  }
}
