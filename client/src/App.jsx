import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ProtectedRoute from "./auth/ProtectedRoute";
import CivicHub from "./pages/CivicHub";
import WomenSafety from "./pages/features/women";
import Traffic from "./pages/features/traffic";
import Garbage from "./pages/features/garbage";
import NGO from "./pages/features/ngo";
import Jobs from "./pages/features/jobs";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
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
  );
}

export default App;

