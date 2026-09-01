import nodemailer from 'nodemailer'

/**
 * Creates Nodemailer transporter dynamically with strict timeouts
 */
const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = parseInt(process.env.SMTP_PORT || '465', 10)
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''

  if (!pass || !user) return null

  // Optimized for Gmail SSL / TLS
  if (host.includes('gmail')) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000
    })
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000
  })
}

/**
 * Sends an email using Nodemailer or logs formatted email preview
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''
  const from = process.env.SMTP_FROM || `"Zeltxx Platform" <${user}>`

  // Check if dummy or missing password
  if (!pass || pass.includes('dummy') || pass === 'your_app_password') {
    console.log(`\n================= ✉️ EMAIL DISPATCH SIMULATOR =================`)
    console.log(`FROM:    ${from}`)
    console.log(`TO:      ${to}`)
    console.log(`SUBJECT: ${subject}`)
    console.log(`CONTENT: ${text || html?.replace(/<[^>]+>/g, '')}`)
    console.log(`NOTE:    To send real emails, generate a 16-character Google App Password and put it in Backend/.env under SMTP_PASS`)
    console.log(`=================================================================\n`)
    return { success: true, simulated: true }
  }

  try {
    const transporter = getTransporter()
    if (!transporter) throw new Error('No transporter configured')

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html
    })
    console.log(`✅ Real email successfully sent to ${to}: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err.message)
    if (err.message.includes('EAUTH') || err.message.includes('535') || err.message.includes('Invalid login') || err.message.includes('Username and Password not accepted')) {
      console.error(`💡 REASON: Gmail rejected the SMTP password because Google requires a 16-character App Password.`)
      console.error(`👉 HOW TO FIX: Go to https://myaccount.google.com/apppasswords -> Select "Mail" -> Copy 16-character password -> Paste into SMTP_PASS in Backend/.env`)
    }
    return { success: false, error: err.message }
  }
}

export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/**
 * HTML Email Template Builder for Invites & Notifications.
 * All interpolated values are HTML-escaped (defense against injection).
 */
export const buildInviteEmailHtml = ({ projectName, inviteUrl, inviterName }) => {
  const sender = process.env.SMTP_USER || ''
  const eName = escapeHtml(projectName)
  const eInviter = escapeHtml(inviterName)
  const eUrl = escapeHtml(inviteUrl)
  return `
    <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 12px;">
      <div style="max-width: 500px; margin: 0 auto; background: #1e293b; padding: 24px; border-radius: 12px; border: 1px solid #334155;">
        <h2 style="color: #60a5fa; margin-top: 0;">🚀 You've been invited to Zeltxx!</h2>
        <p style="color: #cbd5e1; font-size: 15px;">
          Hi there, <strong>${eInviter || 'A teammate'}</strong> invited you to collaborate on project <strong>"${eName}"</strong> on Zeltxx.
        </p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${eUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Join Project Workspace &rarr;
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
          Sent via Zeltxx Collaboration Platform${sender ? ` (${escapeHtml(sender)})` : ''}
        </p>
      </div>
    </div>
  `
}
