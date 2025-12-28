import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import ProtectedRoute from "./auth/ProtectedRoute";
import CivicHub from "./pages/CivicHub";
import Mission from "./pages/Mission";
import AboutUs from "./pages/AboutUs";
import Navbar from "./components/Navbar";

import GarbageFeature from "./pages/Garbage/Garbage"
function App() {
  const location = useLocation();

  // Wo pages jahan hum navbar dikhana chahte hain
  const showNavbar = ["/", "/mission", "/about"].includes(location.pathname);

  return (
    <>
      {/* Ab navbar page ke path ke hisaab se dikhega, login state se fark nahi padega */}
      {showNavbar && <Navbar />} 
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mission" element={<Mission />} />
        <Route path="/about" element={<AboutUs />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <CivicHub />
            </ProtectedRoute>
          }
        />
        <Route
        path="/garbage"
        element={
          <ProtectedRoute>
            <GarbageFeature />
          </ProtectedRoute>
        }
      />
      </Routes>
    </>

  );
}

export default App;