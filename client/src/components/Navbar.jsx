import React from 'react';
import { NavLink } from 'react-router-dom';

const Navbar = () => {
  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Features', path: '/mission' },
    { name: 'About Us', path: '/about' },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-[150] flex items-center justify-center p-8">
      {/* Centered Navigation Menu */}
      <div className="flex gap-2 bg-black/40 backdrop-blur-xl px-2 py-2 rounded-full border border-white/10 shadow-2xl">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `relative px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ease-out ${
                isActive 
                  ? 'text-white bg-white/5 backdrop-blur-lg shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;