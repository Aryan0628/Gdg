import { useState } from "react"
import { Button } from "../../ui/button"
import { MapPin, Loader2 } from "lucide-react"
import GarbageMap from "./GarbageMap"
import GarbageUpload from "./GarbageUpload"

export default function GarbageFeature() {
  const [userLocation, setUserLocation] = useState(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)

  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)

  /* 📍 Request location explicitly */
  const requestLocation = async () => {
    setIsLoadingLocation(true)
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject)
      })

      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })
    } catch (err) {
      console.error("Location denied", err)
      alert("Location access is required to report garbage.")
    } finally {
      setIsLoadingLocation(false)
    }
  }

  /* 🗑️ Add report */
  const addReport = (report) => {
    setReports((prev) => [...prev, report])
  }

  /* 👍👎 Vote */
  const vote = (id, type) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              upvotes: type === "UP" ? r.upvotes + 1 : r.upvotes,
              downvotes: type === "DOWN" ? r.downvotes + 1 : r.downvotes,
            }
          : r
      )
    )
  }

  /* 🔒 LOCATION GATE (FIRST SCREEN) */
  if (!userLocation) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-80 text-center space-y-4">
          <MapPin className="h-10 w-10 text-green-500 mx-auto" />
          <h3 className="text-white font-semibold text-lg">
            Enable Location
          </h3>
          <p className="text-sm text-zinc-400">
            We need your location to show nearby garbage reports.
          </p>

          <Button
            className="w-full"
            onClick={requestLocation}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fetching location…
              </>
            ) : (
              "Enable Location"
            )}
          </Button>
        </div>
      </div>
    )
  }

  /* ✅ MAIN GARBAGE PAGE */
  return (
    <div className="flex h-screen w-screen bg-zinc-950">
      {/* LEFT PANEL */}
      <div className="w-96 border-r border-zinc-800 bg-zinc-900 p-4">
        <GarbageUpload
          userLocation={userLocation}
          onSubmit={addReport}
        />
      </div>

      {/* MAP */}
      <div className="flex-1">
        <GarbageMap
          userLocation={userLocation}
          reports={reports}
          selectedReport={selectedReport}
          onSelect={setSelectedReport}
          onVote={vote}
        />
      </div>
    </div>
  )
}
