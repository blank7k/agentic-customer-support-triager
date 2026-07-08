"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: "customer" | "manager" | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"customer" | "manager" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserRole = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();
        if (data) {
          return data.role as "customer" | "manager";
        }
      } catch (err) {
        console.error("Error fetching user role profile:", err);
      }
      return "customer";
    };

    // Check initial active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        const resolvedRole = await fetchUserRole(session.user.id);
        setRole(resolvedRole);
        setIsLoading(false);
      } else {
        // No session exists. Determine path context
        const path = typeof window !== "undefined" ? window.location.pathname : "";
        const isManagerPath = path.startsWith("/manager");
        const isAuthPath = ["/login", "/register"].includes(path);

        if (!isManagerPath && !isAuthPath) {
          console.log("Guest customer direct access: Logging in guest account...");
          supabase.auth.signInWithPassword({
            email: "customer_guest@triager.io",
            password: "GuestPassword123!"
          }).then(({ data, error }) => {
            if (error) {
              console.error("Auto guest login failed:", error);
              setIsLoading(false);
            }
          });
        } else {
          setIsLoading(false);
        }
      }
    });

    // Listen to session updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const resolvedRole = await fetchUserRole(session.user.id);
        setRole(resolvedRole);
      } else {
        setRole(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Signout error:", e);
    }
    setRole(null);
    setUser(null);
    setSession(null);
    setIsLoading(false);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, session, role, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
};
