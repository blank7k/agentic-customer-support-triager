"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Terminal, ArrowRight, Loader2, User, Shield } from "lucide-react";

export default function RegisterPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userRole, setUserRole] = useState<"customer" | "manager">("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // If already authenticated, redirect
  React.useEffect(() => {
    if (!authLoading && user && role) {
      if (role === "manager") {
        router.push("/manager/dashboard");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, role, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Call Supabase signup, passing user metadata role
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: userRole,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 shadow-sm text-center">
          <div className="flex justify-center mb-4">
            <Terminal className="w-10 h-10 text-zinc-950 dark:text-white" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Registration Successful!</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
            Please check your email inbox to confirm your email verification link before logging in.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center space-x-2 py-2 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded text-sm transition-colors"
          >
            <span>Go to Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 shadow-sm">
        
        {/* Header Icon & Intro */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center space-x-2 font-bold text-zinc-900 dark:text-white mb-2 text-xl">
            <Terminal className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
            <span>Triager.io</span>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center">
            Create an account to test customer triaging workflows and dashboards.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded text-red-600 dark:text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Account Role Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Choose Account Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              
              {/* Customer Option */}
              <button
                type="button"
                onClick={() => setUserRole("customer")}
                className={`flex items-center justify-center space-x-2 p-3 border rounded text-sm font-medium transition-all ${
                  userRole === "customer"
                    ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white ring-1 ring-zinc-900 dark:ring-white"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                }`}
              >
                <User className="w-4 h-4" />
                <span>Customer</span>
              </button>

              {/* Manager Option */}
              <button
                type="button"
                onClick={() => setUserRole("manager")}
                className={`flex items-center justify-center space-x-2 p-3 border rounded text-sm font-medium transition-all ${
                  userRole === "manager"
                    ? "border-indigo-600 dark:border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-600 dark:ring-indigo-400"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Manager</span>
              </button>

            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white text-sm"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white text-sm"
              placeholder="Min. 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded text-sm transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Sign Up</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-4 text-center">
          <p className="text-zinc-500 dark:text-zinc-400 text-xs">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-zinc-900 dark:text-white hover:underline">
              Log in instead
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
