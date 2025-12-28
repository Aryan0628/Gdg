import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import ProtectedRoute from "./auth/ProtectedRoute";
import CivicHub from "./pages/CivicHub";
import WomenSafety from "./pages/features/women";
import Traffic from "./pages/features/traffic";
import Garbage from "./pages/features/garbage";
import NGO from "./pages/features/ngo";
import Jobs from "./pages/features/jobs";
import Mission from "./pages/Mission";
import AboutUs from "./pages/AboutUs";
import Navbar from "./components/Navbar";

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
        path="/women"
        element={
          <ProtectedRoute>
            <WomenSafety />
          </ProtectedRoute>
        }
      />
      <Route
        path="/traffic"
        element={
          <ProtectedRoute>
            <Traffic />
          </ProtectedRoute>
        }
      />
      <Route
        path="/garbage"
        element={
          <ProtectedRoute>
            <Garbage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ngo"
        element={
          <ProtectedRoute>
            <NGO />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute>
            <Jobs />
          </ProtectedRoute>
        }
      />
    </Routes>
    </>
  );
}

export default App;