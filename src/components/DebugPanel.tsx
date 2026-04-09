import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, X, Power, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { subscribeToLogs, type LogPayload } from '../lib/api';

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
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
  }, [logs, isOpen, isMaximized]);

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
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-slate-900 text-slate-100 p-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 group border border-slate-700"
      >
        <Terminal className="w-5 h-5" />
        <span className="w-0 overflow-hidden group-hover:w-16 transition-all duration-300 text-sm font-medium whitespace-nowrap">
          调试终端
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed ${isMaximized ? 'inset-4' : 'bottom-6 right-6 w-[500px] h-[400px]'} bg-[#0d1117] rounded-xl shadow-2xl border border-slate-800 flex flex-col z-50 overflow-hidden transition-all duration-300`}
          >
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-slate-800 cursor-move shrink-0">
              <div className="flex items-center gap-2">
                <Power className="w-4 h-4 text-green-500 animate-pulse" />
                <span className="text-xs font-mono text-slate-300">ShopGen.Backend.Session</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setLogs([])}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                  title="清空日志"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                >
                  {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed space-y-1.5 custom-scrollbar">
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
                    <span className="text-slate-300">
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
