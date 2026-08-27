import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { sendEmail, buildInviteEmailHtml } from './src/config/mailer.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

async function runTest() {
  console.log('📧 Testing Email Dispatch for:', process.env.SMTP_USER)
  console.log('🔑 SMTP_PASS Length:', process.env.SMTP_PASS?.length || 0)

  const html = buildInviteEmailHtml({
    projectName: 'Zeltxx Production Test',
    inviteUrl: 'http://localhost:5173',
    inviterName: 'Wasiq Ashfaq'
  })

  const res = await sendEmail({
    to: 'wasiqashfaq123@gmail.com',
    subject: '🚀 Zeltxx Platform - SMTP Test Email',
    html
  })

  console.log('Result:', res)
}

runTest()
