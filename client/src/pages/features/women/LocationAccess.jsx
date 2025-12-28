import { Button } from "../../../ui/button"
import { MapPin, AlertCircle } from "lucide-react"

export default function LocationAccess({ onRequestLocation, isLoadingLocation }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 px-6">
      <div className="max-w-md w-full space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-red-500" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Enable Location Access</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            To help you stay safe and report incidents accurately, we need access to your location.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white text-sm font-semibold">Why we need this</p>
              <p className="text-zinc-400 text-xs mt-1">
                Your location helps us:
              </p>
              <ul className="text-zinc-400 text-xs mt-2 space-y-1 ml-4 list-disc">
                <li>Locate nearby safe zones</li>
                <li>Send accurate emergency alerts</li>
                <li>Plan safe routes home</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
          <p className="text-zinc-400 text-xs text-center">
            Your location is never shared publicly. Only you and emergency contacts can see it.
          </p>
        </div>

        {/* CTA Button */}
        <Button
          onClick={onRequestLocation}
          disabled={isLoadingLocation}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {isLoadingLocation ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              Requesting Location...
            </span>
          ) : (
            "Allow Location Access"
          )}
        </Button>

        {/* Skip Option */}
        <button className="w-full text-zinc-400 hover:text-white text-sm font-medium py-2 transition-colors">
          Skip for now
        </button>
      </div>
    </div>
  )
}
