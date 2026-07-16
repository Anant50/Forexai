"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  FileText, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Tag
} from "lucide-react";

export default function Journal() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Form input field state
  const [pair, setPair] = useState("EUR/USD");
  const [direction, setDirection] = useState("long");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [lots, setLots] = useState("0.1");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchEntries = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<any[]>("/journal/entries");
      setEntries(data);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch journal entries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pair || !entryPrice) return;

    setSubmitting(true);
    try {
      const payload = {
        pair,
        direction,
        entry_price: parseFloat(entryPrice),
        stop_loss: stopLoss ? parseFloat(stopLoss) : undefined,
        take_profit: takeProfit ? parseFloat(takeProfit) : undefined,
        position_size_lots: parseFloat(lots),
        notes,
        tags: tags ? tags.split(",").map(t => t.trim()) : [],
        trade_taken: true
      };

      await api.post("/journal/entries", payload);
      setFormOpen(false);
      
      // Clear inputs
      setEntryPrice("");
      setStopLoss("");
      setTakeProfit("");
      setNotes("");
      setTags("");

      fetchEntries();
    } catch (err: any) {
      alert("Submission error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this journal entry?")) return;
    try {
      await api.delete(`/journal/entries/${id}`);
      fetchEntries();
    } catch (err: any) {
      alert("Deletion error: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Trading Journal</h1>
          <p className="text-xs text-text-secondary mt-1">Review active, completed, and AI-suggested operations to monitor discipline metrics.</p>
        </div>

        <button
          onClick={() => setFormOpen(!formOpen)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-xs uppercase tracking-widest px-4.5 py-2.5 rounded-lg shadow-lg cursor-pointer transition select-none glow-blue"
        >
          <Plus size={14} />
          <span>New Entry</span>
        </button>
      </div>

      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-bg-surface border border-border-subtle rounded-xl p-5 overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* pair */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Forex Pair</label>
                  <input
                    type="text"
                    required
                    value={pair}
                    onChange={(e) => setPair(e.target.value)}
                    placeholder="e.g. EUR/USD"
                    className="w-full bg-bg-card border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none transition"
                  />
                </div>

                {/* direction */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Direction</label>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                    className="w-full bg-bg-card border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-primary-500 focus:outline-none transition"
                  >
                    <option value="long">LONG (Buy)</option>
                    <option value="short">SHORT (Sell)</option>
                  </select>
                </div>

                {/* entry price */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Entry Price</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    placeholder="e.g. 1.08450"
                    className="w-full bg-bg-card border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none transition"
                  />
                </div>

                {/* stop loss */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Stop Loss (SL)</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="e.g. 1.08100"
                    className="w-full bg-bg-card border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none transition"
                  />
                </div>

                {/* take profit */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Take Profit (TP)</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="e.g. 1.09200"
                    className="w-full bg-bg-card border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none transition"
                  />
                </div>

                {/* Lots */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Lots Size</label>
                  <input
                    type="number"
                    step="0.01"
                    value={lots}
                    onChange={(e) => setLots(e.target.value)}
                    placeholder="e.g. 0.1"
                    className="w-full bg-bg-card border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none transition"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. double_bottom, supply_zone"
                    className="w-full bg-bg-card border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none transition"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1 md:col-span-3">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Notes & Explanations</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe market configurations triggering execution..."
                    className="w-full bg-bg-card border border-border-default rounded-lg px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary-500 focus:outline-none transition h-20 resize-none"
                  />
                </div>

              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="bg-transparent hover:bg-bg-card border border-border-default text-text-secondary hover:text-text-primary font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Entry"}
                </button>
              </div>

            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries table list */}
      <div className="bg-bg-surface border border-border-subtle rounded-xl overflow-hidden">
        
        {loading && (
          <div className="p-12 text-center text-xs text-text-secondary flex flex-col items-center justify-center gap-3.5">
            <span className="w-8 h-8 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
            <span className="uppercase font-bold tracking-widest">Loading Journal database...</span>
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-xs text-bearish flex flex-col items-center gap-2">
            <AlertCircle size={24} />
            <p className="font-extrabold uppercase tracking-wide">Error Fetching Logs</p>
            <p className="text-text-muted max-w-sm">{error}</p>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="p-12 text-center text-xs text-text-muted flex flex-col items-center justify-center gap-3">
            <BookOpen className="w-8 h-8 text-text-secondary" />
            <h3 className="font-bold uppercase tracking-wider text-text-primary">No Records Logged</h3>
            <p className="max-w-xs mt-1 leading-relaxed">Your trading logs database is currently empty. Click 'New Entry' to document trades.</p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-bg-card border-b border-border-default text-text-muted [font-size:10px] uppercase font-bold tracking-widest">
                  <th className="p-4">Date</th>
                  <th className="p-4">Pair</th>
                  <th className="p-4">Direction</th>
                  <th className="p-4">Lots</th>
                  <th className="p-4">Entry price</th>
                  <th className="p-4">P&L</th>
                  <th className="p-4">Outcome</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-bg-card/50 transition">
                    <td className="p-4 font-mono text-text-secondary">
                      {new Date(entry.trade_date || entry.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 font-bold text-text-primary font-mono">{entry.pair}</td>
                    <td className="p-4">
                      <span className={`uppercase font-extrabold text-[10px] tracking-wider px-2 py-0.5 rounded-full border
                        ${entry.direction === "long" 
                          ? "bg-bullish/10 text-bullish border-bullish/25" 
                          : "bg-bearish/10 text-bearish border-bearish/25"}`}
                      >
                        {entry.direction}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-text-secondary">{entry.position_size_lots || "—"}</td>
                    <td className="p-4 font-mono text-text-primary">{entry.entry_price.toFixed(5)}</td>
                    <td className="p-4 font-mono font-bold">
                      {entry.actual_pnl !== null ? (
                        <span className={entry.actual_pnl >= 0 ? "text-bullish" : "text-bearish"}>
                          {entry.actual_pnl >= 0 ? "+" : ""}${entry.actual_pnl.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-text-muted">Open</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`uppercase font-bold [font-size:9px] px-2 py-0.5 rounded border
                        ${entry.outcome === "win" && "bg-bullish/10 text-bullish border-bullish/20"}
                        ${entry.outcome === "loss" && "bg-bearish/10 text-bearish border-bearish/20"}
                        ${entry.outcome === "breakeven" && "bg-text-secondary/10 text-text-secondary border-border-default"}
                        ${entry.outcome === "open" && "bg-primary-500/10 text-primary-400 border-primary-500/20"}`}
                      >
                        {entry.outcome}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 rounded-md text-text-muted hover:text-bearish hover:bg-bearish/20 transition cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
