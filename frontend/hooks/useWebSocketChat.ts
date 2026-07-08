"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatMessage {
  id: string;
  sender: "customer" | "agent" | "system";
  content: string;
  timestamp: string;
}

export function useWebSocketChat(threadId: string) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] = useState<"active" | "pending_approval" | "completed" | "rejected">("active");
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize and hook WebSocket lifecycle
  useEffect(() => {
    if (!threadId || !session?.access_token) {
      return;
    }

    setConnectionState("connecting");
    setError(null);

    // Build WS connection URL mapping current HTTP address
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";
    const wsBaseUrl = apiBaseUrl.replace(/^http/, "ws");
    const wsUrl = `${wsBaseUrl}/api/v1/chat/ws/${threadId}?token=${encodeURIComponent(session.access_token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionState("connected");
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const eventType = data.event;

        if (eventType === "status") {
          setIsProcessing(true);
          setStatusMessage(data.content || `Running inside: ${data.node}`);
        } else if (eventType === "interrupt") {
          setIsProcessing(false);
          setStatusMessage(null);
          setConversationStatus("pending_approval");
          
          // Append system message alerting customer of HITL review
          const alertMsg: ChatMessage = {
            id: `sys-${Date.now()}`,
            sender: "system",
            content: `Review Required: ${data.content || "Your request requires manager approval before completion."}`,
            timestamp: new Date().toLocaleTimeString(),
          };
          setMessages((prev) => [...prev, alertMsg]);
        } else if (eventType === "completion") {
          setIsProcessing(false);
          setStatusMessage(null);
          
          const agentMsg: ChatMessage = {
            id: `agent-${Date.now()}`,
            sender: "agent",
            content: data.content || "",
            timestamp: new Date().toLocaleTimeString(),
          };
          setMessages((prev) => [...prev, agentMsg]);
        } else if (eventType === "error") {
          setIsProcessing(false);
          setStatusMessage(null);
          setError(data.content || "An error occurred during workflow execution");
        }
      } catch (err) {
        console.error("Failed to parse socket message frame:", err);
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection error occurred.");
    };

    ws.onclose = () => {
      setConnectionState("disconnected");
      setIsProcessing(false);
      setStatusMessage(null);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [threadId, session]);

  // Expose triggers
  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError("Unable to send message: socket is not connected.");
      return;
    }

    // Append client message locally
    const clientMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "customer",
      content,
      timestamp: new Date().toLocaleTimeString(),
    };
    
    setMessages((prev) => [...prev, clientMsg]);
    setIsProcessing(true);
    setStatusMessage("Sending message...");
    setError(null);

    // Send payload
    wsRef.current.send(JSON.stringify({ content }));
  }, []);

  return {
    messages,
    setMessages,
    isProcessing,
    statusMessage,
    conversationStatus,
    setConversationStatus,
    connectionState,
    error,
    sendMessage
  };
}
