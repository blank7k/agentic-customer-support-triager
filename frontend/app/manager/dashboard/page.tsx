"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import api from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield,
  FileText,
  CheckCircle2,
  Clock,
  Activity,
  ArrowRight,
  TrendingUp,
  Cpu,
  Loader2
} from "lucide-react";

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    pendingApprovals: 0,
    activeTickets: 0,
    closedTickets: 0,
    totalConversations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const loadManagerDashboard = async () => {
      try {
        // 1. Fetch pending approvals count
        const { count: pendingAppCount, error: appErr } = await supabase
          .from("approvals")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        if (appErr) throw appErr;

        // 2. Fetch active tickets count
        const { count: activeTktCount, error: actErr } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .neq("status", "closed");
        if (actErr) throw actErr;

        // 3. Fetch closed tickets count
        const { count: closedTktCount, error: clsErr } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", "closed");
        if (clsErr) throw clsErr;

        // 4. Fetch total conversations count
        const { count: totalConvCount, error: convErr } = await supabase
          .from("conversations")
          .select("*", { count: "exact", head: true });
        if (convErr) throw convErr;

        setMetrics({
          pendingApprovals: pendingAppCount || 0,
          activeTickets: activeTktCount || 0,
          closedTickets: closedTktCount || 0,
          totalConversations: totalConvCount || 0,
        });

      } catch (err: any) {
        console.error("Error loading manager dashboard metrics:", err);
        setError("Failed to fetch administrative metrics from Postgres.");
      } finally {
        setLoading(false);
      }
    };

    loadManagerDashboard();
  }, [user]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 mb-2" />
        <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Syncing manager controls...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-8">
      
      {/* Page Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center space-x-2">
            <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Operations Control Center</span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Review human-in-the-loop pending queues, telemetry aggregates, and dispatcher tasks.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Pending approvals metric */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-sm">
          <div className="flex justify-between items-start text-zinc-400 mb-4">
            <Clock className="w-5 h-5 text-amber-500" />
            <span className="text-xs uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
              Pending approvals
            </span>
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white">{metrics.pendingApprovals}</p>
          <div className="flex items-center space-x-1.5 text-xs text-zinc-500 mt-2">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            <span>Refund requests suspended</span>
          </div>
        </div>

        {/* Active tickets metric */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-sm">
          <div className="flex justify-between items-start text-zinc-400 mb-4">
            <Activity className="w-5 h-5 text-indigo-500" />
            <span className="text-xs uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
              Open Tickets
            </span>
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white">{metrics.activeTickets}</p>
          <div className="flex items-center space-x-1.5 text-xs text-zinc-500 mt-2">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            <span>Assigned support tickets</span>
          </div>
        </div>

        {/* Closed tickets metric */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-sm">
          <div className="flex justify-between items-start text-zinc-400 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-xs uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
              Closed Tickets
            </span>
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white">{metrics.closedTickets}</p>
          <div className="flex items-center space-x-1.5 text-xs text-zinc-500 mt-2">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <span>Resolved in synthesis</span>
          </div>
        </div>

        {/* Total Conversations metric */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-sm">
          <div className="flex justify-between items-start text-zinc-400 mb-4">
            <Cpu className="w-5 h-5 text-zinc-500" />
            <span className="text-xs uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
              Total Runs
            </span>
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white">{metrics.totalConversations}</p>
          <div className="flex items-center space-x-1.5 text-xs text-zinc-500 mt-2">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
            <span>LangGraph runs tracked</span>
          </div>
        </div>

      </div>

      {/* Main Operations Navigation Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        
        {/* Approvals card link */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm flex flex-col justify-between items-start">
          <div className="mb-6">
            <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">HITL Approvals Queue</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1.5 leading-relaxed">
              Examine escalated refund cases that exceed policy thresholds. Review retrieved policies, inspect completed worker outputs, and approve or reject the operations.
            </p>
          </div>
          <Link
            href="/manager/approvals"
            className="flex items-center space-x-2 py-2 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded text-sm transition-all"
          >
            <span>Open Approvals Queue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Telemetry card link */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm flex flex-col justify-between items-start">
          <div className="mb-6">
            <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">System Telemetry</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1.5 leading-relaxed">
              Analyze model costs, tokens usage aggregates, routing distributions, and database performance telemetry captured across all LiteLLM gateway invoke loops.
            </p>
          </div>
          <Link
            href="/manager/telemetry"
            className="flex items-center space-x-2 py-2 px-4 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-semibold rounded text-sm transition-all"
          >
            <span>Inspect Telemetry</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>

    </div>
  );
}
