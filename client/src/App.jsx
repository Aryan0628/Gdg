import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/DashBoard.jsx";
import ProtectedRoute from "./auth/ProtectedRoute";
import CivicHub from "./pages/CivicHub";  // Import the new CivicHub page

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route
        path="/test"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <CivicHub />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;

