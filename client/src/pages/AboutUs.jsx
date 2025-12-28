import React from 'react';
import FloatingLines from '../ui/FloatingLines';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

const teamMembers = [
  { 
    name: "Ishwar", 
    email: "ishwar@example.com", 
    image: "/src/ui/ishwar.jpg",
    linkedin: "https://www.linkedin.com/in/ishwarkumawat/"
  },
  { 
    name: "Arushi Nayak", 
    email: "arushi@example.com", 
    image: "/src/ui/arushi.jpg",
    linkedin: "https://www.linkedin.com/in/arushi-nayak-29299a344/"
  },
  { 
    name: "Aryan Gupta", 
    email: "aryan@example.com", 
    image: "/src/ui/aryan.jpg",
    linkedin: "https://www.linkedin.com/in/aryan-gupta-278376313/"
  },
  { 
    name: "Shreyansh Sachan", 
    email: "shreyansh@example.com", 
    image: "/src/ui/shreyansh.jpg",
    linkedin: "https://www.linkedin.com/in/shreyansh-sachan/"
  },
];

const AboutUs = () => {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden 
      bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex flex-col items-center pt-32 pb-20 px-6">
      
      <div className="absolute inset-0 z-0 pointer-events-none">
        <FloatingLines />
      </div>

      <div className="relative z-10 max-w-3xl text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
          About Us
        </h1>
        <p className="text-lg md:text-xl text-gray-300 leading-relaxed px-4">
          Hi, we are a group of small indie developers from MNNIT. We developed this project to help everyone guide through the cities with ease and comfort of their fingertips.
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl w-full">
        {teamMembers.map((member, index) => (
          <a 
            key={index} 
            href={member.linkedin} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block no-underline"
          >
            <Card 
              className="bg-black/40 backdrop-blur-md border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-2 group flex flex-col items-center cursor-pointer"
            >
              <CardHeader className="p-6 pb-0">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-white/60 transition-colors duration-300 mx-auto">
                  <img 
                    src={member.image} 
                    alt={member.name} 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=' + member.name; }}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-6 text-center">
                <CardTitle className="text-xl font-bold text-white mb-2">
                  {member.name}
                </CardTitle>
                <p className="text-sm text-blue-300/80 font-medium truncate">
                  {member.email}
                </p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
};

export default AboutUs;