"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import api from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Plus, Loader2, ArrowRight, Tag, AlertCircle, Calendar } from "lucide-react";

interface TicketRecord {
  id: string;
  conversation_id: string;
  subject: string;
  status: "open" | "in_progress" | "closed";
  category: "billing" | "shipping" | "refund" | "general";
  created_at: string;
}

interface ConversationRecord {
  id: string;
  created_at: string;
}

function TicketsContent() {
  const { user, session } = useAuth();
  const searchParams = useSearchParams();
  const preselectedThread = searchParams.get("thread_id") || "";
  
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Create Ticket Form State
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<"billing" | "shipping" | "refund" | "general">("general");
  const [conversationId, setConversationId] = useState(preselectedThread);

  const router = useRouter();

  // 1. Fetch tickets and user's active conversations on mount
  useEffect(() => {
    if (!user || !session) return;

    const fetchTicketsAndSessions = async () => {
      try {
        // Fetch tickets list
        const { data: ticketData, error: ticketErr } = await supabase
          .from("tickets")
          .select("*")
          .order("created_at", { ascending: false });
        if (ticketErr) throw ticketErr;
        setTickets(ticketData || []);

        // Fetch active conversations list to populate dropdown
        const { data: convData, error: convErr } = await supabase
          .from("conversations")
          .select("id, created_at")
          .order("created_at", { ascending: false });
        if (convErr) throw convErr;
        setConversations(convData || []);

        // Trigger open form automatically if thread is preselected
        if (preselectedThread) {
          setConversationId(preselectedThread);
          setShowCreateForm(true);
        }

      } catch (err: any) {
        console.error("Error loading tickets data:", err);
        setError("Failed to fetch support tickets history.");
      } finally {
        setLoading(false);
      }
    };

    fetchTicketsAndSessions();
  }, [user, session, preselectedThread]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !conversationId) return;

    setCreating(true);
    setError(null);
    try {
      const res = await api.post("/api/v1/tickets", {
        conversation_id: conversationId,
        subject: subject.trim(),
        category
      });
      
      // Append to local list
      setTickets((prev) => [res.data, ...prev]);
      
      // Reset form
      setSubject("");
      setCategory("general");
      setShowCreateForm(false);
    } catch (err: any) {
      console.error("Error creating ticket:", err);
      setError("Failed to log ticket. Make sure conversation session is valid.");
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50";
      case "in_progress":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50";
      case "closed":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50";
      default:
        return "bg-zinc-50 border-zinc-200";
    }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col justify-start">
      
      {/* Header and Toggle form */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-200 dark:border-zinc-800 pb-6 mb-8 gap-4 w-full">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Support Tickets</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Create or inspect formal support tickets linked to conversation thread runs.
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center space-x-2 py-2 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{showCreateForm ? "Close Form" : "Log New Ticket"}</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded flex items-start space-x-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ticket creation form viewport */}
      {showCreateForm && (
        <div className="mb-8 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm w-full">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4">
            New Ticket Details
          </h3>
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Ticket Subject / Issue Summary
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white text-sm"
                placeholder="e.g. Refund denied for damaged iPhone ORD-993"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white text-sm"
                >
                  <option value="general">General Query</option>
                  <option value="billing">Billing Inquiry</option>
                  <option value="shipping">Shipping & Tracking</option>
                  <option value="refund">Refund Claim</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Select Associated Chat Session
                </label>
                <select
                  required
                  value={conversationId}
                  onChange={(e) => setConversationId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white text-sm"
                >
                  <option value="">-- Choose Chat Session --</option>
                  {conversations.map((c) => (
                    <option key={c.id} value={c.id}>
                      Session {c.id.slice(0, 8)}... ({new Date(c.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating || !subject.trim() || !conversationId}
              className="flex items-center space-x-2 py-2 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded text-sm transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Save Ticket</span>
            </button>
          </form>
        </div>
      )}

      {/* Tickets List */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-600 dark:text-zinc-400 mb-2" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs">Loading support tickets feed...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-12 text-center flex flex-col items-center">
          <FileText className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">No tickets logged</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-sm mt-1 mb-6">
            You don't have any formal support tickets registered. Start a conversation session first, then log a ticket.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 w-full">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => router.push(`/tickets/${ticket.id}`)}
              className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer group"
            >
              <div className="flex items-start space-x-4 min-w-0">
                <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-md text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-700 transition-colors flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 truncate pr-4">
                    {ticket.subject}
                  </span>
                  
                  <div className="flex flex-wrap gap-2 items-center text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded text-[10px]">
                      Session: {ticket.conversation_id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Categorization badges */}
              <div className="flex items-center space-x-4 flex-shrink-0">
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                  {ticket.category}
                </span>
                
                <span className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded border ${getStatusColor(ticket.status)}`}>
                  {ticket.status}
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

export default function TicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-600 dark:text-zinc-400 mb-2" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs">Loading support tickets page...</p>
        </div>
      }
    >
      <TicketsContent />
    </Suspense>
  );
}
