import { useEffect, useRef } from 'react';
import {
  Copy, RotateCw, X, Edit3, Pin, PinOff,
  VolumeX, Volume2, ChevronLeft, ChevronRight,
  ExternalLink, Save, Upload, Columns2
} from 'lucide-react';

type TabColor = 'default' | 'red' | 'orange' | 'amber' | 'green' | 'emerald' | 'cyan' | 'blue' | 'purple' | 'pink';

interface Tab {
  id: string;
  title: string;
  customTitle?: string;
  isPinned: boolean;
  isMuted: boolean;
  color: TabColor;
}

interface TabContextMenuProps {
  x: number;
  y: number;
  tabId: string;
  tab?: Tab;
  onClose: () => void;
  onDuplicate: () => void;
  onRefresh: () => void;
  onCloseTab: () => void;
  onCloseOthers: () => void;
  onRename: () => void;
  onPin: () => void;
  onMute: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onCloneToWindow: () => void;
  onSaveSession: () => void;
  onLoadSession: () => void;
  onCompare: () => void;
}

export default function TabContextMenu({
  x, y, tab, onClose,
  onDuplicate, onRefresh, onCloseTab, onCloseOthers,
  onRename, onPin, onMute, onMoveLeft, onMoveRight,
  onCloneToWindow, onSaveSession, onLoadSession, onCompare
}: TabContextMenuProps) {
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

  // Adjust position if menu would go off-screen
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 500);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-52 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {/* Basic Actions */}
      <button onClick={onRename} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
        <Edit3 className="w-4 h-4" /> Rename
      </button>
      <button onClick={onDuplicate} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
        <Copy className="w-4 h-4" /> Duplicate
      </button>
      <button onClick={onRefresh} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
        <RotateCw className="w-4 h-4" /> Refresh
      </button>

      <div className="h-px bg-slate-800 my-1" />

      {/* Pin & Mute */}
      <button onClick={onPin} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
        {tab?.isPinned ? (
          <>
            <PinOff className="w-4 h-4" /> Unpin Tab
          </>
        ) : (
          <>
            <Pin className="w-4 h-4" /> Pin Tab
          </>
        )}
      </button>
      <button onClick={onMute} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
        {tab?.isMuted ? (
          <>
            <Volume2 className="w-4 h-4" /> Unmute Tab
          </>
        ) : (
          <>
            <VolumeX className="w-4 h-4" /> Mute Tab
          </>
        )}
      </button>

      <div className="h-px bg-slate-800 my-1" />

      {/* Move & Order */}
      <button onClick={onMoveLeft} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
        <ChevronLeft className="w-4 h-4" /> Move Left
      </button>
      <button onClick={onMoveRight} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
        <ChevronRight className="w-4 h-4" /> Move Right
      </button>

      <div className="h-px bg-slate-800 my-1" />

      {/* Advanced */}
      <button onClick={onCloneToWindow} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
        <ExternalLink className="w-4 h-4" /> Clone to Window
      </button>
      <button onClick={onCompare} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
        <Columns2 className="w-4 h-4" /> Compare Mode
      </button>

      <div className="h-px bg-slate-800 my-1" />

      {/* Session Management */}
      <button onClick={onSaveSession} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
        <Save className="w-4 h-4" /> Save Session
      </button>
      <button onClick={onLoadSession} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
        <Upload className="w-4 h-4" /> Load Session
      </button>

      <div className="h-px bg-slate-800 my-1" />

      {/* Close Actions */}
      <button
        onClick={onCloseTab}
        disabled={tab?.isPinned}
        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${tab?.isPinned
          ? 'text-slate-600 cursor-not-allowed'
          : 'text-red-400 hover:bg-slate-800 hover:text-red-300'
          }`}
      >
        <X className="w-4 h-4" /> Close
        {tab?.isPinned && <span className="text-xs text-slate-600 ml-auto">(Pinned)</span>}
      </button>
      <button onClick={onCloseOthers} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
        Close Others
      </button>
    </div>
  );
}
