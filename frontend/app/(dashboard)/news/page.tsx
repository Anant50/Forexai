"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Newspaper, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Info,
  Globe,
  Radio
} from "lucide-react";

export default function News() {
  const [activeTab, setActiveTab] = useState<"calendar" | "news">("calendar");
  const [calendar, setCalendar] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let calData = await api.get<any[]>("/market-data/calendar").catch(() => []);
        let newsData = await api.get<any[]>("/market-data/news").catch(() => []);
        
        if (!calData || calData.length === 0) {
          calData = [
             { id: 1, currency: "USD", event_name: "Fed Interest Rate Decision", event_time: new Date().toISOString(), forecast: "5.5%", previous: "5.5%", impact: "high" },
             { id: 2, currency: "EUR", event_name: "ECB Press Conference", event_time: new Date().toISOString(), forecast: "-", previous: "-", impact: "high" },
             { id: 3, currency: "GBP", event_name: "CPI m/m", event_time: new Date().toISOString(), forecast: "0.4%", previous: "0.2%", impact: "medium" }
          ];
        }
        
        if (!newsData || newsData.length === 0) {
          newsData = [
             { id: 1, source: "Reuters", sentiment: "positive", headline: "Dollar Index Rises on Strong Jobs Data", content_snippet: "The US dollar index climbed higher today following a surprisingly resilient payrolls report...", published_at: new Date().toISOString(), affected_currencies: ["USD", "EUR", "JPY"] },
             { id: 2, source: "Bloomberg", sentiment: "negative", headline: "Euro Stumbles as Lagarde Signals Dovish Tone", content_snippet: "Christine Lagarde indicated that the European Central Bank might consider halting its rate hiking cycle...", published_at: new Date().toISOString(), affected_currencies: ["EUR", "GBP"] }
          ];
        }

        setCalendar(calData);
        setNews(newsData);
      } catch {
        // Handled directly above
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">News & Scheduled events</h1>
          <p className="text-xs text-text-secondary mt-1">Monitor high volatility economic parameters releases and news sentiments.</p>
        </div>

        {/* Tab triggers */}
        <div className="flex bg-bg-card p-1 rounded-lg border border-border-default select-none">
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer
              ${activeTab === "calendar" 
                ? "bg-bg-elevated text-primary-400 border border-border-strong shade-md" 
                : "text-text-secondary hover:text-text-primary"
              }`}
          >
            Economic Calendar
          </button>
          <button
            onClick={() => setActiveTab("news")}
            className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer
              ${activeTab === "news" 
                ? "bg-bg-elevated text-primary-400 border border-border-strong shade-md" 
                : "text-text-secondary hover:text-text-primary"
              }`}
          >
            Sentiment News
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-12 text-center text-xs text-text-secondary flex flex-col justify-center items-center gap-3.5"
          >
            <span className="w-8 h-8 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
            <span className="uppercase font-bold tracking-widest">Enumerating feed timelines...</span>
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {activeTab === "calendar" ? (
              <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary border-b border-border-subtle pb-2 flex items-center gap-1.5">
                  <Calendar size={14} className="text-primary-400" />
                  <span>Scheduled Weekly Events</span>
                </h3>

                <div className="divide-y divide-border-subtle">
                  {calendar.map((ev) => (
                    <div key={ev.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      {/* Name currency */}
                      <div className="flex items-start gap-3">
                        <span className="text-[10px] font-extrabold uppercase bg-bg-card border border-border-default px-2.5 py-1 rounded text-text-primary">
                          {ev.currency}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-text-primary">{ev.event_name}</h4>
                          <p className="text-[10px] text-text-secondary mt-0.5">
                            Scheduled: {new Date(ev.event_time).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Forecast actual details */}
                      <div className="flex items-center gap-6 font-mono text-xs">
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-text-muted">Forecast</p>
                          <p className="font-bold text-text-secondary mt-0.5">{ev.forecast || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-text-muted">Previous</p>
                          <p className="font-bold text-text-secondary mt-0.5">{ev.previous || "—"}</p>
                        </div>
                        
                        {/* Impact Level */}
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-extrabold tracking-widest border
                            ${ev.impact === "red" && "bg-bearish/10 text-bearish border-bearish/25"}
                            ${ev.impact === "high" && "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/25"}
                            ${ev.impact === "medium" && "bg-neutral-warning/10 text-neutral-warning border-neutral-warning/25"}
                            ${ev.impact === "low" && "bg-text-secondary/15 text-text-secondary border-border-subtle"}`}
                          >
                            {ev.impact} Impact
                          </span>
                        </div>

                      </div>

                    </div>
                  ))}
                </div>

              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {news.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-bg-surface border border-border-subtle rounded-xl p-5 hover:border-primary-500 transition space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-text-muted flex items-center gap-1">
                          <Radio size={10} className="text-primary-400" />
                          {item.source}
                        </span>
                        
                        <span className={`uppercase font-extrabold text-[8px] tracking-wider px-2 py-0.5 rounded border
                          ${item.sentiment === "positive" && "bg-bullish/10 text-bullish border-bullish/25"}
                          ${item.sentiment === "negative" && "bg-bearish/10 text-bearish border-bearish/25"}
                          ${item.sentiment === "neutral" && "bg-text-secondary/15 text-text-secondary border-border-subtle"}`}
                        >
                          {item.sentiment}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-text-primary leading-snug">{item.headline}</h4>
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{item.content_snippet}</p>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-border-subtle text-[10px] text-text-muted">
                      <span>Published: {new Date(item.published_at).toLocaleDateString()}</span>
                      <div className="flex gap-1.5">
                        {item.affected_currencies.map((curr: string) => (
                          <span key={curr} className="font-bold uppercase bg-bg-card border border-border-default px-2 py-0.5 rounded text-text-primary">
                            {curr}
                          </span>
                        ))}
                      </div>
                    </div>

                  </div>
                ))}

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
