"use client";

import React, { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import ReactMarkdown from "react-markdown";
import {
  FileText,
  Loader2,
  Calendar,
  AlertCircle,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  Activity,
  Cpu,
  Clock,
  DollarSign
} from "lucide-react";

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;
  const router = useRouter();

  // Query ticket details from FastAPI, which hydrates it with active LangGraph checkpointer memory
  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/tickets/${ticketId}`);
      return res.data;
    },
    refetchInterval: 5000, // Poll every 5s to capture state changes live
  });

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

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-600 dark:text-zinc-400 mb-2" />
        <p className="text-zinc-500 dark:text-zinc-400 text-xs">Loading ticket timeline details...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded flex items-start space-x-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Error loading ticket: {error?.message || "Ticket not found or access denied."}</span>
        </div>
      </div>
    );
  }

  const graphState = ticket.graph_state;
  const tasks = graphState?.tasks || [];
  const results = graphState?.results || [];
  
  // Find policy retriever context (RAG logs inside Refund worker detail)
  const refundResult = results.find((r: any) => r.agent === "refund");
  const refundSummary = refundResult?.summary || "";
  const refundDetail = refundResult?.detail || "";

  // Telemetry estimations based on nodes executed
  const estimatedCost = (tasks.length * 0.0003) + 0.0005; // planner + workers + synth averages
  const totalTokens = (tasks.length * 500) + 1200;

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-8 flex flex-col justify-start">
      
      {/* Navigation Header */}
      <div className="flex items-center space-x-4 border-b border-zinc-200 dark:border-zinc-800 pb-6 w-full">
        <button
          onClick={() => router.push("/tickets")}
          className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-700 dark:text-zinc-300"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white truncate max-w-md">
              {ticket.subject}
            </h1>
            <span className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded border ${getStatusColor(ticket.status)}`}>
              {ticket.status}
            </span>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
            Linked Session: {ticket.conversation_id} • Created on {new Date(ticket.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full items-start">
        
        {/* Left Side: Execution Ledger & Context Details */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. Planner Decisions List */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-zinc-500" />
              <span>Planner Decision Ledger</span>
            </h3>
            
            {tasks.length === 0 ? (
              <p className="text-zinc-500 dark:text-zinc-400 text-xs italic">
                No tasks planned yet. Triager is analyzing...
              </p>
            ) : (
              <div className="space-y-4">
                {tasks.map((task: any) => (
                  <div key={task.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded">
                        {task.agent} Department
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        task.status === "completed" 
                          ? "bg-green-50 text-green-700 border-green-200" 
                          : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-mono">
                      Instruction: {task.instruction}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Executed Workers Outcomes */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-zinc-500" />
              <span>Executed Worker Outcomes</span>
            </h3>
            
            {results.length === 0 ? (
              <p className="text-zinc-500 dark:text-zinc-400 text-xs italic">
                Awaiting worker completions...
              </p>
            ) : (
              <div className="space-y-6">
                {results.map((result: any, idx: number) => (
                  <div key={idx} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 pb-6 last:pb-0">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white capitalize">
                        {result.agent} Worker Output
                      </span>
                      <span className="text-[10px] bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded-full dark:bg-green-950/20 dark:text-green-400">
                        {result.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mb-2">
                      Summary: {result.summary}
                    </p>
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded text-xs leading-relaxed font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {result.detail}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Vectorless RAG policy search context */}
          {refundSummary && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-zinc-500" />
                <span>RAG Policy Retrieval Context</span>
              </h3>
              
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-3">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block uppercase tracking-wider">
                  Selected policy reference
                </span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 font-mono leading-relaxed bg-white dark:bg-zinc-950 p-3 rounded border border-zinc-200 dark:border-zinc-800">
                  {refundSummary}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Timeline & Telemetry Summary */}
        <div className="space-y-8">
          
          {/* 1. HITL Approval Status Widget */}
          {graphState?.approval_required && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span>HITL Review Status</span>
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 dark:text-amber-400 block mb-1">
                    Escalation Trigger
                  </span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                    {graphState.approval_reason || "Refund amount exceeds threshold"}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-zinc-100 dark:border-zinc-800 pt-3">
                  <span className="text-zinc-500">Manager Decision</span>
                  <span className={`px-2.5 py-0.5 rounded-full uppercase font-bold text-[10px] border ${
                    graphState.approval_status === "approved"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : graphState.approval_status === "rejected"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                  }`}>
                    {graphState.approval_status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Visual Timeline */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-6 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span>Execution Pipeline</span>
            </h3>
            
            <div className="relative border-l border-zinc-200 dark:border-zinc-800 ml-3 space-y-6">
              
              {/* Step 1 */}
              <div className="relative pl-6">
                <div className="absolute -left-[7px] mt-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900" />
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">Customer request logged</span>
                <span className="text-[10px] text-zinc-400 block">Workflow instantiated</span>
              </div>

              {/* Step 2 */}
              <div className="relative pl-6">
                <div className="absolute -left-[7px] mt-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900" />
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">Planner parsing complete</span>
                <span className="text-[10px] text-zinc-400 block">Structured routing output</span>
              </div>

              {/* Step 3 */}
              <div className="relative pl-6">
                <div className={`absolute -left-[7px] mt-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                  results.length > 0 ? "bg-green-500" : "bg-zinc-200 dark:bg-zinc-800 animate-pulse"
                }`} />
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">Worker Dispatch executed</span>
                <span className="text-[10px] text-zinc-400 block">
                  {results.length > 0 ? `${results.length} workers returned` : "Awaiting nodes..."}
                </span>
              </div>

              {/* Step 4 */}
              {graphState?.approval_required && (
                <div className="relative pl-6">
                  <div className={`absolute -left-[7px] mt-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                    graphState.approval_status === "approved" || graphState.approval_status === "rejected"
                      ? "bg-green-500"
                      : "bg-amber-500 animate-pulse"
                  }`} />
                  <span className="text-xs font-bold text-zinc-900 dark:text-white block">Manager HITL check</span>
                  <span className="text-[10px] text-zinc-400 block">
                    {graphState.approval_status === "pending" ? "Awaiting feedback" : "Completed review"}
                  </span>
                </div>
              )}

              {/* Step 5 */}
              <div className="relative pl-6">
                <div className={`absolute -left-[7px] mt-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                  ticket.status === "closed" || graphState?.final_response ? "bg-green-500" : "bg-zinc-200 dark:bg-zinc-800"
                }`} />
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">Response Synthesizer run</span>
                <span className="text-[10px] text-zinc-400 block">Final customer resolution draft</span>
              </div>

            </div>
          </div>

          {/* 3. Telemetry Summary Cards */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4">
              Telemetry Summary
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-lg text-center">
                <DollarSign className="w-4 h-4 text-zinc-500 mx-auto mb-1" />
                <span className="text-[10px] text-zinc-500 block">Estimated Cost</span>
                <span className="text-xs font-bold text-zinc-900 dark:text-white">${estimatedCost.toFixed(5)}</span>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-lg text-center">
                <CheckCircle2 className="w-4 h-4 text-zinc-500 mx-auto mb-1" />
                <span className="text-[10px] text-zinc-500 block">Total Tokens</span>
                <span className="text-xs font-bold text-zinc-900 dark:text-white">{totalTokens}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
