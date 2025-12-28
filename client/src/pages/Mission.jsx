import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import FloatingLines from '../ui/FloatingLines';

const missionData = [
  {
    name: "Features Offered",
    description: "To transform urban living into a seamless, safe, and community driven experience. We bridge the gap between technology and civic duty to empower every resident with the tools they need to navigate and improve their city.",
  },
  {
    name: "Pulse Navigator",
    description: "Navigate through the city’s heartbeat with real-time intelligence. Pulse Navigator uses live data crowdsourcing to identify congestion hotspots, suggest optimized routes, and help you bypass the chaos of peak-hour traffic.",
  },
  {
    name: "Sisterhood",
    description: "Never walk alone again. Sisterhood allows you to connect with other women traveling along the same route in real-time. Sync your journeys, form digital walking groups, and ensure everyone reaches their destination safely.",
  },
  {
    name: "EcoSnap",
    description: "Empowering citizens to report overflowing public dustbins by posting geo-tagged photos directly to municipal authorities. Track the status of your complaint and help keep our streets pristine through community-driven accountability.",
  },
  {
    name: "StreetGig",
    description: "A hyperlocal marketplace where residents can post quick chores, from grocery runs to technical fixes, allowing others in the community to complete tasks for instant rewards and side earnings.",
  },
  {
    name: "KindShare",
    description: "Bridging the gap between your generosity and those in need. List clothes or essentials for donation, and local NGOs receive an instant alert to schedule a doorstep collection, ensuring your contributions reach the right hands.",
  }
];

const Mission = () => {
  const [activeSection, setActiveSection] = useState(0);
  const containerRef = useRef(null);

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, clientHeight } = containerRef.current;
      const index = Math.round(scrollTop / clientHeight);
      if (index !== activeSection) {
        setActiveSection(index);
      }
    }
  };

  const scrollToSection = (index) => {
    containerRef.current.scrollTo({
      top: index * window.innerHeight,
      behavior: 'smooth'
    });
  };

  return (
    <div className="relative h-screen w-full bg-slate-900 overflow-hidden">
      {/* Background Restoration */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <FloatingLines />
      </div>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="relative z-10 h-screen overflow-y-auto snap-y snap-mandatory no-scrollbar scroll-smooth"
      >
        {missionData.map((item, index) => (
          <section 
            key={index}
            className="h-screen w-full flex items-center justify-center snap-start px-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.5 }}
              transition={{ duration: 0.6 }}
              className="max-w-5xl w-full text-center"
            >
              {/* RESTORED: Original Gradient Title with LARGE FONT SIZE */}
              <h1 className="text-6xl md:text-9xl font-black mb-12 tracking-tighter uppercase bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                {item.name}
              </h1>

              {/* RESTORED: Original centered description with LARGE FONT SIZE */}
              <div className="flex justify-center">
                <p className="text-2xl md:text-4xl text-gray-200 font-bold leading-tight max-w-4xl">
                  {item.description}
                </p>
              </div>
            </motion.div>
          </section>
        ))}
      </div>

      {/* RESTORED: Original Circle Indicators without glow */}
      <div className="fixed right-10 top-1/2 -translate-y-1/2 z-[110] flex flex-col gap-10">
        {missionData.map((item, index) => (
          <button
            key={index}
            onClick={() => scrollToSection(index)}
            className="group relative flex items-center justify-end"
          >
            <span className="absolute right-12 opacity-0 group-hover:opacity-100 transition-all duration-300 text-xs font-black text-white uppercase tracking-widest whitespace-nowrap pointer-events-none">
              {item.name}
            </span>
            <div 
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                activeSection === index 
                ? 'bg-white scale-[3]' 
                : 'bg-white/30 hover:bg-white/60'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Mission;