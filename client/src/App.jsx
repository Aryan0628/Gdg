import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ProtectedRoute from "./auth/ProtectedRoute";
import CivicHub from "./pages/CivicHub";  // Import the new CivicHub page
import GarbageFeature from "./pages/Garbage/Garbage"
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
        path="/garbage"
        element={
          <ProtectedRoute>
            <GarbageFeature />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;

