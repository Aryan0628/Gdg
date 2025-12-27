import { useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuthStore } from "../store/useAuthStore";
import axios from "axios";

export default function AuthSyncProvider({ children }) {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const setUser = useAuthStore((s) => s.setUser);
  const hasSynced = useRef(false);


  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) return;
    if (hasSynced.current) return;

    const sync = async () => {
      try {
        const token = await getAccessTokenSilently({
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        });
        console.log(token);
        await axios.post(
          '/api/auth/sync-user',
          {},
          {
              headers: {
              Authorization: `Bearer ${token}`,
            },
          }
      );
        setUser(user);
        console.log(user);
        hasSynced.current = true;
      } catch (err) {
        console.error("Auth sync failed:", err);
      }
    };

    sync();
  }, [isAuthenticated, isLoading, user]);

  return children;
}
