import { useAuth0 } from "@auth0/auth0-react";
import Login from "../auth/Login";

import FloatingLines from '../ui/FloatingLines';



export default function Home() {
  const { loginWithRedirect } = useAuth0(); 

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white bg-black font-sans">
      {/* Background Image Layer */}  

      <div style={{ width: '100%', height: '600px', position: 'relative' }}>
  <FloatingLines 
    enabledWaves={['top', 'middle', 'bottom']}
    // Array - specify line count per wave; Number - same count for all waves
    lineCount={[10, 15, 20]}
    // Array - specify line distance per wave; Number - same distance for all waves
    lineDistance={[8, 6, 4]}
    bendRadius={5.0}
    bendStrength={-0.5}
    interactive={true}
    parallax={true}
  />
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