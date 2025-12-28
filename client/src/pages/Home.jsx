import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import FloatingLines from '../ui/FloatingLines';

export default function Home() {
  const { loginWithRedirect } = useAuth0();
  const navigate = useNavigate();

  return (
    <div className="absolute h-screen w-screen overflow-hidden 
      bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white font-sans">

      {/* Background Theme */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <FloatingLines />
      </div>

      {/* Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

      {/* Header Section */}
      <header className="absolute top-8 left-10 z-[110] flex items-center gap-4">
        {/* Placeholder for Icon (@#) */}
        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-blue-400 font-black text-xl">
          @#
        </div>
        {/* Brand Name (UrbanFlow) - Removed 'uppercase' class */}
        <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
          UrbanFlow
        </h1>
      </header>

      {/* Main Content */}
      <main className="relative z-10 h-full flex items-center justify-center px-8">
        <div className="max-w-5xl w-full text-center space-y-12
          bg-black/30 backdrop-blur-xl border border-white/10
          rounded-[3rem] px-10 py-20 max-h-[85vh] overflow-hidden shadow-2xl">

          <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
            <span className="text-white">
              Be one with the city,
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              not the chaos
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 font-medium max-w-2xl mx-auto leading-relaxed">
            Experience urban navigation reimagined with real-time intelligence.
          </p>

          <div className="flex justify-center gap-6 pt-4">
            <button
              onClick={() => loginWithRedirect()}
              className="px-10 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600
              shadow-xl shadow-blue-500/40 hover:scale-105 transition-all font-bold text-lg">
              Get Started
            </button>

            <button 
              onClick={() => navigate('/mission')}
              className="px-10 py-4 rounded-full border border-white/20 hover:bg-white/10 transition-all active:scale-95 font-bold text-lg">
              Learn More
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}