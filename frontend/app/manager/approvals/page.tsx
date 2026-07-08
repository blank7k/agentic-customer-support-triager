"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import {
  Clock,
  Loader2,
  AlertCircle,
  Cpu,
  Activity,
  FileText,
  CheckCircle,
  XCircle,
  ArrowRight,
  ShieldAlert,
  Bot
} from "lucide-react";

interface PendingApproval {
  id: string;
  conversation_id: string;
  escalated_by: string;
  reason: string;
  status: string;
  created_at: string;
}

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [decisionFeedback, setDecisionFeedback] = useState("");
  const [completedResolution, setCompletedResolution] = useState<string | null>(null);

  // 1. Fetch pending approvals queue
  const { data: approvals = [], isLoading: listLoading, error: listError } = useQuery<PendingApproval[]>({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const res = await api.get("/api/v1/approvals/pending");
      return res.data;
    },
    refetchInterval: 10000, // Poll list every 10s to see new escalations
  });

  // 2. Fetch selected thread's checkpointer state values
  const { data: graphState, isLoading: stateLoading, error: stateError } = useQuery({
    queryKey: ["thread-state", selectedApproval?.conversation_id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/approvals/${selectedApproval?.conversation_id}/state`);
      return res.data;
    },
    enabled: !!selectedApproval?.conversation_id,
  });

  // 3. Mutate decision handler (POST /{thread_id}/decide)
  const decisionMutation = useMutation({
    mutationFn: async ({ threadId, decision }: { threadId: string; decision: "approved" | "rejected" }) => {
      const res = await api.post(`/api/v1/approvals/${threadId}/decide`, {
        decision
      });
      return res.data;
    },
    onSuccess: (data) => {
      // Set the final synthesized email response to show managers
      setCompletedResolution(data.final_response || "Workflow completed.");
      
      // Reset form states
      setDecisionFeedback("");
      
      // Invalid approvals queries list to trigger immediate visual refresh
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
    }
  });

  const handleDecision = (decision: "approved" | "rejected") => {
    if (!selectedApproval) return;
    decisionMutation.mutate({
      threadId: selectedApproval.conversation_id,
      decision
    });
  };

  const handleCloseResolutionView = () => {
    setCompletedResolution(null);
    setSelectedApproval(null);
  };

  // Extract policy retriever context (RAG summaries inside Refund worker detail)
  const results = graphState?.results || [];
  const refundResult = results.find((r: any) => r.agent === "refund");
  const refundSummary = refundResult?.summary || "";
  const refundDetail = refundResult?.detail || "";

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-4rem)]">
      
      {/* Left Sidebar: Escalation Queue */}
      <aside className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-sm font-bold text-zinc-900 dark:text-white">Escalation Queue</span>
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full dark:bg-amber-950/40 dark:text-amber-400 font-semibold">
            {approvals.length} pending
          </span>
        </div>

        {listLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500 mb-2" />
            <p className="text-xs text-zinc-500">Loading queue...</p>
          </div>
        ) : listError ? (
          <div className="p-4 text-xs text-red-500">
            Failed to load pending queue logs.
          </div>
        ) : approvals.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <CheckCircle className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Queue is clear</span>
            <p className="text-[10px] text-zinc-400 mt-1 max-w-[150px]">
              No refund cases require manual manager review at this time.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {approvals.map((app) => (
              <div
                key={app.id}
                onClick={() => {
                  setSelectedApproval(app);
                  setCompletedResolution(null);
                }}
                className={`p-3 rounded-lg text-sm transition-colors cursor-pointer border ${
                  selectedApproval?.id === app.id
                    ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                    : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 px-1.5 py-0.5 rounded">
                    {app.escalated_by}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {new Date(app.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  Reason: {app.reason}
                </p>
                <span className="text-[9px] text-zinc-400 block mt-1">
                  Session: {app.conversation_id.slice(0, 8)}...
                </span>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* Right Main viewport: Audit Desk */}
      <section className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-900/20 overflow-y-auto p-8">
        
        {completedResolution ? (
          /* Decision Synthesized Response Modal View */
          <div className="max-w-3xl mx-auto w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 shadow-sm space-y-6">
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <CheckCircle size={24} />
              <h2 className="text-lg font-bold">Decision Staged & Workflow Completed!</h2>
            </div>
            
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              The manager decision was injected successfully. The Synthesizer compiled the final resolution response email to send to the customer:
            </p>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md font-mono text-xs leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap">
              {completedResolution}
            </div>

            <button
              onClick={handleCloseResolutionView}
              className="py-2 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded text-sm transition-colors"
            >
              Back to Queue
            </button>
          </div>
        ) : !selectedApproval ? (
          /* Placeholder View when no case selected */
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Clock className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Audit Desk Idle</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-sm mt-1">
              Select a pending refund escalation from the sidebar to inspect ledger values and audit workflows.
            </p>
          </div>
        ) : stateLoading ? (
          /* Checkpointer state loading spinner */
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-500 mb-2" />
            <p className="text-xs text-zinc-500">Hydrating thread checkpointer memory...</p>
          </div>
        ) : stateError || !graphState ? (
          /* Fetch error banner */
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded flex items-start space-x-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Failed to sync thread checkpointer values.</span>
          </div>
        ) : (
          /* Case Audit Desk */
          <div className="max-w-4xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left: Execution Details ledger */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Header */}
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <span className="text-xs uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                  Suspended Audit Session
                </span>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Case {selectedApproval.conversation_id.slice(0, 12)}...
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Escalation Trigger: {selectedApproval.reason}
                </p>
              </div>

              {/* 1. Planner Decisions */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <Cpu size={14} className="text-zinc-400" />
                  <span>Planner Scheduled Steps</span>
                </h3>
                
                <div className="space-y-3">
                  {graphState.tasks.map((t: any) => (
                    <div key={t.id} className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-600 dark:text-zinc-400">
                          {t.agent} Node
                        </span>
                        <span className="bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded text-[9px]">
                          {t.status}
                        </span>
                      </div>
                      <p className="font-mono text-zinc-700 dark:text-zinc-300">{t.instruction}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Worker Outcomes */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <Activity size={14} className="text-zinc-400" />
                  <span>Worker Actions ledger</span>
                </h3>
                
                <div className="space-y-4">
                  {results.map((res: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 capitalize">
                          {res.agent} Department Run
                        </span>
                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full text-[9px]">
                          {res.status}
                        </span>
                      </div>
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md font-mono text-xs max-h-40 overflow-y-auto whitespace-pre-wrap">
                        {res.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. RAG store policy guidelines */}
              {refundSummary && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <FileText size={14} className="text-zinc-400" />
                    <span>RAG Policy Retrieval Audit</span>
                  </h3>
                  
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs leading-relaxed font-mono">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                      Matched Policy details
                    </span>
                    {refundSummary}
                  </div>
                </div>
              )}

            </div>

            {/* Right: Decision Panel & Pipeline replayer */}
            <div className="space-y-8">
              
              {/* Manager decision Actions card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center space-x-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <ShieldAlert size={14} className="text-amber-500" />
                  <span>Audit Verdict</span>
                </h3>
                
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Evaluate the refund details and RAG store policies. Staging approval executes the Synthesis response and closes the case.
                </p>

                {/* Optional feedback comments */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Manager Review Note (Optional)
                  </label>
                  <textarea
                    value={decisionFeedback}
                    onChange={(e) => setDecisionFeedback(e.target.value)}
                    rows={3}
                    className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-xs text-zinc-900 dark:text-white focus:outline-none placeholder-zinc-500 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white resize-none"
                    placeholder="e.g. Refund approved: order #ORD-12345 confirmed damaged in transit."
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleDecision("approved")}
                    disabled={decisionMutation.isPending}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded text-sm transition-colors disabled:opacity-50"
                  >
                    {decisionMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                    <span>Approve Refund</span>
                  </button>

                  <button
                    onClick={() => handleDecision("rejected")}
                    disabled={decisionMutation.isPending}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 font-semibold rounded text-sm transition-colors disabled:opacity-50"
                  >
                    <span>Reject Request</span>
                  </button>
                </div>
              </div>

              {/* Execution Pipeline Replayer (Vertical steps progress tracker) */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-6 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  Execution State Graph
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
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block">Planner Plan structured</span>
                    <span className="text-[10px] text-zinc-400 block">Task routing mapped</span>
                  </div>

                  {/* Step 3 */}
                  <div className="relative pl-6">
                    <div className="absolute -left-[7px] mt-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block">Worker Dispatch executed</span>
                    <span className="text-[10px] text-zinc-400 block">Refund department logs recorded</span>
                  </div>

                  {/* Step 4 */}
                  <div className="relative pl-6">
                    <div className="absolute -left-[7px] mt-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white dark:border-zinc-900 animate-pulse" />
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block animate-pulse">Human review paused</span>
                    <span className="text-[10px] text-zinc-400 block">Awaiting manager verdict</span>
                  </div>

                  {/* Step 5 */}
                  <div className="relative pl-6">
                    <div className="absolute -left-[7px] mt-1 w-3.5 h-3.5 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900" />
                    <span className="text-xs font-bold text-zinc-400 block">Response Synthesizer node</span>
                    <span className="text-[10px] text-zinc-400 block">Suspended</span>
                  </div>

                </div>
              </div>

            </div>

          </div>
        )}

      </section>

    </div>
  );
}
