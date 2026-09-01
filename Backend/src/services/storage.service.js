import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Storage seam. Uploads bytes to Cloudinary when the environment is
 * configured, otherwise falls back to the local filesystem so development
 * and tests work with zero external dependencies. Swap `uploadToStorage`
 * with any provider without touching callers.
 */
export const isCloudinaryConfigured = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)

export const uploadToStorage = async ({ buffer, filename }) => {
  if (isCloudinaryConfigured()) {
    const cloudinary = await import('cloudinary').then((m) => m.v2 || m.default?.v2)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    })
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'zeltxx/attachments',
          resource_type: 'auto',
          public_id: randomUUID()
        },
        (error, uploadResult) => (error ? reject(error) : resolve(uploadResult))
      )
      stream.end(buffer)
    })

    return {
      url: result.secure_url,
      publicId: result.public_id
    }
  }

  // Local fallback: save under Backend/uploads, served via express.static.
  const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads')
  fs.mkdirSync(uploadsDir, { recursive: true })
  const safeName = String(filename || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-80)
  const stored = `${randomUUID()}-${safeName}`
  fs.writeFileSync(path.join(uploadsDir, stored), buffer)
  return {
    url: `/uploads/${stored}`,
    publicId: null
  }
}

export const deleteFromStorage = async ({ publicId, url }) => {
  if (publicId && isCloudinaryConfigured()) {
    const cloudinary = await import('cloudinary').then((m) => m.v2 || m.default?.v2)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    })
    await cloudinary.uploader.destroy(publicId)
    return
  }
  if (url && url.startsWith('/uploads/')) {
    const filePath = path.resolve(__dirname, '..', '..', 'uploads', path.basename(url))
    fs.rmSync(filePath, { force: true })
  }
}