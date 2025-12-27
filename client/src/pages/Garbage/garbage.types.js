export const createGarbageReport = ({
  title,
  imageUrl,
  location,
  userId,
}) => ({
  id: Date.now(),
  title,
  imageUrl,
  location, // { lat, lng }
  upvotes: 0,
  downvotes: 0,
  userId,
  createdAt: new Date(),
})
