import { useAuth0 } from "@auth0/auth0-react";
import Login from "../auth/Login";

export default function Home() {
  const { loginWithRedirect } = useAuth0(); 

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white bg-black font-sans">
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/background.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Navbar */}
        <nav className="flex items-center justify-between px-10 py-6">
          <div className="flex items-center gap-3 text-2xl font-bold tracking-tighter">
            <span className="rounded bg-white/20 px-2 py-1 font-mono text-xl border border-white/10">@#</span>
            UrbanFlow
          </div>
          
          <button 
            onClick={() => loginWithRedirect()} 
            className="rounded-full border border-white px-6 py-2 transition-all hover:bg-white hover:text-black cursor-pointer"
          >
            Login
          </button>
        </nav>

        <main className="flex flex-1 flex-col items-center justify-center text-center px-4">
          <h1 className="mb-8 text-5xl font-black md:text-8xl">
            Be one with the city, <br />
            <span className="opacity-40">not the chaos.</span>
          </h1>

          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
            <Login />
          </div>
        </main>
      </div>
    </div>
  );
}