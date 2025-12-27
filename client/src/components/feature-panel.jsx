import { useState } from "react"
import { MapPin, Send, AlertCircle, CheckCircle2 } from "lucide-react"

// ⚠️ Adjust paths if your ui folder is elsewhere
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { Badge } from "../ui/badge"

export default function FeaturePanel({
  feature,
  userLocation,
  isLoadingLocation,
  onRequestLocation,
}) {
  const [reportTitle, setReportTitle] = useState("")
  const [reportDescription, setReportDescription] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const Icon = feature.icon

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!userLocation) {
      onRequestLocation()
      return
    }

    console.log("Submitting report:", {
      feature: feature.id,
      title: reportTitle,
      description: reportDescription,
      location: userLocation,
    })

    setSubmitted(true)
    setTimeout(() => {
      setReportTitle("")
      setReportDescription("")
      setSubmitted(false)
    }, 3000)
  }

  
    return (
  <div className="space-y-5 text-white">
    {/* Feature Header */}
    <Card className="bg-zinc-900/60 border border-white/10 backdrop-blur-xl rounded-2xl">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div
            className={`h-14 w-14 rounded-2xl ${feature.bgColor}
                        flex items-center justify-center
                        shadow-inner`}
          >
            <Icon className={`h-7 w-7 ${feature.color}`} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold tracking-tight mb-1">
              {feature.title}
            </CardTitle>
            <CardDescription className="text-sm text-zinc-400">
              {feature.description}
            </CardDescription>
            <Badge
              variant="outline"
              className="mt-3 border-white/20 text-zinc-300"
            >
              {feature.stats}
            </Badge>
          </div>
        </div>
      </CardHeader>
    </Card>

    {/* Location Status */}
    <Card className="bg-zinc-900/60 border border-white/10 backdrop-blur-xl rounded-2xl">
      <CardContent className="pt-6">
        {!userLocation ? (
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium mb-1">Location Required</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Enable location access to report issues and view nearby incidents
              </p>
              <Button
                onClick={onRequestLocation}
                disabled={isLoadingLocation}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {isLoadingLocation ? "Requesting..." : "Enable Location"}
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="flex items-start gap-3 rounded-xl
                       bg-green-500/10 border border-green-500/30 p-4"
          >
            <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-green-400">
                Location Active
              </h3>
              <p className="text-xs text-zinc-400">
                Lat: {userLocation.lat.toFixed(6)}, Lng:{" "}
                {userLocation.lng.toFixed(6)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Report Form */}
    <Card className="bg-zinc-900/60 border border-white/10 backdrop-blur-xl rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Submit a Report
        </CardTitle>
        <CardDescription className="text-sm text-zinc-400">
          Report issues related to {feature.title.toLowerCase()}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Title
            </label>
            <Input
              className="bg-zinc-800/70 border-white/10 text-white
                         placeholder:text-zinc-400
                         focus:ring-2 focus:ring-blue-500/40"
              placeholder={`Enter ${feature.title.toLowerCase()} issue title...`}
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              disabled={!userLocation}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Description
            </label>
            <Textarea
              className="bg-zinc-800/70 border-white/10 text-white
                         placeholder:text-zinc-400
                         focus:ring-2 focus:ring-blue-500/40"
              placeholder="Provide details about the issue..."
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              rows={4}
              disabled={!userLocation}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500"
            disabled={!userLocation || !reportTitle || !reportDescription}
          >
            {submitted ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Report Submitted
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Report
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>

    {/* Recent Activity */}
    <Card className="bg-zinc-900/60 border border-white/10 backdrop-blur-xl rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Recent Activity
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between
                         rounded-xl bg-zinc-800/60
                         border border-white/10 p-4"
            >
              <div className="flex items-start gap-3">
                <MapPin className={`h-4 w-4 ${feature.color} mt-1`} />
                <div>
                  <p className="text-sm font-medium">
                    Report #{1000 + item}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {item} hour{item > 1 ? "s" : ""} ago • 2.{item}km away
                  </p>
                </div>
              </div>

              <span
                className="text-xs px-2.5 py-1 rounded-full
                           bg-green-500/10 text-green-400"
              >
                Active
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
)}
