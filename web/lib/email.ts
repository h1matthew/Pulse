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
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@pulse.local'
const FROM_NAME = process.env.SES_FROM_NAME || 'Pulse'

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
    ? `[Pulse Contact] ${subject}`
    : `[Pulse Contact] New message from ${name}`

  const text = `
New contact form submission from Pulse:

Name: ${name}
Email: ${email}
Subject: ${subject || 'Not provided'}

Message:
${message}

---
This email was sent from the Pulse contact form.
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0c0b0a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #faf9f7; padding: 20px; border: 1px solid #e9e6e0; border-top: none; border-radius: 0 0 8px 8px; }
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
      This email was sent from the Pulse contact form.
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

Welcome to Pulse. Your account is ready.

Here's what you can do:
- Browse nearby independent businesses
- Save places and claim current deals
- Use receipt check-ins to build your local-spend ledger
- Complete missions for rewards
- Leave reviews with a clear source

Get started: https://pulse.local/discover

The Pulse team
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0c0b0a; color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #faf9f7; padding: 30px 20px; border: 1px solid #e9e6e0; border-top: none; }
    .features { margin: 20px 0; }
    .feature { display: flex; align-items: flex-start; margin-bottom: 12px; }
    .feature-icon { width: 24px; height: 24px; margin-right: 12px; color: #66724d; }
    .cta { text-align: center; margin: 30px 0; }
    .cta-button { display: inline-block; background: #66724d; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; }
    .footer { background: #0c0b0a; color: #a8a49d; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Pulse</h1>
    </div>
    <div class="content">
      <p>${escapeHtml(greeting)},</p>
      <p>Your account is ready.</p>

      <div class="features">
        <p><strong>Here's what you can do:</strong></p>
        <ul>
          <li>Browse nearby independent businesses</li>
          <li>Save places and claim current deals</li>
          <li>Use receipt check-ins to build your local-spend ledger</li>
          <li>Complete missions for rewards</li>
          <li>Leave reviews with a clear source</li>
        </ul>
      </div>

      <div class="cta">
        <a href="https://pulse.local/discover" class="cta-button">Open directory</a>
      </div>
    </div>
    <div class="footer">
      <p>The Pulse team</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  return sendEmail({
    to: email,
    subject: 'Welcome to Pulse!',
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
Pulse
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0c0b0a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #faf9f7; padding: 20px; border: 1px solid #e9e6e0; border-top: none; border-radius: 0 0 8px 8px; }
    .cta { text-align: center; margin: 25px 0; }
    .cta-button { display: inline-block; background: #66724d; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; }
    .footer { margin-top: 20px; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">Pulse</h2>
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
      Pulse
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
