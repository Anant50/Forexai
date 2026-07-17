"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UploadCloud, 
  Image as ImageIcon, 
  X, 
  RefreshCcw, 
  BrainCircuit,
  Loader2,
  TrendingDown,
  TrendingUp,
  Activity,
  Zap,
  Target,
  ShieldAlert,
  Search,
  CheckCircle2,
  ScanSearch
} from "lucide-react";

type Timeframe = "1m" | "5m" | "15m" | "30m" | "1H" | "4H" | "1D" | "1W";
type AnalysisStatus = "idle" | "uploading" | "analyzing" | "success" | "error";

export default function ChartImageAnalysisPage() {
  const [timeframe, setTimeframe] = useState<Timeframe | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [previewMsg, setPreviewMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock Result Data based on Architecture
  const mockResult = {
    prediction: "BUY",
    confidence: 87,
    trend_strength: "Strong Bullish",
    risk_level: "Medium",
    explanation: [
      "Strong bullish market structure holding above key 1.0820 support.",
      "Clear Bull Flag consolidation pattern identified following impulsse move.",
      "Historical similarity engine matched 8 highly similar patterns (94% avg similarity), with 7 resulting in immediate bullish continuation.",
      "MACD remains in positive territory indicating momentum supports the breakout."
    ],
    trade_setup: {
      entry_zone: "1.0850 - 1.0855",
      stop_loss: "1.0820",
      take_profit: "1.0920",
      rr: "1:2.1"
    },
    historical_matches: [
      { id: 1, similarity: 96.2, date: "2024-05-18", tf: "5m", pattern: "Bull Flag", outcome: "Bullish", move: "+2.8%" },
      { id: 2, similarity: 94.5, date: "2023-11-02", tf: "5m", pattern: "Bull Pennant", outcome: "Bullish", move: "+1.9%" },
      { id: 3, similarity: 91.8, date: "2024-01-14", tf: "5m", pattern: "Bull Flag", outcome: "Bullish", move: "+3.1%" },
    ]
  };

  // Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(selectedFile.type)) {
      alert("Invalid format. Please upload PNG, JPG, or WEBP.");
      return;
    }
    if (selectedFile.size > 20 * 1024 * 1024) {
      alert("File exceeds 20MB limit.");
      return;
    }
    setFile(selectedFile);
    setPreviewMsg(URL.createObjectURL(selectedFile));
    setStatus("idle");
  };

  const handleAnalyze = () => {
    if (!file || !timeframe) return;
    setStatus("uploading");
    
    // Simulate Upload -> CV Pipeline -> Response (Wait 4.5 seconds for dramatic effect fitting architecture sub-5s goal)
    setTimeout(() => setStatus("analyzing"), 1000);
    setTimeout(() => setStatus("success"), 4500);
  };

  const resetAnalysis = () => {
    setFile(null);
    setPreviewMsg(null);
    setTimeframe("");
    setStatus("idle");
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto h-full flex flex-col pt-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ScanSearch className="text-primary-500" />
            AI Chart Image Intelligence
          </h1>
          <p className="text-text-muted mt-1 max-w-2xl">
            Upload any raw chart screenshot. Our sophisticated Computer Vision and FAISS Vector engine will analyze candlestick structures, map support/resistance, and compare it against millions of historical charts to generate probabilistic edge.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        
        {/* LEFT COLUMN: Input & Upload Zones */}
        <div className={`lg:col-span-5 space-y-6 ${status === "success" ? "hidden lg:block lg:col-span-4 opacity-50 pointer-events-none" : ""}`}>
          
          {/* TIMEFRAME SELECTOR */}
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Activity size={16} className="text-text-secondary"/> Select Chart Timeframe
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {(["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`py-2 rounded-lg text-xs font-bold uppercase transition border ${
                    timeframe === tf 
                      ? "bg-primary-600/20 border-primary-500 text-primary-400" 
                      : "bg-bg-card border-border-default text-text-muted hover:border-text-muted"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
            {!timeframe && <p className="text-xs text-neutral-warning mt-3">*Required: Tell the AI what timeframe this image represents.</p>}
          </div>

          {/* UPLOAD ZONE */}
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-6 shadow-sm">
             <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ImageIcon size={16} className="text-text-secondary"/> Upload Chart Image
             </h3>
             
             <AnimatePresence mode="wait">
               {!file ? (
                 <motion.div 
                   key="upload"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                     dragActive ? "border-primary-500 bg-primary-900/10" : "border-border-strong hover:border-text-secondary hover:bg-bg-card"
                   }`}
                   onDragEnter={handleDrag}
                   onDragLeave={handleDrag}
                   onDragOver={handleDrag}
                   onDrop={handleDrop}
                   onClick={() => inputRef.current?.click()}
                 >
                   <UploadCloud size={48} className="text-text-muted mb-4" />
                   <p className="text-sm font-medium text-white mb-1">Drag & Drop your chart here</p>
                   <p className="text-xs text-text-muted mb-6">Supported: PNG, JPG, WEBP (Max 20MB)</p>
                   <button className="bg-text-secondary/10 hover:bg-text-secondary/20 text-white text-xs font-bold px-6 py-2 rounded-lg transition border border-border-strong">
                     Browse Files
                   </button>
                   <input type="file" ref={inputRef} onChange={handleChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
                 </motion.div>
               ) : (
                 <motion.div 
                   key="preview"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="relative rounded-xl border border-border-strong overflow-hidden bg-bg-card"
                 >
                   <div className="aspect-video relative group">
                      {previewMsg && <img src={previewMsg} alt="Preview" className="w-full h-full object-contain" />}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button onClick={() => inputRef.current?.click()} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg backdrop-blur-sm transition border border-white/20" title="Replace">
                          <RefreshCcw size={18} />
                        </button>
                        <button onClick={resetAnalysis} className="bg-bearish/80 hover:bg-bearish text-white p-2 rounded-lg backdrop-blur-sm transition border border-white/20" title="Remove">
                          <X size={18} />
                        </button>
                      </div>
                   </div>
                   <div className="p-3 bg-bg-elevated border-t border-border-strong flex justify-between items-center">
                     <span className="text-xs text-text-muted truncate max-w-[200px]">{file.name}</span>
                     <span className="text-xs font-bold text-white">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                   </div>
                   <input type="file" ref={inputRef} onChange={handleChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          {/* ANALYSIS TRIGGER */}
          <button 
            onClick={handleAnalyze} 
            disabled={!file || !timeframe || status !== "idle"}
            className="w-full relative group overflow-hidden bg-bg-surface border border-border-subtle rounded-xl p-1 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <div className={`absolute inset-0 bg-gradient-to-r from-primary-600/30 via-accent-cyan/30 to-accent-violet/30 opacity-0 transition duration-500 ${!file || !timeframe ? "" : "group-hover:opacity-100"}`} />
            <div className="bg-bg-elevated relative rounded-lg py-4 flex items-center justify-center gap-3">
              {status === "idle" ? <BrainCircuit size={20} className="text-primary-500" /> : <Loader2 size={20} className="text-primary-500 animate-spin" />}
              <span className="font-bold text-white text-sm uppercase tracking-wider">
                {status === "idle" ? "Execute AI Analysis" : status === "uploading" ? "Uploading Chart..." : "Processing Vision Pipeline..."}
              </span>
            </div>
          </button>
          
        </div>

        {/* RIGHT COLUMN: Results Dashboard */}
        <div className={`lg:col-span-7 transition-all duration-500 ${status === "success" ? "lg:col-span-8" : ""}`}>
           
           {status === "idle" || status === "uploading" ? (
              <div className="h-[600px] border border-border-dashed border-border-default/50 rounded-xl flex items-center justify-center bg-bg-surface/50">
                <p className="text-text-muted text-sm flex flex-col items-center gap-3 text-center px-6">
                  <Search size={32} className="opacity-20" />
                  Upload a chart image and attach a timeframe to generate an AI predictive scan.
                </p>
              </div>
           ) : status === "analyzing" ? (
              <div className="h-[600px] border border-border-subtle rounded-xl flex items-center justify-center bg-bg-surface relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                <div className="flex flex-col items-center relative z-10 space-y-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-border-strong border-t-primary-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BrainCircuit size={28} className="text-primary-400 opacity-80" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-bold text-white animate-pulse">Running Neural Inference...</h3>
                    <p className="text-text-muted text-sm font-mono">Computer Vision extraction active</p>
                  </div>
                  <div className="flex gap-2 text-xs font-mono text-primary-500">
                    <span className="animate-pulse delay-75">OCR [OK]</span>
                    <span>•</span>
                    <span className="animate-pulse delay-150">YOLOv8 [OK]</span>
                    <span>•</span>
                    <span className="animate-pulse delay-300">FAISS [Pending]</span>
                  </div>
                </div>
              </div>
           ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                
                {/* 1. Header Prediction Block */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`col-span-1 border rounded-xl p-5 flex flex-col justify-center items-center relative overflow-hidden ${mockResult.prediction === "BUY" ? "bg-bullish/10 border-bullish/30" : "bg-bearish/10 border-bearish/30"}`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <p className="text-xs uppercase tracking-widest font-bold text-text-muted mb-2 relative z-10">AI Prediction</p>
                    <h2 className={`text-4xl font-black tracking-tight relative z-10 ${mockResult.prediction === "BUY" ? "text-bullish" : "text-bearish"}`}>
                      {mockResult.prediction}
                    </h2>
                  </div>
                  
                  <div className="col-span-2 bg-bg-surface border border-border-subtle rounded-xl p-5 flex items-center justify-between">
                     <div>
                       <p className="text-xs uppercase tracking-widest font-bold text-text-muted mb-2">Confidence Score</p>
                       <div className="flex items-end gap-3">
                         <span className="text-4xl font-black text-white">{mockResult.confidence}%</span>
                         <div className="flex items-center gap-1 text-xs font-bold text-bullish mb-1"><CheckCircle2 size={12}/> High Conviction</div>
                       </div>
                     </div>
                     <div className="h-16 w-16 relative">
                       <svg className="w-full h-full -rotate-90">
                         <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-border-strong drop-shadow-md" />
                         <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="175.9" strokeDashoffset={175.9 - (175.9 * (mockResult.confidence / 100))} className="text-primary-500 drop-shadow-md transition-all duration-1000 ease-out" />
                       </svg>
                     </div>
                  </div>
                </div>

                {/* 2. Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="bg-bg-surface border border-border-subtle rounded-xl p-4">
                     <p className="text-[10px] uppercase font-bold text-text-muted mb-1 flex items-center gap-1.5"><Activity size={12}/> Trend Matrix</p>
                     <p className="text-sm font-semibold text-white">{mockResult.trend_strength}</p>
                   </div>
                   <div className="bg-bg-surface border border-border-subtle rounded-xl p-4">
                     <p className="text-[10px] uppercase font-bold text-text-muted mb-1 flex items-center gap-1.5"><ShieldAlert size={12}/> Risk Level</p>
                     <p className="text-sm font-semibold text-neutral-warning">{mockResult.risk_level}</p>
                   </div>
                   <div className="bg-bg-surface border border-border-subtle rounded-xl p-4">
                     <p className="text-[10px] uppercase font-bold text-text-muted mb-1 flex items-center gap-1.5"><Target size={12}/> Target R/R</p>
                     <p className="text-sm font-semibold text-white">{mockResult.trade_setup.rr}</p>
                   </div>
                   <div className="bg-bg-surface border border-border-subtle rounded-xl p-4">
                     <p className="text-[10px] uppercase font-bold text-text-muted mb-1 flex items-center gap-1.5"><TrendingUp size={12}/> Timeframe</p>
                     <p className="text-sm font-semibold text-primary-400">{timeframe} Inter-day</p>
                   </div>
                </div>

                {/* 3. Expected Trade Setup */}
                <div className="bg-bg-surface border border-border-subtle rounded-xl overflow-hidden">
                   <div className="px-5 py-3 border-b border-border-subtle bg-bg-card">
                     <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">AI Suggested Entry Plan</h3>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border-subtle p-2">
                      <div className="p-4 text-center">
                        <p className="text-[10px] uppercase font-bold text-text-muted mb-1">Buy Zone</p>
                        <p className="text-lg font-mono font-bold text-white">{mockResult.trade_setup.entry_zone}</p>
                      </div>
                      <div className="p-4 text-center">
                        <p className="text-[10px] uppercase font-bold text-text-muted mb-1">Stop Loss (SL)</p>
                        <p className="text-lg font-mono font-bold text-bearish">{mockResult.trade_setup.stop_loss}</p>
                      </div>
                      <div className="p-4 text-center bg-bullish/5">
                        <p className="text-[10px] uppercase font-bold text-text-muted mb-1">Take Profit (TP)</p>
                        <p className="text-lg font-mono font-bold text-bullish">{mockResult.trade_setup.take_profit}</p>
                      </div>
                   </div>
                </div>

                {/* 4. Explainable AI Text */}
                <div className="bg-bg-surface border border-border-subtle rounded-xl p-5">
                   <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                     <Zap size={16} className="text-accent-cyan"/>
                     Explainable AI Breakdown
                   </h3>
                   <ul className="space-y-3">
                     {mockResult.explanation.map((item, idx) => (
                       <li key={idx} className="flex gap-3 text-sm text-text-secondary leading-relaxed bg-bg-card border border-border-default hover:border-text-muted transition p-3 rounded-lg">
                         <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan mt-1.5 flex-shrink-0" />
                         {item}
                       </li>
                     ))}
                   </ul>
                </div>

                {/* 5. Historical Pattern Matching */}
                <div>
                   <div className="flex items-center justify-between mb-3">
                     <h3 className="text-sm font-bold text-white flex items-center gap-2">
                       <ScanSearch size={16} className="text-accent-violet"/>
                       Historical Pattern Similarity Matches
                     </h3>
                     <p className="text-xs font-mono text-text-muted">FAISS Search: {mockResult.historical_matches.length}/10,000,000+ charts</p>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {mockResult.historical_matches.map((match, idx) => (
                       <div key={idx} className="bg-bg-surface border border-border-subtle rounded-xl overflow-hidden hover:border-primary-500/50 transition cursor-pointer group">
                          {/* Mock Thumbnail visually representing a historical chart */}
                          <div className="h-28 bg-bg-card relative flex items-center justify-center border-b border-border-subtle">
                             <div className="absolute inset-0 bg-grid-pattern opacity-30" />
                             <TrendingUp size={24} className="text-text-muted group-hover:text-primary-500 transition opacity-20 group-hover:opacity-100" />
                          </div>
                          <div className="p-3">
                             <div className="flex justify-between items-start mb-2">
                               <p className="text-xs font-bold text-white">{match.pattern}</p>
                               <span className="text-[10px] font-mono font-bold bg-primary-500/10 text-primary-400 px-1.5 py-0.5 rounded">{match.similarity}% Sim</span>
                             </div>
                             <div className="flex justify-between text-[10px] text-text-muted border-t border-border-default pt-2 mt-1">
                               <span>{match.date}</span>
                               <span className="font-bold text-bullish">{match.move}</span>
                             </div>
                          </div>
                       </div>
                     ))}
                   </div>
                </div>

                {/* Reset Action */}
                <div className="flex justify-end pt-4">
                   <button onClick={resetAnalysis} className="text-xs font-bold text-text-muted hover:text-white transition uppercase tracking-wider">
                     ← Analyze Another Chart
                   </button>
                </div>

              </motion.div>
           )}

        </div>

      </div>
    </div>
  );
}
