import { useAuth0 } from "@auth0/auth0-react";
import { useAuthStore } from "../store/useAuthStore";
import Logout from "../auth/Logout";
import axios from "axios";
import { useEffect } from "react";
export default function Dashboard() {
  const { user } = useAuth0();
  const storedUser = useAuthStore((s) => s.user);

  const fetchData = async () => {
    const res=await axios.get("/api/me",{withCredentials:true});
    console.log(res);
  }
  useEffect(() => {
    fetchData();
  }, []);
  return (
    <div>
      <h1>Dashboard</h1>

      <h3>Auth0 User</h3>
      <pre>{JSON.stringify(user, null, 2)}</pre>

      <h3>Stored User (Zustand)</h3>
      <pre>{JSON.stringify(storedUser, null, 2)}</pre>

      <Logout />
    </div>
  );
}
