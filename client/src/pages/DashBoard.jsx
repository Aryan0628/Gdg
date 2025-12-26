import { useAuth0 } from "@auth0/auth0-react";
import Logout from "../auth/Logout";
import axios from "axios";
import { useEffect } from "react";
export default function Dashboard() {
  const { user } = useAuth0();
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
      <pre>{JSON.stringify(user, null, 2)}</pre>
      <Logout />
    </div>
  );
}
