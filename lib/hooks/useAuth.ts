"use client";

import { useEffect } from "react";
import { serverGetProfileByEmail } from "@/lib/db-actions";
import { useAuthStore } from "@/store/authStore";

export const useAuth = () => {
  const { setUser, setRole, setIsLoading } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);

        const adminProfile = await serverGetProfileByEmail("admin@trinomul.com") as any;

        if (adminProfile) {
          setUser({
            id: String(adminProfile.id),
            email: adminProfile.email,
            user_metadata: {
              full_name: adminProfile.full_name_en,
              role: adminProfile.role,
            },
          } as any);
          setRole(adminProfile.role);
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
