"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, 
  BrainCircuit, 
  Settings, 
  RefreshCw, 
  Cpu, 
  Activity, 
  Radio, 
  Play, 
  TrendingUp, 
  Check, 
  X,
  Database,
  CloudLightning,
  AlertTriangle
} from "lucide-react";

export default function Admin() {
  const [models, setModels] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    setError("");
    try {
      const modelsData = await api.get<any[]>("/admin/models");
      const metricsData: any = await api.get<any>("/admin/metrics");
      
      setModels(modelsData || []);
      setMetrics(metricsData || null);
    } catch (err: any) {
      setError(err?.message || "Failed to load admin controls.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleApprove = async (id: string, approve: boolean) => {
    try {
      await api.post(`/admin/models/${id}/approve`, { approve });
      fetchAdminData();
    } catch (err: any) {
      alert("Approval action failed: " + err.message);
    }
  };

  const handleDeploy = async (id: string) => {
    try {
      await api.post(`/admin/models/${id}/deploy`);
      fetchAdminData();
    } catch (err: any) {
      alert("Deployment action failed: " + err.message);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;

    setBroadcasting(true);
    setBroadcastSuccess(false);

    try {
      await api.post("/admin/notifications/broadcast", {
        user_id: "all",
        title: broadcastTitle,
        message: broadcastMessage,
        type: "system"
      });
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 3000);
    } catch (err: any) {
      alert("Failed to broadcast message: " + err.message);
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex justify-between items-center pb-4 border-b border-border-subtle">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Admin Control Center</h1>
          <p className="text-xs text-text-secondary mt-1">Supervise active model instances, registry backtests, and telemetry diagnostics.</p>
        </div>

        <button
          onClick={fetchAdminData}
          className="p-2 bg-bg-surface border border-border-subtle rounded-lg text-text-secondary hover:text-primary-400 hover:border-primary-500 transition cursor-pointer"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Telemetry diagnostics metrics */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Hardware Telemetry Card */}
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary pb-2 border-b border-border-subtle flex items-center gap-1.5">
              <Cpu size={14} className="text-primary-400" />
              <span>Diagnostic System metrics</span>
            </h3>

            {metrics ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* CPU */}
                <div className="bg-bg-card p-3 rounded-lg border border-border-default">
                  <p className="text-[10px] uppercase font-bold text-text-muted">CPU Load</p>
                  <p className="text-base font-extrabold font-mono mt-1 text-text-primary">{metrics.cpu_usage_pct.toFixed(1)}%</p>
                  <div className="w-full h-1 bg-bg-base rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${metrics.cpu_usage_pct}%` }} />
                  </div>
                </div>

                {/* Memory */}
                <div className="bg-bg-card p-3 rounded-lg border border-border-default">
                  <p className="text-[10px] uppercase font-bold text-text-muted">RAM usage</p>
                  <p className="text-base font-extrabold font-mono mt-1 text-text-primary">{metrics.memory_usage_pct.toFixed(1)}%</p>
                  <div className="w-full h-1 bg-bg-base rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${metrics.memory_usage_pct}%` }} />
                  </div>
                </div>

                {/* WebSockets */}
                <div className="bg-bg-card p-3 rounded-lg border border-border-default">
                  <p className="text-[10px] uppercase font-bold text-text-muted">Websockets</p>
                  <p className="text-base font-extrabold font-mono mt-1 text-text-primary">{metrics.active_websocket_connections}</p>
                  <span className="text-[9px] text-[#10B981] flex items-center gap-1 mt-2">
                    <Radio size={10} className="animate-pulse" />
                    Channels Active
                  </span>
                </div>

                {/* Redis */}
                <div className="bg-bg-card p-3 rounded-lg border border-border-default">
                  <p className="text-[10px] uppercase font-bold text-text-muted">Celery Queue</p>
                  <p className="text-base font-extrabold font-mono mt-1 text-text-primary">{metrics.celery_queue_backlog}</p>
                  <span className="text-[9px] text-[rgba(239,68,68,0.8)] mt-2 block">
                    {metrics.celery_queue_backlog === 0 ? "Normal" : "Backlogged"}
                  </span>
                </div>

              </div>
            ) : (
              <div className="p-4 text-center text-xs text-text-muted">No telemetry available</div>
            )}
          </div>

          {/* Model Registry List */}
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary pb-2 border-b border-border-subtle flex items-center gap-1.5 font-sans">
              <BrainCircuit size={14} className="text-primary-400" />
              <span>Model registry catalog</span>
            </h3>

            {loading ? (
              <div className="p-6 text-center text-xs text-text-secondary animate-pulse">Querying registered models...</div>
            ) : (
              <div className="space-y-4">
                {models.map((m) => (
                  <div key={m.id} className="p-4 bg-bg-card border border-border-default rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-primary">{m.model_name}</span>
                        <span className="text-[9px] font-mono bg-bg-elevated px-2 py-0.5 rounded border border-border-subtle text-text-secondary">
                          {m.version_tag}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-text-secondary font-mono mt-1">
                        <span>Accuracy: {(m.accuracy * 100).toFixed(1)}%</span>
                        <span>Sharpe: 2.45</span>
                        <span>Profit Factor: {m.profit_factor.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      
                      {/* Status flag */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-widest border
                        ${m.status === "active" && "bg-bullish/10 text-bullish border-bullish/25"}
                        ${m.status === "approved" && "bg-primary-500/10 text-primary-400 border-primary-500/20"}
                        ${m.status === "backtesting" && "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/25"}
                        ${m.status === "admin_rejected" && "bg-bearish/10 text-bearish border-bearish/25"}`}
                      >
                        {m.status}
                      </span>

                      {/* Action buttons */}
                      {m.status === "backtesting" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(m.id, true)}
                            className="p-1 text-bullish hover:bg-bullish/10 border border-border-default rounded cursor-pointer transition"
                            title="Approve"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => handleApprove(m.id, false)}
                            className="p-1 text-bearish hover:bg-bearish/10 border border-border-default rounded cursor-pointer transition"
                            title="Reject"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}

                      {m.status === "approved" && (
                        <button
                          onClick={() => handleDeploy(m.id)}
                          className="px-2.5 py-1 bg-primary-600 hover:bg-primary-500 text-white font-bold text-[9px] uppercase tracking-wider rounded transition cursor-pointer"
                        >
                          Deploy Model
                        </button>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

        {/* Global systems notification broadcaster */}
        <div className="space-y-6">
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary pb-2 border-b border-border-subtle flex items-center gap-1.5 font-sans">
              <ShieldAlert size={14} className="text-bearish" />
              <span>Broadcast System Notification</span>
            </h3>

            {broadcastSuccess && (
              <div className="bg-bullish/10 border border-bullish/20 text-bullish text-[11px] p-3.5 rounded-lg flex items-center gap-2">
                <Check size={14} />
                <span>Notification dispatched successfully</span>
              </div>
            )}

            <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Notification Title</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Server Maintenance Notice"
                  className="w-full bg-bg-card border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-primary-500 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Message content</label>
                <textarea
                  required
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Broadcasting details..."
                  className="w-full bg-bg-card border border-border-default rounded-lg px-3 py-2.5 text-xs text-text-primary focus:border-primary-500 focus:outline-none transition h-24 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={broadcasting}
                className="w-full bg-bearish hover:bg-bearish/95 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-lg shadow-lg cursor-pointer transition select-none disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {broadcasting ? "Dispatched..." : "Broadcast Alert"}
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
