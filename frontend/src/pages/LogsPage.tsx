import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useGloveStore } from '../store/useGloveStore';
import {
  Terminal,
  Trash2,
  Download,
  Search,
  ArrowDownCircle,
  Filter,
  Copy,
  Check,
} from 'lucide-react';

export const LogsPage: React.FC = () => {
  const { logs, clearLogs } = useGloveStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'hit' | 'conn' | 'midi' | 'setting'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const lower = log.toLowerCase();
      // Search text match
      if (searchTerm && !lower.includes(searchTerm.toLowerCase())) {
        return false;
      }
      // Category match
      if (filterType === 'hit') return lower.includes('hit:') || lower.includes('test');
      if (filterType === 'conn') return lower.includes('connected') || lower.includes('status') || lower.includes('udp') || lower.includes('serial');
      if (filterType === 'midi') return lower.includes('midi');
      if (filterType === 'setting') return lower.includes('setting') || lower.includes('calibrat');
      return true;
    });
  }, [logs, searchTerm, filterType]);

  const handleCopy = () => {
    navigator.clipboard.writeText(filteredLogs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drum-glove-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 h-full max-w-6xl mx-auto overflow-hidden font-mono text-xs">
      {/* ---------------- LOG VIEWER HEADER & CONTROLS ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-studio-gold/15 text-studio-gold flex items-center justify-center">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-studio-cream">ACTIVITY & TELEMETRY LOGS</h2>
            <p className="text-[11px] text-studio-creamMuted">
              {filteredLogs.length} of {logs.length} events logged
            </p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="flex items-center bg-[#0b0d12] border border-studio-border rounded-xl px-3 py-1.5 focus-within:border-studio-gold shadow-proInset">
            <Search className="w-3.5 h-3.5 text-studio-creamMuted mr-2" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-studio-creamMuted/50 focus:outline-none w-32 sm:w-44"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex bg-[#0b0d12] p-1 rounded-xl border border-studio-border text-[11px] shadow-proInset">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === 'all' ? 'bg-studio-gold text-black font-bold shadow-glowGold' : 'text-studio-creamMuted'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('hit')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === 'hit' ? 'bg-studio-amber text-black font-bold shadow-glowAmber' : 'text-studio-creamMuted'
              }`}
            >
              Hits
            </button>
            <button
              onClick={() => setFilterType('conn')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === 'conn' ? 'bg-studio-green text-black font-bold shadow-glowGreen' : 'text-studio-creamMuted'
              }`}
            >
              Conn
            </button>
            <button
              onClick={() => setFilterType('midi')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === 'midi' ? 'bg-studio-gold text-black font-bold shadow-glowGold' : 'text-studio-creamMuted'
              }`}
            >
              MIDI
            </button>
            <button
              onClick={() => setFilterType('setting')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === 'setting' ? 'bg-studio-surface text-studio-cream font-bold' : 'text-studio-creamMuted'
              }`}
            >
              Setup
            </button>
          </div>

          {/* Auto Scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
              autoScroll
                ? 'bg-studio-green/15 text-studio-green border-studio-green/40 shadow-glowGreen'
                : 'bg-studio-surface text-studio-creamMuted border-studio-border'
            }`}
            title="Toggle Auto-Scroll"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">SCROLL</span>
          </button>

          {/* Copy Logs */}
          <button
            onClick={handleCopy}
            className={`p-2 rounded-xl border transition-all shadow-proInset ${
              copied
                ? 'bg-studio-green/20 border-studio-green text-studio-green'
                : 'bg-studio-card hover:bg-studio-surface border-studio-border text-studio-creamMuted hover:text-white'
            }`}
            title="Copy filtered logs to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Export Logs */}
          <button
            onClick={handleExport}
            className="p-2 rounded-xl bg-studio-card hover:bg-studio-surface border border-studio-border text-studio-creamMuted hover:text-white transition-all shadow-proInset"
            title="Download log file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Clear Logs */}
          <button
            onClick={clearLogs}
            className="p-2 rounded-xl bg-studio-card hover:bg-studio-surface border border-studio-border text-studio-creamMuted hover:text-studio-red transition-all shadow-proInset"
            title="Clear all logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ---------------- LOG TERMINAL CANVAS ---------------- */}
      <div className="flex-1 min-h-0 bg-[#0b0d12] rounded-2xl border border-studio-border p-4 overflow-hidden flex flex-col shadow-2xl">
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-2 select-text font-mono text-[11px]"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-studio-creamMuted/40 italic">
              No matching activity records found.
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              let color = 'text-studio-creamMuted';
              if (log.includes('Hit:') || log.includes('drum_hit')) {
                color = 'text-studio-amber font-semibold';
              } else if (log.includes('CONNECTED') || log.includes('connected')) {
                color = 'text-studio-green font-semibold';
              } else if (log.includes('DISCONNECTED') || log.includes('disconnected')) {
                color = 'text-studio-red font-semibold';
              } else if (log.includes('MIDI') || log.includes('midi')) {
                color = 'text-studio-gold font-semibold';
              } else if (log.includes('CALIBRAT') || log.includes('calibrat')) {
                color = 'text-studio-green font-semibold';
              }

              return (
                <div
                  key={idx}
                  className={`leading-relaxed break-all flex items-start gap-2 hover:bg-[#12151e] px-2 py-0.5 rounded transition-colors ${color}`}
                >
                  <span className="text-studio-creamMuted/40 select-none text-[10px] w-6 shrink-0 text-right">
                    {idx + 1}
                  </span>
                  <span>{log}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsPage;
