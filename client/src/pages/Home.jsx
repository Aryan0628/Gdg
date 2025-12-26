import { useAuth0 } from "@auth0/auth0-react";
import { ArrowRight, MapPin, Navigation, Zap } from "lucide-react";
import FloatingLines from '../ui/FloatingLines';

export default function Home() {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className="absolute h-screen w-screen overflow-hidden 
      bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">

      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <FloatingLines />
      </div>

      {/* Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

      {/* Content */}
      <main className="relative z-10 h-full flex items-center justify-center px-8">
        <div className="max-w-5xl w-full text-center space-y-8
          bg-black/30 backdrop-blur-xl border border-white/10
          rounded-3xl px-10 py-14 max-h-[85vh] overflow-hidden">

          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30">
            <span className="text-sm font-medium text-blue-200">
              Navigate Smarter, Not Harder
            </span>
          </div>

          <h2 className="text-5xl md:text-6xl font-extrabold leading-tight">
            <span className="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
              Be one with the city,
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              not the chaos
            </span>
          </h2>

          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Experience urban navigation reimagined with real-time intelligence.
          </p>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => loginWithRedirect()}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500
              shadow-xl shadow-purple-500/40 hover:scale-105 transition font-semibold">
              Get Started
            </button>

            <button className="px-8 py-4 rounded-full border border-white/20 hover:bg-white/10">
              Learn More
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
