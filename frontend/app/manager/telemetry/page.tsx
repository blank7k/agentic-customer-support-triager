"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import {
  BarChart3,
  TrendingUp,
  Cpu,
  Clock,
  Zap,
  Activity,
  Loader2,
  AlertCircle
} from "lucide-react";

interface TelemetryLog {
  timestamp: string;
  task_type: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  latency_sec: number;
  cache_hit: boolean;
}

export default function TelemetryPage() {
  // Fetch telemetry logs
  const { data: logs = [], isLoading, error } = useQuery<TelemetryLog[]>({
    queryKey: ["telemetry-report"],
    queryFn: async () => {
      const res = await api.get("/api/v1/telemetry/report");
      return res.data;
    },
    refetchInterval: 5000, // Poll every 5 seconds for live analytics updates
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-600 dark:text-zinc-400 mb-2" />
        <p className="text-zinc-500 dark:text-zinc-400 text-xs">Syncing gateway telemetry report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto w-full p-4 mt-8 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded flex items-start space-x-2 text-red-600 dark:text-red-400 text-sm">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Failed to retrieve system telemetry metrics.</span>
      </div>
    );
  }

  // Calculate Aggregates
  const totalCalls = logs.length;
  const totalCost = logs.reduce((sum, log) => sum + (log.cost || 0), 0);
  const cacheHits = logs.filter((log) => log.cache_hit).length;
  const cacheHitRate = totalCalls > 0 ? (cacheHits / totalCalls) * 100 : 0;
  const averageLatency = totalCalls > 0 
    ? logs.reduce((sum, log) => sum + (log.latency_sec || 0), 0) / totalCalls 
    : 0;

  // Group by Model/Provider for distribution table
  const modelStatsMap: Record<string, {
    model: string;
    provider: string;
    calls: number;
    tokens: number;
    cost: number;
    latencySum: number;
  }> = {};

  logs.forEach((log) => {
    const key = `${log.provider}/${log.model}`;
    if (!modelStatsMap[key]) {
      modelStatsMap[key] = {
        model: log.model,
        provider: log.provider,
        calls: 0,
        tokens: 0,
        cost: 0,
        latencySum: 0,
      };
    }
    const stat = modelStatsMap[key];
    stat.calls += 1;
    stat.tokens += (log.input_tokens || 0) + (log.output_tokens || 0);
    stat.cost += log.cost || 0;
    stat.latencySum += log.latency_sec || 0;
  });

  const modelStats = Object.values(modelStatsMap);

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-8 overflow-y-auto">
      
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center space-x-2">
          <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span>LiteLLM Telemetry Metrics</span>
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
          Monitor LLM gateway traffic, operational costs, and local endpoint latencies in real-time.
        </p>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Cost */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-sm">
          <div className="flex justify-between items-start text-zinc-400 mb-4">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <span className="text-xs uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
              Total Budget Cost
            </span>
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white">
            ${totalCost.toFixed(6)}
          </p>
          <span className="text-[10px] text-zinc-400 block mt-2">
            Aggregated tokens cost in USD
          </span>
        </div>

        {/* API Calls */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-sm">
          <div className="flex justify-between items-start text-zinc-400 mb-4">
            <Activity className="w-5 h-5 text-green-500" />
            <span className="text-xs uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
              Gateway Calls
            </span>
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white">
            {totalCalls}
          </p>
          <span className="text-[10px] text-zinc-400 block mt-2">
            Total request invocations routed
          </span>
        </div>

        {/* Cache Hit Rate */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-sm">
          <div className="flex justify-between items-start text-zinc-400 mb-4">
            <Zap className="w-5 h-5 text-amber-500" />
            <span className="text-xs uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
              Cache Hit Rate
            </span>
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white">
            {cacheHitRate.toFixed(1)}%
          </p>
          <span className="text-[10px] text-zinc-400 block mt-2">
            Bypassed LLM runs via local cache
          </span>
        </div>

        {/* Avg Latency */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-sm">
          <div className="flex justify-between items-start text-zinc-400 mb-4">
            <Clock className="w-5 h-5 text-zinc-500" />
            <span className="text-xs uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
              Avg Latency
            </span>
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white">
            {averageLatency.toFixed(2)}s
          </p>
          <span className="text-[10px] text-zinc-400 block mt-2">
            Average transaction response time
          </span>
        </div>

      </div>

      {/* Model Distribution Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-zinc-400" />
            <span>Model Invocation Distribution</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider">
                <th className="p-4">Provider</th>
                <th className="p-4">Model Name</th>
                <th className="p-4 text-center">Requests</th>
                <th className="p-4 text-center">Total Tokens</th>
                <th className="p-4 text-right">Accumulated Cost</th>
                <th className="p-4 text-right">Avg Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
              {modelStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-400">
                    No gateway routing logs tracked yet.
                  </td>
                </tr>
              ) : (
                modelStats.map((stat, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="p-4 capitalize font-semibold">{stat.provider}</td>
                    <td className="p-4 font-mono text-zinc-900 dark:text-zinc-100">{stat.model}</td>
                    <td className="p-4 text-center font-bold">{stat.calls}</td>
                    <td className="p-4 text-center">{stat.tokens.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono font-semibold">${(stat.cost ?? 0).toFixed(6)}</td>
                    <td className="p-4 text-right font-mono">{((stat.latencySum ?? 0) / (stat.calls || 1)).toFixed(2)}s</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Event Log Feed */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center space-x-2">
            <Activity className="w-4 h-4 text-zinc-400" />
            <span>Gateway Transaction Log</span>
          </h3>
          <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded font-mono">
            LIVE FEED
          </span>
        </div>
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider sticky top-0">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Task Context</th>
                <th className="p-4">Model Routed</th>
                <th className="p-4 text-center">Tokens</th>
                <th className="p-4 text-center">Cache</th>
                <th className="p-4 text-right">Cost</th>
                <th className="p-4 text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-zinc-700 dark:text-zinc-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400">
                    No individual request logs recorded.
                  </td>
                </tr>
              ) : (
                [...logs].reverse().map((log, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="p-4 text-zinc-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-4 text-zinc-900 dark:text-zinc-100 font-sans capitalize">
                      {log.task_type.replace("_", " ")}
                    </td>
                    <td className="p-4 text-zinc-500">{log.model}</td>
                    <td className="p-4 text-center">
                      {(log.input_tokens ?? 0) + (log.output_tokens ?? 0)}
                    </td>
                    <td className="p-4 text-center">
                      {log.cache_hit ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">HIT</span>
                      ) : (
                        <span className="text-zinc-400">MISS</span>
                      )}
                    </td>
                    <td className="p-4 text-right text-zinc-900 dark:text-zinc-100">
                      ${(log.cost ?? 0).toFixed(6)}
                    </td>
                    <td className="p-4 text-right">
                      {(log.latency_sec ?? 0).toFixed(2)}s
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
