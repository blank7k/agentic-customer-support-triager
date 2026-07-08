"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import api from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Plus, Loader2, ArrowRight, Calendar, AlertCircle } from "lucide-react";

interface ConversationRecord {
  id: string;
  status: "active" | "pending_approval" | "completed" | "rejected";
  created_at: string;
}

export default function ChatIndexPage() {
  const { user, session } = useAuth();
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Load conversations list
  useEffect(() => {
    if (!user || !session) return;
    
    const fetchConversations = async () => {
      try {
        const { data, error: dbError } = await supabase
          .from("conversations")
          .select("id, status, created_at")
          .order("created_at", { ascending: false });
          
        if (dbError) throw dbError;
        setConversations(data || []);
      } catch (err: any) {
        console.error("Error loading conversations:", err);
        setError("Failed to load historical conversations.");
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user, session]);

  const handleStartNewChat = async () => {
    setCreating(true);
    setError(null);
    try {
      // Calls FastAPI to generate conversation entry in backend database
      const res = await api.post("/api/v1/chat/start");
      const conversationId = res.data.conversation_id;
      router.push(`/chat/${conversationId}`);
    } catch (err: any) {
      console.error("Error creating conversation:", err);
      setError("Failed to start new support session. Make sure FastAPI server is running.");
      setCreating(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50";
      case "pending_approval":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50";
      case "completed":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50";
      default:
        return "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === "pending_approval") return "Review Required";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col justify-start">
      
      {/* Header and Quick start Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-200 dark:border-zinc-800 pb-6 mb-8 gap-4 w-full">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Support Conversations</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Initiate a chat session or review historical support interactions.
          </p>
        </div>
        
        <button
          onClick={handleStartNewChat}
          disabled={creating}
          className="flex items-center space-x-2 py-2 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded text-sm transition-colors disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>New Chat Session</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded flex items-start space-x-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Conversations Feed */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-600 dark:text-zinc-400 mb-2" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs">Loading conversations feed...</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-12 text-center flex flex-col items-center">
          <MessageSquare className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">No active chats</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-sm mt-1 mb-6">
            You don't have any customer support conversations yet. Start a new session to chat with the triager.
          </p>
          <button
            onClick={handleStartNewChat}
            disabled={creating}
            className="flex items-center space-x-2 py-1.5 px-3 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-900 dark:text-white rounded text-xs font-medium transition-colors"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Initialize first session</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-4 w-full">
          {conversations.map((chat) => (
            <div
              key={chat.id}
              onClick={() => router.push(`/chat/${chat.id}`)}
              className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer group"
            >
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-md text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-700 transition-colors">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 truncate max-w-[200px] sm:max-w-md">
                    Session {chat.id.slice(0, 8)}...
                  </span>
                  
                  <div className="flex items-center space-x-2 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(chat.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Status and Action arrow */}
              <div className="flex items-center space-x-4">
                <span className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded border ${getStatusBadgeColor(chat.status)}`}>
                  {getStatusLabel(chat.status)}
                </span>
                
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors transform group-hover:translate-x-0.5" />
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
