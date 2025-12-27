import { Badge } from "../ui/badge"
import { MapPin, Navigation } from "lucide-react"
import { useNavigate } from "react-router-dom"
import React, { useEffect } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { useAuthStore } from "../store/useAuthStore"
import { FEATURES } from "./features.config"

export default function CivicHub() {
  const navigate = useNavigate()
  const { user: auth0User } = useAuth0()
  const { setUser, user: storedUser } = useAuthStore()

  // Save Auth0 user to Zustand store when it becomes available
  React.useEffect(() => {
    if (auth0User && !storedUser) {
      setUser(auth0User)
    }
  }, [auth0User, storedUser, setUser])

  const featureRoutes = {
    "women-safety": "/women",
    "traffic": "/traffic",
    "garbage": "/garbage",
    "ngo": "/ngo",
    "jobs": "/jobs",
  }
  const handleFeatureClick = (featureId) => {
    navigate(featureRoutes[featureId])
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* HEADER */}
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">UrbanFlow</h1>
              <p className="text-xs text-zinc-400">
                Community Safety Dashboard
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* MAIN PANEL */}
        <div className="flex-1 overflow-y-auto bg-zinc-900">
          <div className="p-6 space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                Select a Service
              </h2>
              <p className="text-zinc-400">
                Choose a service to view on the map
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon

                return (
                  <button
                    key={feature.id}
                    onClick={() => handleFeatureClick(feature.id)}
                    className="rounded-xl p-4 text-left transition-all bg-zinc-800/50 border border-zinc-700 hover:bg-zinc-800 hover:scale-105"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-12 w-12 rounded-lg ${feature.bgColor} flex items-center justify-center`}
                      >
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">
                          {feature.title}
                        </h3>
                        <p className="text-xs text-zinc-400">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
