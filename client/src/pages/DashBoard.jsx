import { useAuth0 } from "@auth0/auth0-react";
import Logout from "../auth/Logout";

export default function Dashboard() {
  const { user } = useAuth0();

  return (
    <div>
      <h1>Dashboard</h1>
      <pre>{JSON.stringify(user, null, 2)}</pre>
      <Logout />
    </div>
  );
}
