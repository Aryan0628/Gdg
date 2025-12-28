import { useState } from "react"
import { Button } from "../../../ui/button";
import axios from "axios"
import { useAuthStore } from "../../../store/useAuthStore.js"
import { useAuth0 } from "@auth0/auth0-react";



export default function GarbageUpload({ userLocation, onSubmit }) {
  const [title, setTitle] = useState("")
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const { getAccessTokenSilently } = useAuth0();


  const user = useAuthStore((state) => state.user)

  const handleSubmit = async () => {
    if (!title || !image || !userLocation || !user) return

    try {
      setLoading(true)
      const token = await getAccessTokenSilently({
  audience: import.meta.env.VITE_AUTH0_AUDIENCE,
});

      const formData = new FormData()
      formData.append("image", image) // 🔥 FILE
      formData.append("title", title)
      formData.append("lat", userLocation.lat)
      formData.append("lng", userLocation.lng)
      formData.append("userId", user.sub)
  
      const res = await axios.post("/api/garbage", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
           Authorization: `Bearer ${token}`,
        },
      })

      console.log(res.data)
      // Backend returns Cloudinary URL
      const savedReport = res.data.report

      // Update frontend map
      onSubmit(savedReport)

      setTitle("")
      setImage(null)
    } catch (error) {
      console.error("Upload failed", error)
      alert("Failed to upload garbage report")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-white font-semibold text-lg">
        Report Garbage
      </h2>

      <input
        placeholder="Garbage title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-2 bg-zinc-800 rounded text-white"
      />

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files[0])}
        className="text-zinc-400"
      />

      {image && (
        <img
          src={URL.createObjectURL(image)}
          className="rounded"
          alt="preview"
        />
      )}

      <Button
        className="w-full bg-green-600 hover:bg-green-700"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Uploading..." : "Submit"}
      </Button>
    </div>
  )
}
