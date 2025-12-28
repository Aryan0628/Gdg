import { Badge } from "../ui/badge"
import { MapPin, Navigation } from "lucide-react"
import { useNavigate } from "react-router-dom"
import React, { useEffect, useState } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { useAuthStore } from "../store/useAuthStore"
import { FEATURES } from "./features.config"
import FloatingLines from "../ui/FloatingLines"

export default function CivicHub() {
  const navigate = useNavigate()
  const { user: auth0User, logout } = useAuth0()
  const { setUser, user: storedUser } = useAuthStore()
  const [selectedFeature, setSelectedFeature] = useState(null)

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
    <div className="relative h-screen w-full bg-slate-950 text-white font-sans flex flex-col overflow-hidden">
      {/* BACKGROUND THEME */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-linear-to-br from-slate-950 via-blue-900/30 to-slate-950" />
        <FloatingLines />
      </div>

      {/* 1. TOP BAR */}
      <header className="relative z-50 w-full h-20 px-8 flex items-center justify-between bg-black/40 backdrop-blur-2xl border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-blue-400 font-black text-xl">
            @#
          </div>
          <h1 className="text-2xl font-black tracking-tighter bg-linear-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
            UrbanFlow
          </h1>
        </div>

        <div className="flex items-center gap-4 bg-white/5 p-1.5 pr-4 rounded-full border border-white/10">
          <img src={storedUser?.picture} alt="Profile" className="w-8 h-8 rounded-full border border-white/20" />
          <span className="text-sm font-bold text-gray-200">{storedUser?.name}</span>
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
                  <button key={feature.id} onClick={() => handleFeatureClick(feature.id)} className="w-full min-h-40 bg-black/30 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] flex items-center gap-10 hover:bg-white/5 hover:border-white/20 transition-all duration-300 group shadow-2xl">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-blue-400 text-3xl font-black group-hover:scale-110 transition-transform">
                      @#
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="text-3xl font-black tracking-tight mb-2 bg-linear-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">{feature.title}</h3>
                      <p className="text-lg text-gray-300 font-medium opacity-80">{feature.description}</p>
                    </div>
                  </button>
                );
              })}
              <button
                onClick={() => logout({ returnTo: window.location.origin })}
                className="w-full py-5 mt-4 rounded-[2.5rem] bg-red-500/10 hover:bg-red-500/20 text-red-400 font-black uppercase tracking-[0.4em] border border-red-500/20 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {selectedFeature && (
          <div className="fixed bottom-0 left-0 right-0 h-32 bg-black/80 backdrop-blur-2xl border-t border-white/10 p-4 z-50">
            <div className="max-w-7xl mx-auto h-full flex items-center justify-center gap-3">
              
              <div className="flex items-center justify-center gap-3 w-full overflow-x-auto no-scrollbar">
                {FEATURES.filter(f => f.id !== selectedFeature).map((feature) => {
                  return (
                    <button 
                      key={feature.id} 
                      onClick={() => handleFeatureClick(feature.id)} 
                      className="h-24 min-w-[140px] flex-1 max-w-[200px] bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all group shrink-0 shadow-lg"
                    >
                      <div className="p-2 rounded-lg bg-white/5 group-hover:scale-110 transition-transform text-blue-400 font-black">
                        @#
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white truncate px-2 w-full text-center">
                        {feature.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="h-12 w-px bg-white/10 mx-2 shrink-0" />
              
              <button 
                onClick={() => logout({ returnTo: window.location.origin })} 
                className="h-24 px-6 rounded-2xl bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/10 hover:bg-red-500/20 transition-all shrink-0 flex flex-col items-center justify-center gap-2"
              >
                <div className="p-2 rounded-lg bg-red-500/5 text-lg">@#</div>
                SIGN OUT
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}