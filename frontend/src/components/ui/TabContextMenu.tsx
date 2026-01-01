import React, { useEffect, useRef } from 'react';
import { Copy, RotateCw, X } from 'lucide-react';

interface TabContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDuplicate: () => void;
  onRefresh: () => void;
  onCloseTab: () => void;
  onCloseOthers: () => void;
}

export default function TabContextMenu({ x, y, onClose, onDuplicate, onRefresh, onCloseTab, onCloseOthers }: TabContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-48 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      <button onClick={onDuplicate} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
        <Copy className="w-4 h-4" /> Duplicate
      </button>
      <button onClick={onRefresh} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
        <RotateCw className="w-4 h-4" /> Refresh
      </button>
      <div className="h-px bg-slate-800 my-1" />
      <button onClick={onCloseTab} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-800 hover:text-red-300 flex items-center gap-2">
        <X className="w-4 h-4" /> Close
      </button>
       <button onClick={onCloseOthers} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
        Close Others
      </button>
    </div>
  );
}
