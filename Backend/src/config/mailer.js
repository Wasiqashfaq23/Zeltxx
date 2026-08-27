import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10)
const SMTP_USER = process.env.SMTP_USER || 'wasiqashfaq123@gmail.com'
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_FROM = process.env.SMTP_FROM || `"Zeltxx Platform" <${SMTP_USER}>`

let transporter = null

if (SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  })
  console.log(`📧 Nodemailer SMTP Transporter configured for: ${SMTP_USER}`)
} else {
  console.log(`📧 SMTP_PASS not set. Email dispatches will log cleanly in console. (Set SMTP_PASS in Backend/.env to send real Gmail emails)`)
}

/**
 * Sends an email using Nodemailer or logs formatted email preview
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (transporter && SMTP_PASS) {
      const info = await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        text,
        html
      })
      console.log(`✉️ Email sent to ${to}: ${info.messageId}`)
      return { success: true, messageId: info.messageId }
    } else {
      console.log(`\n================= ✉️ EMAIL DISPATCH SIMULATOR =================`)
      console.log(`FROM:    ${SMTP_FROM}`)
      console.log(`TO:      ${to}`)
      console.log(`SUBJECT: ${subject}`)
      console.log(`CONTENT: ${text || html?.replace(/<[^>]+>/g, '')}`)
      console.log(`=================================================================\n`)
      return { success: true, simulated: true }
    }
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err.message)
    return { success: false, error: err.message }
  }
}

/**
 * HTML Email Template Builder for Invites & Notifications
 */
export const buildInviteEmailHtml = ({ projectName, inviteUrl, inviterName }) => {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; borderRadius: 12px;">
      <div style="max-width: 500px; margin: 0 auto; background: #1e293b; padding: 24px; border-radius: 12px; border: 1px solid #334155;">
        <h2 style="color: #60a5fa; margin-top: 0;">🚀 You've been invited to Zeltxx!</h2>
        <p style="color: #cbd5e1; font-size: 15px;">
          Hi there, <strong>${inviterName || 'A teammate'}</strong> invited you to collaborate on project <strong>"${projectName}"</strong> on Zeltxx.
        </p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="${inviteUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Join Project Workspace &rarr;
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
          Sent via Zeltxx Collaboration Platform (${SMTP_USER})
        </p>
      </div>
    </div>
  `
}
