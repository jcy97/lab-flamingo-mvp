import { useCallback, useEffect, useState } from "react";
import NextAuth, { Session } from "next-auth";
import { getSession } from "next-auth/react";
import { usePathname } from "next/navigation";
// This hook doesn't rely on the session provider
export const useCurrentUser = () => {
  const [user, setUser] = useState<Session | null>(null);
  // Changed the default status to loading
  const [status, setStatus] = useState<string>("loading");
  const pathName = usePathname();

  const retrieveUser = useCallback(async () => {
    try {
      const sessionData = await getSession();
      if (sessionData) {
        setUser(sessionData);
        setStatus("authenticated");
        return;
      }

      setStatus("unauthenticated");
    } catch (error) {
      setStatus("unauthenticated");
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // We only want to retrieve the user when there is no user
    if (!user) {
      retrieveUser();
    }

    // use the pathname to force a re-render when the user navigates to a new page
  }, [retrieveUser, user, pathName]);

  return { user, status };
};
