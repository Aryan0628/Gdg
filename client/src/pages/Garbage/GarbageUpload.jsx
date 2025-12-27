import { useState } from "react"
import { Button } from "../../ui/button"
import { createGarbageReport } from "./garbage.types"

export default function GarbageUpload({ userLocation, onSubmit }) {
  const [title, setTitle] = useState("")
  const [image, setImage] = useState(null)

  const handleSubmit = () => {
    if (!title || !image || !userLocation) return

    const report = createGarbageReport({
      title,
      imageUrl: URL.createObjectURL(image),
      location: userLocation,
      userId: "demo-user",
    })

    onSubmit(report)
    setTitle("")
    setImage(null)
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
        />
      )}

      <Button
        className="w-full bg-green-600 hover:bg-green-700"
        onClick={handleSubmit}
      >
        Submit
      </Button>
    </div>
  )
}
