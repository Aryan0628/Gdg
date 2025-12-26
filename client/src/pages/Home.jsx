import { useAuth0 } from "@auth0/auth0-react";
import { ArrowRight, MapPin, Navigation, Zap } from "lucide-react";
import FloatingLines from '../ui/FloatingLines';

export default function Home() {
  const { loginWithRedirect } = useAuth0();

  const features = [
    {
      icon: Navigation,
      title: "Smart Routes",
      description: "AI-powered navigation that adapts to real-time conditions"
    },
    {
      icon: Zap,
      title: "Instant Updates",
      description: "Live traffic, transit, and incident alerts at your fingertips"
    },
    {
      icon: MapPin,
      title: "City Insights",
      description: "Discover optimal paths through the urban landscape"
    }
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden">
      {/* Animated Background */}

      
      {/* Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Content Container */}
      <div className="relative z-10">
        {/* Navbar */}
        <nav className="flex items-center justify-between px-8 py-6 backdrop-blur-sm bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
              <Navigation className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
              UrbanFlow
            </h1>
          </div>
          <button
            onClick={() => loginWithRedirect()}
            className="group relative px-6 py-2.5 rounded-full border border-white/30 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:bg-white hover:border-white hover:scale-105 hover:shadow-lg hover:shadow-white/20"
          >
            <span className="relative z-10 font-medium transition-colors duration-300 group-hover:text-black">
              Login
            </span>
          </button>
        </nav>
        <div className="absolute top-0 left-0 w-full h-full">
          <FloatingLines />
        </div>

        {/* Hero Section */}
        <main className="container mx-auto px-8 py-24">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            {/* Main Headline */}
            <div className="space-y-4">
              <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 backdrop-blur-sm mb-4">
                <span className="text-sm font-medium text-blue-200">Navigate Smarter, Not Harder</span>
              </div>
              <h2 className="text-6xl md:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                  Be one with the city,
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                  not the chaos
                </span>
              </h2>
            </div>

            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Experience urban navigation reimagined. Flow through your city with intelligent routing, 
              real-time insights, and seamless journey planning.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
              <button
                onClick={() => loginWithRedirect()}
                className="group px-8 py-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/50 font-semibold text-lg flex items-center gap-2"
              >
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 rounded-full border border-white/30 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 font-semibold text-lg">
                Learn More
              </button>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 pt-16">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400/20 to-purple-500/20 flex items-center justify-center mb-4 group-hover:from-blue-400/30 group-hover:to-purple-500/30 transition-colors">
                    <feature.icon className="w-6 h-6 text-blue-300" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
      
    </div>
  );
}