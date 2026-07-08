"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function IndexPage() {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user && role) {
        if (role === "manager") {
          router.push("/manager/dashboard");
        } else {
          router.push("/dashboard");
        }
      } else {
        router.push("/login");
      }
    }
  }, [user, role, isLoading, router]);

  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-800 dark:text-zinc-200" />
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
          Loading your session workspace...
        </p>
      </div>
    </div>
  );
}
