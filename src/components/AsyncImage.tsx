import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Loader2 } from 'lucide-react';

export function AsyncImage({ src, alt, ...props }: any) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;
    let url = src;

    if (url && url.startsWith('shopgen-image://')) {
      const id = url.replace('shopgen-image://', '');
      setLoading(true);
      invoke('load_image_asset', { id })
        .then((arr: any) => {
          if (!active) return;
          const bytes = new Uint8Array(arr as number[]);
          const blob = new Blob([bytes], { type: 'image/png' });
          createdUrl = URL.createObjectURL(blob);
          setObjectUrl(createdUrl);
        })
        .catch(console.error)
        .finally(() => { if (active) setLoading(false); });
    } else if (url && url.startsWith('data:image/')) {
      fetch(url).then(r => r.blob()).then(blob => {
          if (!active) return;
          createdUrl = URL.createObjectURL(blob);
          setObjectUrl(createdUrl);
      }).catch(() => { if (active) setObjectUrl(url); });
    } else {
      setObjectUrl(url);
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [src]);

  return (
    <>
      {loading && !objectUrl ? (
        <div className="flex items-center justify-center w-full h-48 bg-slate-100 rounded-xl border border-slate-200">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : objectUrl ? (
        <img
          src={objectUrl}
          alt={alt}
          {...props}
          onClick={() => setIsOpen(true)}
          className={`${props.className || ''} cursor-zoom-in transition-transform hover:opacity-95`}
        />
      ) : null}

      {isOpen && objectUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm cursor-zoom-out p-8"
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
        >
          <img
            src={objectUrl}
            alt={alt}
            className="w-auto h-auto max-w-full max-h-full object-contain rounded-xl shadow-2xl scale-100"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-6 right-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium border border-white/20 shadow-lg"
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          >
             关闭预览
          </button>
        </div>
      )}
    </>
  );
}
