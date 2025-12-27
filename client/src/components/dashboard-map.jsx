"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { MapPin, Loader2, Plus, Minus } from "lucide-react"

export function DashboardMap({ userLocation, selectedFeature, isLoadingLocation }) {
  const [markers, setMarkers] = useState([])
  const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.209 }) // Default: Delhi
  const [zoom, setZoom] = useState(12)

  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation)
      setZoom(14)
    }
  }, [userLocation])

  const addMarker = (lat, lng) => {
    const newMarker = {
      id: `marker-${Date.now()}`,
      lat,
      lng,
      label: selectedFeature || "Location",
    }
    setMarkers([...markers, newMarker])
  }

  const handleMapClick = (e) => {
    if (!userLocation) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Simple approximation for demo - in production use actual Google Maps API
    const latOffset = ((y - rect.height / 2) / rect.height) * 0.05
    const lngOffset = ((x - rect.width / 2) / rect.width) * 0.05

    addMarker(mapCenter.lat - latOffset, mapCenter.lng + lngOffset)
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Location Map</CardTitle>
          <div className="flex gap-2">
            <Button size="icon" variant="outline" onClick={() => setZoom(Math.min(zoom + 1, 18))}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={() => setZoom(Math.max(zoom - 1, 8))}>
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
        <div
          className="relative flex-1 bg-muted rounded-lg overflow-hidden cursor-crosshair"
          onClick={handleMapClick}
          style={{
            backgroundImage: `url(/placeholder.svg?height=600&width=800&query=interactive+street+map+with+roads)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {isLoadingLocation && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Getting your location...</p>
              </div>
            </div>
          )}

          {!userLocation && !isLoadingLocation && (
            <div className="absolute inset-0 bg-background/90 flex items-center justify-center">
              <div className="text-center space-y-2">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Location access required to use map</p>
              </div>
            </div>
          )}

          {/* User Location Marker */}
          {userLocation && (
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              }}
            >
              <div className="relative">
                <div className="absolute -inset-2 bg-blue-500 rounded-full opacity-20 animate-ping" />
                <MapPin className="h-8 w-8 text-blue-500 fill-blue-500 drop-shadow-lg" />
              </div>
            </div>
          )}

          {/* User Placed Markers */}
          {markers.map((marker, index) => (
            <div
              key={marker.id}
              className="absolute"
              style={{
                top: `${50 + (mapCenter.lat - marker.lat) * 1000}%`,
                left: `${50 + (marker.lng - mapCenter.lng) * 1000}%`,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="relative group">
                <MapPin className="h-6 w-6 text-red-500 fill-red-500 drop-shadow-lg" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-card border border-border rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs">
                  Pin {index + 1}
                </div>
              </div>
            </div>
          ))}

          {/* Map Controls Overlay */}
          <div className="absolute bottom-4 left-4 bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-blue-500" />
                <span className="text-foreground">Your Location</span>
              </div>
              {markers.length > 0 && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-red-500" />
                  <span className="text-foreground">{markers.length} Pins</span>
                </div>
              )}
            </div>
          </div>

          <div className="absolute top-4 right-4 bg-card border border-border rounded-lg px-3 py-1.5 text-xs shadow-lg">
            <span className="text-muted-foreground">Zoom: {zoom}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Click on the map to pin locations for {selectedFeature}
        </p>
      </CardContent>
    </Card>
  )
}
