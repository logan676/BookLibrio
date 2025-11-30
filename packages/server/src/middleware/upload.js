import multer from 'multer'

// Configure multer for memory storage
const storage = multer.memoryStorage()

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
})

export default upload
