"use client";

import React, { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocketChat } from "@/hooks/useWebSocketChat";
import ReactMarkdown from "react-markdown";
import {
  MessageSquare,
  Send,
  Loader2,
  Calendar,
  AlertCircle,
  FileText,
  Copy,
  Check,
  ChevronLeft,
  User,
  ShieldAlert,
  Bot
} from "lucide-react";

export default function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const threadId = resolvedParams.id;
  
  const { user, session } = useAuth();
  const router = useRouter();
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  
  const {
    messages,
    setMessages,
    isProcessing,
    statusMessage,
    conversationStatus,
    setConversationStatus,
    connectionState,
    error,
    sendMessage
  } = useWebSocketChat(threadId);

  // 1. Fetch conversations sidebar and initial message logs from Supabase
  useEffect(() => {
    if (!user || !session || !threadId) return;

    const fetchHistory = async () => {
      try {
        // Fetch conversations list
        const { data: convs } = await supabase
          .from("conversations")
          .select("id, status, created_at")
          .order("created_at", { ascending: false });
        setConversations(convs || []);

        // Fetch messages for active conversation
        const { data: msgs } = await supabase
          .from("messages")
          .select("id, sender, content, created_at")
          .eq("conversation_id", threadId)
          .order("created_at", { ascending: true });

        if (msgs) {
          const formatted = msgs.map((m) => ({
            id: m.id,
            sender: m.sender,
            content: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
          setMessages(formatted);
        }

        // Fetch current status
        const { data: activeConv } = await supabase
          .from("conversations")
          .select("status")
          .eq("id", threadId)
          .maybeSingle();
        if (activeConv) {
          setConversationStatus(activeConv.status);
        }

      } catch (err) {
        console.error("Error loading chat logs:", err);
      }
    };

    fetchHistory();
  }, [threadId, user, session, setMessages, setConversationStatus]);

  // 2. Auto-scroll to bottom of chat feed
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing, statusMessage]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 1500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5 rounded-full dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50">Active</span>;
      case "pending_approval":
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2 py-0.5 rounded-full dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50">Pending Approval</span>;
      case "completed":
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded-full dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50">Completed</span>;
      default:
        return <span className="bg-zinc-50 border border-zinc-200 text-xs px-2 py-0.5 rounded-full dark:bg-zinc-800 dark:border-zinc-700">Completed</span>;
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-4rem)]">
      
      {/* Left Sidebar - Historical Chats (Hidden on Mobile) */}
      <aside className="hidden md:flex flex-col w-72 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-sm font-bold text-zinc-900 dark:text-white">Chat Sessions</span>
          <Link
            href="/chat"
            className="p-1 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-700 dark:text-zinc-300"
            title="Start new chat"
          >
            <ChevronLeft size={16} />
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/chat/${c.id}`}
              className={`flex items-center space-x-3 p-3 rounded-lg text-sm transition-colors ${
                c.id === threadId
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              }`}
            >
              <MessageSquare size={16} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate">Session {c.id.slice(0, 8)}</p>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </aside>

      {/* Right Main Chat Frame */}
      <section className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-900/20 overflow-hidden">
        
        {/* Chat Thread Header */}
        <header className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/chat" className="md:hidden p-1 text-zinc-500 hover:text-zinc-900">
              <ChevronLeft size={20} />
            </Link>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                Conversation Session
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 tracking-wider">
                ID: {threadId}
              </span>
            </div>
            {getStatusBadge(conversationStatus)}
          </div>
          
          {/* Action to view associated support ticket */}
          <Link
            href={`/tickets?thread_id=${threadId}`}
            className="flex items-center space-x-1.5 py-1.5 px-3 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white rounded text-xs font-semibold transition-colors"
          >
            <FileText size={14} />
            <span>Ticket Details</span>
          </Link>
        </header>

        {/* Messages Feed Viewport */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded flex items-start space-x-2 text-red-600 dark:text-red-400 text-xs font-medium">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.sender === "customer";
            const isSys = msg.sender === "system";
            
            return (
              <div
                key={msg.id}
                className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
              >
                {/* Visual Avatar */}
                <div className={`flex items-start max-w-[85%] sm:max-w-xl ${isUser ? "flex-row-reverse space-x-reverse" : "space-x-3"}`}>
                  <div className={`p-1.5 rounded-full flex-shrink-0 ${
                    isUser 
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" 
                      : isSys 
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                      : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400"
                  }`}>
                    {isUser ? <User size={14} /> : isSys ? <ShieldAlert size={14} /> : <Bot size={14} />}
                  </div>

                  <div className="flex flex-col">
                    
                    {/* Content Box */}
                    <div className={`p-4 rounded-lg border text-sm ${
                      isUser
                        ? "bg-zinc-900 text-white border-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-200"
                        : isSys
                        ? "bg-amber-50/50 text-zinc-900 border-amber-200 dark:bg-amber-950/10 dark:text-zinc-100 dark:border-amber-900/50"
                        : "bg-white text-zinc-900 border-zinc-200 dark:bg-zinc-950 dark:text-zinc-100 dark:border-zinc-800"
                    }`}>
                      <div className="prose dark:prose-invert text-sm max-w-none break-words leading-relaxed font-normal">
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* Metadata & Copy action */}
                    <div className={`flex items-center space-x-2 text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 ${isUser ? "justify-end" : "justify-start"}`}>
                      <span>{msg.timestamp}</span>
                      <span>•</span>
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-zinc-900 dark:hover:text-white transition-colors"
                        title="Copy message"
                      >
                        {copiedMessageId === msg.id ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}

          {/* Real-time processing status node logs */}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3">
                <div className="p-1.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 flex-shrink-0 animate-pulse">
                  <Bot size={14} />
                </div>
                <div className="flex flex-col">
                  <div className="p-4 bg-white text-zinc-900 border border-zinc-200 dark:bg-zinc-950 dark:text-zinc-100 dark:border-zinc-800 rounded-lg text-sm flex items-center space-x-2.5 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 animate-pulse">
                      {statusMessage || "Routing request..."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messageEndRef} />
        </div>

        {/* Input Box Footer Form */}
        <footer className="p-6 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              required
              disabled={isProcessing || conversationStatus === "pending_approval" || connectionState !== "connected"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full pl-4 pr-12 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white disabled:opacity-50"
              placeholder={
                connectionState !== "connected"
                  ? "Re-connecting to server..."
                  : conversationStatus === "pending_approval"
                  ? "Chat is paused. Awaiting support manager review."
                  : "Reply to customer support..."
              }
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing || conversationStatus === "pending_approval" || connectionState !== "connected"}
              className="absolute right-3 p-1.5 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 rounded transition-colors disabled:opacity-30"
              title="Send reply"
            >
              <Send size={14} />
            </button>
          </form>
        </footer>

      </section>

    </div>
  );
}
