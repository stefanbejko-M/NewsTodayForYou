import nodemailer from 'nodemailer'
import type { SocialPost } from './socialPostService'

/**
 * Get email transporter
 */
function getEmailTransporter() {
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const fromEmail = process.env.FROM_EMAIL || 'NewsToday4U <no-reply@newstoday4u.com>'

  // If SMTP is not configured, return null (email will be logged instead)
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('[EMAIL] SMTP not configured. Emails will be logged to console.')
    return null
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })
}

/**
 * Send email notification for new social post
 */
export async function sendSocialPostEmailNotification(
  socialPost: SocialPost
): Promise<void> {
  const transporter = getEmailTransporter()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://newstoday4u.com'
  const adminToken = process.env.ADMIN_DASHBOARD_TOKEN || ''

  const adminUrl = `${baseUrl}/admin/social-posts?id=${socialPost.id}${
    adminToken ? `&token=${adminToken}` : ''
  }`

  const toEmail = 'office@newstoday4u.com'
  const fromEmail = process.env.FROM_EMAIL || 'NewsToday4U <no-reply@newstoday4u.com>'

  const subject = `New social post prepared: ${socialPost.title}`

  // Preview text (first 200 chars)
  const fbPreview =
    socialPost.fb_text.length > 200
      ? socialPost.fb_text.slice(0, 197) + '...'
      : socialPost.fb_text
  const igPreview =
    socialPost.ig_text.length > 200
      ? socialPost.ig_text.slice(0, 197) + '...'
      : socialPost.ig_text

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #5A00E0; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; background-color: #5A00E0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
    .preview-box { background-color: white; padding: 16px; margin: 16px 0; border-left: 4px solid #5A00E0; border-radius: 4px; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">New Social Post Prepared</h1>
    </div>
    <div class="content">
      <p>A new social media post has been prepared for the following article:</p>
      
      <h2>${socialPost.title}</h2>
      <p><strong>URL:</strong> <a href="${socialPost.url}">${socialPost.url}</a></p>
      
      <div class="preview-box">
        <h3>Facebook Post Preview:</h3>
        <p style="white-space: pre-wrap;">${fbPreview}</p>
      </div>
      
      <div class="preview-box">
        <h3>Instagram Post Preview:</h3>
        <p style="white-space: pre-wrap;">${igPreview}</p>
      </div>
      
      <p><strong>Hashtags:</strong> ${socialPost.hashtags}</p>
      
      <a href="${adminUrl}" class="button">Open in Admin Panel</a>
    </div>
    <div class="footer">
      <p>This is an automated notification from NewsTodayForYou.</p>
      <p>Article ID: ${socialPost.article_id} | Post ID: ${socialPost.id}</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  const textBody = `
New Social Post Prepared

A new social media post has been prepared for the following article:

Title: ${socialPost.title}
URL: ${socialPost.url}

Facebook Post Preview:
${fbPreview}

Instagram Post Preview:
${igPreview}

Hashtags: ${socialPost.hashtags}

Open in Admin Panel: ${adminUrl}

---
This is an automated notification from NewsTodayForYou.
Article ID: ${socialPost.article_id} | Post ID: ${socialPost.id}
  `.trim()

  // If SMTP is not configured, log the email instead
  if (!transporter) {
    console.log('[EMAIL] Email would be sent:')
    console.log('To:', toEmail)
    console.log('Subject:', subject)
    console.log('Body:', textBody)
    return
  }

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject,
      text: textBody,
      html: htmlBody,
    })

    console.log('[EMAIL] Notification sent successfully:', info.messageId)
  } catch (error) {
    console.error('[EMAIL] Failed to send notification:', error)
    throw error
  }
}

