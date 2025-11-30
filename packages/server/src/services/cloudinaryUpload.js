import cloudinary from '../config/cloudinary.js'

export async function uploadToCloudinary(buffer, folder = 'bookpost', publicId = null) {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: 'auto'
    }

    if (publicId) {
      uploadOptions.public_id = publicId
      uploadOptions.overwrite = true
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      }
    )

    // Handle both Buffer and ReadableStream
    if (Buffer.isBuffer(buffer)) {
      uploadStream.end(buffer)
    } else {
      buffer.pipe(uploadStream)
    }
  })
}
