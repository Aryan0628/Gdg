import { bucket } from "../config/firebase.js"
import { v4 as uuid } from "uuid"

/**
 * Uploads image buffer to Firebase Storage
 */
export const uploadToFirebase = async (
  buffer,
  mimeType,
  folder = "garbage-reports"
) => {
  const fileName = `${folder}/${uuid()}`
  const file = bucket.file(fileName)

  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
    },
    resumable: false,
  })

  // Make public or generate signed URL
  await file.makePublic()

  return {
    imageUrl: `https://storage.googleapis.com/${bucket.name}/${fileName}`,
    filePath: fileName,
  }
}
