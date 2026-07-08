"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import {
  MessageSquare,
  FileText,
  Plus,
  Loader2,
  Calendar,
  AlertCircle,
  Tag,
  ShieldAlert,
  ArrowRight
} from "lucide-react";

interface TicketRecord {
  id: string;
  subject: string;
  status: "open" | "in_progress" | "closed";
  category: "billing" | "shipping" | "refund" | "general";
  created_at: string;
}

interface ConversationRecord {
  id: string;
  status: "active" | "pending_approval" | "completed" | "rejected";
  created_at: string;
}

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingChat, setCreatingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch recent conversations
        const { data: convData, error: convErr } = await supabase
          .from("conversations")
          .select("id, status, created_at")
          .order("created_at", { ascending: false })
          .limit(3);
        if (convErr) throw convErr;
        setConversations(convData || []);

        // Fetch recent tickets
        const { data: ticketData, error: ticketErr } = await supabase
          .from("tickets")
          .select("id, subject, status, category, created_at")
          .order("created_at", { ascending: false })
          .limit(3);
        if (ticketErr) throw ticketErr;
        setTickets(ticketData || []);

      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to sync dashboard updates.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const handleStartNewChat = async () => {
    setCreatingChat(true);
    try {
      const res = await api.post("/api/v1/chat/start");
      router.push(`/chat/${res.data.conversation_id}`);
    } catch (err) {
      console.error("Error creating chat:", err);
      setError("Failed to initialize support chat. Make sure API is running.");
      setCreatingChat(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
      case "active":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50";
      case "pending_approval":
      case "in_progress":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50";
      case "completed":
      case "closed":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50";
      default:
        return "bg-zinc-50 border-zinc-200";
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-600 dark:text-zinc-400 mb-2" />
        <p className="text-zinc-500 dark:text-zinc-400 text-xs">Syncing your workspace dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-8">
      
      {/* Intro Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Welcome back, {user?.email?.split("@")[0]}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
          Review recent activities, active support tickets, and direct chat channels.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded flex items-start space-x-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Start Chat action Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-md bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Support Live Chat</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 mb-6 leading-relaxed">
              Open a real-time WebSocket communication stream to route refund queries or trace tracking details.
            </p>
          </div>
          <button
            onClick={handleStartNewChat}
            disabled={creatingChat}
            className="flex items-center justify-center space-x-2 w-full py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded text-sm transition-colors disabled:opacity-50"
          >
            {creatingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Start Live Chat</span>
          </button>
        </div>

        {/* Create Ticket action Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-md bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Create Support Ticket</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 mb-6 leading-relaxed">
              Log a formal support issue. Executed routing plans and policy retrieved results will be saved.
            </p>
          </div>
          <Link
            href="/tickets"
            className="flex items-center justify-center space-x-2 w-full py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-semibold rounded text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Manage Tickets</span>
          </Link>
        </div>

        {/* Workspace Summary metrics Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-md bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center mb-4">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Verification Status</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 mb-6 leading-relaxed">
              Verify pending refund triggers or shipping policies executed dynamically in the background ledger.
            </p>
          </div>
          <Link
            href="/tickets"
            className="flex items-center justify-center space-x-2 w-full py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-semibold rounded text-sm transition-colors"
          >
            <span>View Activities</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>

      {/* Split-screen lists: Recent Chats & Tickets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Recent Chats Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Recent Chats
            </h2>
            <Link href="/chat" className="text-xs font-semibold text-zinc-900 dark:text-white hover:underline flex items-center space-x-1">
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {conversations.length === 0 ? (
              <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg text-center text-xs text-zinc-500">
                No recent chat logs found.
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => router.push(`/chat/${c.id}`)}
                  className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-300 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <MessageSquare className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      Session {c.id.slice(0, 8)}...
                    </span>
                  </div>
                  <span className={`text-[9px] uppercase font-semibold px-2 py-0.5 rounded border ${getStatusColor(c.status)}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Tickets Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Recent Tickets
            </h2>
            <Link href="/tickets" className="text-xs font-semibold text-zinc-900 dark:text-white hover:underline flex items-center space-x-1">
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {tickets.length === 0 ? (
              <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg text-center text-xs text-zinc-500">
                No active tickets. Click create to get started.
              </div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => router.push(`/tickets/${t.id}`)}
                  className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-300 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Tag className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {t.subject}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded">
                      {t.category}
                    </span>
                    <span className={`text-[9px] uppercase font-semibold px-2 py-0.5 rounded border ${getStatusColor(t.status)}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
