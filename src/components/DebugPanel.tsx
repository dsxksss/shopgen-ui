import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2 } from 'lucide-react';
import { subscribeToLogs, type LogPayload } from '../lib/api';

export function DebugPanel() {
  const [logs, setLogs] = useState<LogPayload[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    
    subscribeToLogs((log) => {
      setLogs((prev) => [...prev, log]);
    }).then(fn => {
      unlisten = fn;
    }).catch(console.error);

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const levelColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-blue-400';
      case 'success': return 'text-green-400';
      case 'warn': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="w-screen h-screen bg-[#0d1117] flex flex-col overflow-hidden m-0">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-mono text-slate-300 font-bold tracking-wide">Backend Logs</span>
        </div>
        <div>
          <button 
            onClick={() => setLogs([])}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="清空日志"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed space-y-1.5 custom-scrollbar bg-[#0d1117]">
        {logs.length === 0 ? (
          <div className="text-slate-600 italic h-full flex flex-col items-center justify-center">
            <Terminal className="w-8 h-8 mb-2 opacity-20" />
            Waiting for backend events...
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex items-start gap-3 hover:bg-slate-800/30 px-2 py-0.5 rounded break-words">
              <span className="text-slate-600 shrink-0 select-none">
                {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 })}
              </span>
              <span className={`shrink-0 uppercase font-bold text-[10px] w-12 text-center rounded bg-slate-800/50 py-0.5 ${levelColor(log.level)}`}>
                {log.level}
              </span>
              <span className="text-slate-300 whitespace-pre-wrap">
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
