import React, { useState, useRef } from 'react';
import FloatingLines from '../ui/FloatingLines';
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "../ui/button";
import { X, MapPin } from "lucide-react";
import GoogleMapComponent from "../components/google-map";
import FeaturePanel from "../components/feature-panel";
import { SafetyOnboarding } from "../components/safety-onboarding";

// features config
import { FEATURES } from "./features.config";

const UrbanFlow = () => {
  const { user, logout } = useAuth0();
  
  // --- PURANA LOGIC (RETAINED) ---
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState("prompt");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  const requestLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      setLocationPermission("granted");
    } catch (error) {
      setLocationPermission("denied");
    } finally { setIsLoadingLocation(false); }
  };

  const handleFeatureClick = (featureId) => {
    setSelectedFeature(featureId);
    setHasJoined(false);
    if (featureId !== "women-safety" && featureId !== "traffic") {
      setUserLocation(null);
      setLocationPermission("prompt");
    }
  };

  const currentFeature = FEATURES.find((f) => f.id === selectedFeature);
  const needsOnboarding = selectedFeature === "women-safety" || selectedFeature === "traffic";
  const handleJoinComplete = () => setHasJoined(true);

  return (
    <div className="relative h-screen w-full bg-slate-950 text-white font-sans flex flex-col overflow-hidden">
      {/* BACKGROUND THEME */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-900/30 to-slate-950" />
        <FloatingLines />
      </div>

      {/* 1. TOP BAR */}
      <header className="relative z-50 w-full h-20 px-8 flex items-center justify-between bg-black/40 backdrop-blur-2xl border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-blue-400 font-black text-xl">
            @#
          </div>
          <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
            UrbanFlow
          </h1>
        </div>

        <div className="flex items-center gap-4 bg-white/5 p-1.5 pr-4 rounded-full border border-white/10">
          <img src={user?.picture} alt="Profile" className="w-8 h-8 rounded-full border border-white/20" />
          <span className="text-sm font-bold text-gray-200">{user?.name}</span>
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
        
        {/* MAP & CONTENT AREA */}
        <div className="flex-1 relative overflow-hidden flex">
          {selectedFeature ? (
            <>
              {/* LEFT PANEL (Onboarding/Features) */}
              <div className="w-96 bg-black/60 backdrop-blur-3xl border-r border-white/10 flex flex-col z-30">
                <div className="p-6">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFeature(null)} className="mb-4 text-zinc-400 hover:text-white font-bold">
                    <X className="h-4 w-4 mr-2" /> Close View
                  </Button>
                  
                  {needsOnboarding && !hasJoined ? (
                    <SafetyOnboarding feature={currentFeature} userLocation={userLocation} isLoadingLocation={isLoadingLocation} onRequestLocation={requestLocation} onJoinComplete={handleJoinComplete} />
                  ) : (
                    <FeaturePanel feature={currentFeature} userLocation={userLocation} isLoadingLocation={isLoadingLocation} onRequestLocation={requestLocation} />
                  )}
                </div>
              </div>

              {/* MAP VIEW */}
              <div className="flex-1 relative">
                {((needsOnboarding && hasJoined) || !needsOnboarding) && (
                  <GoogleMapComponent userLocation={userLocation} selectedFeature={selectedFeature} isLoadingLocation={isLoadingLocation} />
                )}
              </div>
            </>
          ) : (
            /* INITIAL STATE: ALL CARDS VERTICAL */
            <div className="flex-1 overflow-y-auto py-12 px-6 flex flex-col items-center gap-6 max-w-5xl mx-auto w-full">
              {FEATURES.map((feature) => {
                return (
                  <button key={feature.id} onClick={() => handleFeatureClick(feature.id)} className="w-full min-h-[160px] bg-black/30 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] flex items-center gap-10 hover:bg-white/5 hover:border-white/20 transition-all duration-300 group shadow-2xl">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-blue-400 text-3xl font-black group-hover:scale-110 transition-transform">
                       @#
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="text-3xl font-black tracking-tight mb-2 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">{feature.title}</h3>
                      <p className="text-lg text-gray-300 font-medium opacity-80">{feature.description}</p>
                    </div>
                  </button>
                );
              })}
              <button onClick={() => logout({ returnTo: window.location.origin })} className="w-full py-5 mt-4 rounded-[2.5rem] bg-red-500/10 hover:bg-red-500/20 text-red-400 font-black uppercase tracking-[0.4em] border border-red-500/20 transition-all">
                Sign Out
              </button>
            </div>
          )}
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

      <div className="h-12 w-[1px] bg-white/10 mx-2 shrink-0" />
      
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
      </main>
    </div>
  );
};

export default UrbanFlow;