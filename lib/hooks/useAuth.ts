"use client";

import { useEffect } from "react";
import { serverGetCurrentUser } from "@/lib/auth/actions";
import { useAuthStore } from "@/store/authStore";

export const useAuth = () => {
  const { setUser, setRole, setIsLoading } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);

        const user = await serverGetCurrentUser();

        if (user) {
          setUser({ id: user.id, email: user.email, role: user.role });
          setRole(user.role);
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error("Auth error:", error);
        setUser(null);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [setUser, setRole, setIsLoading]);
};
