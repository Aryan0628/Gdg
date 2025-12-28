// src/components/LoginButton.jsx
import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

const LoginButton = () => {
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  // Only show if not already authenticated
  if (isAuthenticated) return null;

  return (
    <button
      onClick={() => loginWithRedirect()}
      className="px-6 py-2 rounded-full font-bold transition-all duration-300 transform hover:scale-105 
      bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-purple-500/20 text-white"
    >
      Login
    </button>
  );
};

export default LoginButton;