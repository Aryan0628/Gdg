// components/urbanflow/UrbanFlowUI.tsx
import FloatingLines from "../../ui/FloatingLines";
import { Button } from "../../ui/button";
import { X } from "lucide-react";
import GoogleMapComponent from "../google-map";
import FeaturePanel from "../feature-panel";
import { SafetyOnboarding } from "../safety-onboarding";

export default function UrbanFlowUI({
  user,
  logout,
  features,
  selectedFeature,
  setSelectedFeature,
  userLocation,
  isLoadingLocation,
  hasJoined,
  setHasJoined,
  requestLocation,
  onFeatureClick,
}) {
  const currentFeature = features.find((f) => f.id === selectedFeature);

  const needsOnboarding =
    selectedFeature === "women-safety" || selectedFeature === "traffic";

  return (
    <div className="relative h-screen w-full bg-slate-950 text-white">
      <FloatingLines />

      {/* HEADER */}
      <header className="h-20 px-8 flex items-center justify-between">
        <h1 className="text-2xl font-black">UrbanFlow</h1>
        <div className="flex items-center gap-3">
          <img src={user?.picture} className="w-8 h-8 rounded-full" />
          <span>{user?.name}</span>
        </div>
      </header>

      {/* MAIN */}
      <div className="flex h-[calc(100%-5rem)]">
        {!selectedFeature ? (
          <div className="flex-1 grid gap-6 p-10">
            {features.map((f) => (
              <button
                key={f.id}
                onClick={() => onFeatureClick(f.id)}
                className="p-8 rounded-3xl bg-white/5 hover:bg-white/10"
              >
                <h3 className="text-2xl font-bold">{f.title}</h3>
                <p className="text-gray-400">{f.description}</p>
              </button>
            ))}
          </div>
        ) : (
          <>
            {/* LEFT PANEL */}
            <aside className="w-96 bg-black/60 p-6">
              <Button variant="ghost" onClick={() => setSelectedFeature(null)}>
                <X className="mr-2" /> Close
              </Button>

              {needsOnboarding && !hasJoined ? (
                <SafetyOnboarding
                  feature={currentFeature}
                  userLocation={userLocation}
                  isLoadingLocation={isLoadingLocation}
                  onRequestLocation={requestLocation}
                  onJoinComplete={() => setHasJoined(true)}
                />
              ) : (
                <FeaturePanel
                  feature={currentFeature}
                  userLocation={userLocation}
                  isLoadingLocation={isLoadingLocation}
                  onRequestLocation={requestLocation}
                />
              )}
            </aside>

            {/* MAP */}
            <main className="flex-1">
              <GoogleMapComponent
                userLocation={userLocation}
                selectedFeature={selectedFeature}
              />
            </main>
          </>
        )}
      </div>

      {/* LOGOUT */}
      <Button
        onClick={() => logout({ returnTo: window.location.origin })}
        className="absolute bottom-6 right-6"
      >
        Sign Out
      </Button>
    </div>
  );
}
