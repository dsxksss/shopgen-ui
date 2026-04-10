import React from 'react';
import { AsyncImage } from './AsyncImage';

interface GalleryProps {
  images: string[];
}

export function ImageCarousel({ images }: GalleryProps) {
  if (!images || images.length === 0) return null;

  // 垂直作品集布局：针对电商视觉稿优化的 100% 完整展示方案
  return (
    <div className="flex flex-col gap-12">
      {images.map((img, i) => (
        <div key={i} className="group relative rounded-[32px] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50 bg-white flex flex-col">
           {/* 内容展示层：使用纯白背景处理不同比例，消除黑边 */}
           <div className="relative z-10 w-full bg-white flex items-center justify-center p-2">
             <AsyncImage 
                src={img} 
                className="w-full h-auto max-h-[85vh] object-contain transition-transform duration-700 group-hover:scale-[1.005]" 
             />
           </div>

           {/* 底部信息条：更加细腻的元数据展示 */}
           <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-[12px] font-black text-slate-400 border border-slate-100">
                    {i + 1}
                 </div>
                 <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">Visual Deliverable</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                 <span className="text-[10px] font-bold text-slate-400 tracking-wider">HD 2K ASSET</span>
              </div>
           </div>
        </div>
      ))}
    </div>
  );
}
