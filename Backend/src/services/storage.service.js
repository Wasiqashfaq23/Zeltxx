import path from 'path'
import { promises as fs } from 'fs'
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

  // Production must never fall back to the ephemeral local disk: files would be
  // lost on restart and served from an unauthenticated static route. Fail closed.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CLOUDINARY_NOT_CONFIGURED: object storage is required in production')
  }

  // Local fallback: save under Backend/uploads, served via express.static (dev only).
  const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads')
  await fs.mkdir(uploadsDir, { recursive: true })
  const safeName = String(filename || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-80)
  const stored = `${randomUUID()}-${safeName}`
  await fs.writeFile(path.join(uploadsDir, stored), buffer)
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
    // Local files only exist in development; in production an upload on this
    // path could not be created in the first place, so nothing to delete.
    const filePath = path.join(__dirname, '..', '..', 'uploads', path.basename(url))
    await fs.rm(filePath, { force: true })
  }
}