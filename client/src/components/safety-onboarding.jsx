import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { MapPin, Shield, TrendingUp, Users, CheckCircle2 } from "lucide-react"

export function SafetyOnboarding({
  feature,
  userLocation,
  isLoadingLocation,
  onRequestLocation,
  onJoinComplete,
}) {
  const [safetyScore, setSafetyScore] = useState(null)
  const Icon = feature.icon

  useEffect(() => {
    if (userLocation) {
      setTimeout(() => {
        let score
        if (feature.id === "traffic") {
          score = Math.floor(Math.random() * 30) + 60
        } else {
          score = Math.floor(Math.random() * 30) + 70
        }
        setSafetyScore(score)
      }, 1000)
    }
  }, [userLocation, feature.id])

  const getSafetyLevel = (score) => {
    if (score >= 85) return { level: "Excellent", color: "text-green-500", bgColor: "bg-green-500/10" }
    if (score >= 70) return { level: "Good", color: "text-blue-500", bgColor: "bg-blue-500/10" }
    if (score >= 50) return { level: "Moderate", color: "text-yellow-500", bgColor: "bg-yellow-500/10" }
    return { level: "Alert", color: "text-red-500", bgColor: "bg-red-500/10" }
  }

  const getScoreLabel = () => {
    if (feature.id === "traffic") {
      return {
        title: "Traffic Flow Score",
        description: "Based on current congestion and road conditions in your area",
        levelPrefix: "Traffic Flow",
        statusText: "Traffic conditions are favorable",
      }
    }
    return {
      title: "Area Safety Score",
      description: "Based on recent activity and community reports in your area",
      levelPrefix: "Safety",
      statusText: "Your area is relatively safe",
    }
  }

  const scoreLabel = getScoreLabel()
  const safetyLevel = safetyScore ? getSafetyLevel(safetyScore) : null

  return (
    <div className="space-y-4">
      {/* Header */}
    

      {/* Location Permission */}
      {!userLocation ? (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <MapPin className="h-5 w-5 text-yellow-500 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Location Access Required</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We need your location to calculate safety and nearby assistance
                </p>
                <Button onClick={onRequestLocation} disabled={isLoadingLocation} className="w-full">
                  {isLoadingLocation ? "Getting Location..." : "Allow Location Access"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Location Confirmed */}
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-1" />
                <div>
                  <h3 className="font-semibold">Location Confirmed</h3>
                  <p className="text-sm text-muted-foreground">
                    Lat: {userLocation.lat.toFixed(6)}, Lng: {userLocation.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score */}
          <Card>
            <CardHeader>
              <CardTitle>{scoreLabel.title}</CardTitle>
              <CardDescription>{scoreLabel.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {!safetyScore ? (
                <div className="flex justify-center py-8">
                  <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-6 text-center">
                  <div className={`inline-flex h-32 w-32 rounded-full items-center justify-center ${safetyLevel.bgColor}`}>
                    <div>
                      <div className={`text-4xl font-bold ${safetyLevel.color}`}>{safetyScore}</div>
                      <div className="text-xs">/100</div>
                    </div>
                  </div>

                  <h3 className={`text-xl font-semibold ${safetyLevel.color}`}>
                    {safetyLevel.level} {scoreLabel.levelPrefix}
                  </h3>

                  <p className="text-sm text-muted-foreground">{scoreLabel.statusText}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Join */}
          {safetyScore && (
            <Card className="border-blue-500/50 bg-blue-500/5">
              <CardContent className="pt-6 text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Join {feature.title} to access live map tracking and reporting
                </p>
                <Button
                  onClick={onJoinComplete}
                  className="w-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-2 px-1 py-1 text-lg font-bold"
                >
                  <feature.icon className="h-4 w-4" />
                  <span>Join {feature.title}</span>
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
