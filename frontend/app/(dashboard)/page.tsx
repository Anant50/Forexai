"use client";

import Link from "next/link";
import { 
  MoreHorizontal, 
  Search,
  Bell,
  SunMoon,
  User,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

// Sparkline Mock Data Generator
const generateSparkline = (isBullish: boolean) => {
  let val = 50;
  return Array.from({ length: 20 }, (_, i) => {
    val += isBullish ? (Math.random() * 5 - 1.5) : (Math.random() * 5 - 3.5);
    return { value: val };
  });
};

const watchlist = [
  { pair: "EUR/USD", flag_left: "🇪🇺", flag_right: "🇺🇸", price: "$1.1350", change: 0.24, isUp: true, state: "BULLISH", data: generateSparkline(true) },
  { pair: "GBP/USD", flag_left: "🇬🇧", flag_right: "🇺🇸", price: "$1.1232", change: -0.12, isUp: false, state: "BEARISH", data: generateSparkline(false) },
  { pair: "USD/JPY", flag_left: "🇺🇸", flag_right: "🇯🇵", price: "$20.000", change: 0.25, isUp: true, state: "NEUTRAL", data: generateSparkline(true) },
  { pair: "USD/JPY", flag_left: "🇺🇸", flag_right: "🇯🇵", price: "---", change: 0, isUp: true, state: "BULLISH", data: generateSparkline(true) },
  { pair: "GBP/JPY", flag_left: "🇬🇧", flag_right: "🇯🇵", price: "$7.011", change: -0.24, isUp: false, state: "BEARISH", data: generateSparkline(false) },
  { pair: "AUD/USD", flag_left: "🇦🇺", flag_right: "🇺🇸", price: "$1.1600", change: 0, isUp: true, state: "BULLISH", data: generateSparkline(true) },
  { pair: "NZD/USD", flag_left: "🇳🇿", flag_right: "🇺🇸", price: "---", change: 0, isUp: false, state: "NEUTRAL", data: generateSparkline(false) }
];

export default function Dashboard() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      
      {/* Top Header Navbar replacement to match wireframe header */}
      <div className="flex items-center justify-between pb-4">
        <div className="relative w-64">
           <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
           <input type="text" placeholder="Search..." className="w-full bg-bg-surface border border-border-default rounded-full py-2 pl-9 pr-4 text-xs text-text-primary focus:outline-none focus:border-primary-500" />
        </div>
        <div className="flex items-center gap-4">
           <button className="text-text-muted hover:text-white transition"><Bell size={18}/></button>
           <button className="text-text-muted hover:text-white transition"><SunMoon size={18}/></button>
           <div className="flex items-center gap-2 cursor-pointer border-l border-border-subtle pl-4">
              <div className="w-6 h-6 rounded-full bg-border-strong flex items-center justify-center shrink-0">
                <User size={12} className="text-white" />
              </div>
              <span className="text-xs text-text-primary">User menu</span>
           </div>
        </div>
      </div>

      {/* KPI stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-2">
        <div className="bg-bg-surface border border-border-default/30 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary-500/5 transition duration-300" />
          <h3 className="text-xs text-text-secondary mb-3 relative z-10 font-medium">Total Predictions Today</h3>
          <p className="text-4xl font-sans font-medium text-white relative z-10 tracking-tight">47</p>
        </div>
        <div className="bg-bg-surface border border-border-default/30 rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary-500/10 transition duration-300" />
          <h3 className="text-xs text-text-secondary mb-3 relative z-10 font-medium">Win Rate</h3>
          <p className="text-4xl font-sans font-medium text-white relative z-10 tracking-tight">68.4%</p>
        </div>
        <div className="bg-bg-surface border border-border-default/30 rounded-xl p-5 relative overflow-hidden group border-t-2 border-t-accent-cyan/50">
          <div className="absolute inset-0 bg-accent-cyan/10 transition duration-300" />
          <h3 className="text-xs text-text-secondary mb-3 relative z-10 font-medium">Open P&L</h3>
          <p className="text-4xl font-sans font-medium text-bullish relative z-10 tracking-tight">+$234.50</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 flex-1">
        
        {/* Watchlist Panel (8 Cols) */}
        <div className="xl:col-span-8 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[14px] font-sans font-semibold text-text-primary">Watchlist</h2>
            <MoreHorizontal size={16} className="text-text-muted cursor-pointer" />
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar max-h-[600px]">
            {watchlist.map((item, idx) => (
              <Link key={idx} href={`/charts/${item.pair.replace("/", "_")}`} className="block block">
                <div className={`bg-bg-card border border-border-default/40 rounded-xl p-4 flex items-center justify-between hover:bg-bg-surface transition group
                  ${item.state === 'NEUTRAL' && 'opacity-60'}
                `}>
                  {/* Pair Info */}
                  <div className="w-[120px]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">{item.flag_left} {item.flag_right}</span>
                      <span className="text-sm font-semibold text-text-primary">{item.pair}</span>
                    </div>
                    <div className="flex items-end gap-2">
                       <span className="text-lg font-mono font-medium text-text-primary {item.price === '---' && 'text-text-muted'}">{item.price}</span>
                       {item.change !== 0 && (
                         <span className={`text-[10px] font-bold flex items-center mb-1 ${item.change > 0 ? "text-bullish" : "text-bearish"}`}>
                           {item.change > 0 ? <ArrowUp size={10}/> : <ArrowDown size={10}/>}
                           {Math.abs(item.change)}%
                         </span>
                       )}
                    </div>
                  </div>

                  {/* Sparkline Chart */}
                  <div className="flex-1 max-w-[200px] h-12">
                     <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={item.data}>
                         <YAxis domain={['dataMin', 'dataMax']} hide />
                         <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke={item.state === 'BULLISH' ? '#3B82F6' : item.state === 'BEARISH' ? '#60A5FA' : '#475569'} 
                            strokeWidth={2} 
                            dot={false}
                            style={{ filter: item.state === 'BULLISH' ? 'drop-shadow(0 4px 6px rgba(59,130,246,0.3))' : 'none' }}
                         />
                       </LineChart>
                     </ResponsiveContainer>
                  </div>

                  {/* Badges */}
                  <div className="text-right flex flex-col justify-center items-end gap-1.5 w-[90px]">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest leading-none block border
                      ${item.state === "BULLISH" && "bg-bullish/5 text-bullish border-bullish/20"}
                      ${item.state === "BEARISH" && "bg-bearish/5 text-bearish border-bearish/20"}
                      ${item.state === "NEUTRAL" && "bg-transparent text-text-muted border-border-default"}
                    `}>
                      {item.state}
                    </span>
                    <span className="text-[9px] text-text-muted/60 uppercase font-semibold">AI signal</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Info widgets sidebars (4 Cols) */}
        <div className="xl:col-span-4 space-y-5">

          {/* Session Clock Stacked Widget */}
          <div className="bg-bg-surface border border-border-default/30 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-text-secondary mb-4">Session Clock</h2>
            <div className="flex flex-col items-center justify-center space-y-[-8px]">
               <div className="bg-bearish/80 backdrop-blur text-white text-[10px] font-bold px-8 py-1.5 rounded-full z-10 shadow-lg border border-white/10 uppercase tracking-widest w-2/3 text-center">
                 London
               </div>
               <div className="bg-bullish/80 backdrop-blur text-white text-[10px] font-bold px-8 py-1.5 rounded-full z-20 shadow-lg border border-white/10 uppercase tracking-widest w-1/2 text-center translate-x-4">
                 NY
               </div>
               <div className="bg-neutral-warning/80 backdrop-blur text-white text-[10px] font-bold px-8 py-1.5 rounded-full z-30 shadow-lg border border-white/10 uppercase tracking-widest w-2/3 text-center">
                 Tokyo
               </div>
               <div className="bg-primary-500/80 backdrop-blur text-white text-[10px] font-bold px-8 py-1.5 rounded-full z-40 shadow-lg border border-white/10 uppercase tracking-widest w-1/2 text-center translate-x-4">
                 Sydney
               </div>
            </div>
          </div>

          {/* Economic Calendar Widget */}
          <div className="bg-bg-surface border border-border-default/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 text-xs font-semibold">
              <h2 className="text-text-secondary">Economic Calendar</h2>
              <span className="text-bullish flex items-center gap-1.5 animate-pulse"><div className="w-1.5 h-1.5 rounded-full bg-bullish"/> Live</span>
            </div>
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center bg-bg-card p-2 rounded">
                 <div className="flex items-center gap-2"><span className="text-sm">🇺🇸</span><span className="text-text-primary">NFP</span></div>
                 <span className="text-text-muted">Tomorrow</span>
              </div>
              <div className="flex justify-between items-center bg-bg-card p-2 rounded">
                 <div className="flex items-center gap-2"><span className="text-sm">🇺🇸</span><span className="text-text-primary">FOMC</span></div>
                 <span className="text-text-muted">+3d</span>
              </div>
              <div className="flex justify-between items-center bg-bg-card p-2 rounded">
                 <div className="flex items-center gap-2"><span className="text-sm">🇯🇵</span><span className="text-text-primary">Tokyo</span></div>
                 <span className="text-text-muted">+3d</span>
              </div>
            </div>
          </div>

          {/* News Feed Widget */}
          <div className="bg-bg-surface border border-border-default/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-text-secondary">News Feed</h2>
              <MoreHorizontal size={14} className="text-text-muted cursor-pointer" />
            </div>
            <div className="space-y-4">
              <div className="border-b border-border-default/30 pb-3">
                 <p className="text-xs text-text-primary leading-tight mb-2">New York's States challenging currency markets in attritions...</p>
                 <span className="inline-block px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider bg-bullish/10 text-bullish border border-bullish/20">Sentiment</span>
              </div>
              <div className="border-b border-border-default/30 pb-3">
                 <p className="text-xs text-text-primary leading-tight mb-2">Beat to store harms and affects to contance to all annelars...</p>
                 <span className="inline-block px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider bg-bearish/10 text-bearish border border-bearish/20">Sentiment</span>
              </div>
              <div>
                 <p className="text-xs text-text-primary leading-tight mb-2">New York's Position: implaned costsammies of singing right now...</p>
                 <span className="inline-block px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider bg-bullish/10 text-bullish border border-bullish/20">Sentiment</span>
              </div>
            </div>
          </div>

          {/* AI Model Health Card */}
          <div className="bg-bg-surface border border-border-default/30 rounded-xl p-5">
             <div className="flex justify-between items-center mb-1">
               <h2 className="text-xs font-semibold text-text-secondary">AI Model Health</h2>
               <MoreHorizontal size={14} className="text-text-muted" />
             </div>
             <p className="text-[10px] text-text-muted mb-2">accuracy</p>
             <h3 className="text-3xl font-sans text-white font-semibold">73.2%</h3>
             <p className="text-[9px] text-text-muted mt-2">Last trained: Jan 25, 22:23</p>
          </div>

        </div>

      </div>

    </div>
  );
}
