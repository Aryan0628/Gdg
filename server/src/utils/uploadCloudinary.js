import cloudinary from "../../config/cloudinary.js"
import streamifier from "streamifier"

export const uploadToCloudinary = (
  buffer,
  folder = "garbage-reports"
) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error)

        resolve({
          imageUrl: result.secure_url,
          publicId: result.public_id,
        })
      }
    )

    streamifier.createReadStream(buffer).pipe(uploadStream)
  })
}
