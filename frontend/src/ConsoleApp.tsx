import React, { useState, useEffect, useRef } from 'react';
import ConsoleSession, { GovernanceSettings } from './components/ConsoleSession';
import TabContextMenu from './components/ui/TabContextMenu';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Plus, X, LayoutGrid, Pin, VolumeX, Columns2 } from "lucide-react";

// Tab color options
export const TAB_COLORS = ['default', 'red', 'orange', 'amber', 'green', 'emerald', 'cyan', 'blue', 'purple', 'pink'] as const;
type TabColor = typeof TAB_COLORS[number];

const TAB_COLOR_CLASSES: Record<TabColor, { bg: string; border: string; text: string }> = {
  default: { bg: 'bg-slate-900', border: 'border-slate-800', text: 'text-white' },
  red: { bg: 'bg-red-950/50', border: 'border-red-800/50', text: 'text-red-300' },
  orange: { bg: 'bg-orange-950/50', border: 'border-orange-800/50', text: 'text-orange-300' },
  amber: { bg: 'bg-amber-950/50', border: 'border-amber-800/50', text: 'text-amber-300' },
  green: { bg: 'bg-green-950/50', border: 'border-green-800/50', text: 'text-green-300' },
  emerald: { bg: 'bg-emerald-950/50', border: 'border-emerald-800/50', text: 'text-emerald-300' },
  cyan: { bg: 'bg-cyan-950/50', border: 'border-cyan-800/50', text: 'text-cyan-300' },
  blue: { bg: 'bg-blue-950/50', border: 'border-blue-800/50', text: 'text-blue-300' },
  purple: { bg: 'bg-purple-950/50', border: 'border-purple-800/50', text: 'text-purple-300' },
  pink: { bg: 'bg-pink-950/50', border: 'border-pink-800/50', text: 'text-pink-300' },
};

interface Tab {
  id: string;
  title: string;
  customTitle?: string; // User-defined custom title
  key: number; // Used to force refresh
  isPinned: boolean;
  isMuted: boolean;
  color: TabColor;
  initialState?: {
    isStableMode: boolean;
    isPlaying: boolean;
  };
  governanceSettings?: GovernanceSettings;
}

// Session storage key
const SESSION_STORAGE_KEY = 'stable-console-tabs';

export default function ConsoleApp() {
  const [tabs, setTabs] = useState<Tab[]>(() => {
    // Try to load from localStorage on init
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved session:', e);
      }
    }
    return [{ id: '1', title: 'Baseline Console', key: 0, isPinned: false, isMuted: false, color: 'default' as TabColor }];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY + '-active');
    return saved || '1';
  });

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [compareTabIds, setCompareTabIds] = useState<[string, string] | null>(null);

  // Rename modal state
  const [renameModal, setRenameModal] = useState<{ tabId: string; currentName: string } | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    tabId: string;
  } | null>(null);

  // Drag state for reordering
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

  // Auto-focus rename input
  useEffect(() => {
    if (renameModal && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renameModal]);

  // Save session to localStorage whenever tabs change
  useEffect(() => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(tabs));
    localStorage.setItem(SESSION_STORAGE_KEY + '-active', activeTabId);
  }, [tabs, activeTabId]);

  const addTab = () => {
    const newId = crypto.randomUUID();
    setTabs(prev => [...prev, {
      id: newId,
      title: 'New Session',
      key: 0,
      isPinned: false,
      isMuted: false,
      color: 'default' as TabColor
    }]);
    setActiveTabId(newId);
  };

  const closeTab = (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (tab?.isPinned) return; // Can't close pinned tabs

    // Determine new active tab if closing the active one
    if (activeTabId === id && tabs.length > 1) {
      const index = tabs.findIndex(t => t.id === id);
      const newActiveId = tabs[index === 0 ? 1 : index - 1].id;
      setActiveTabId(newActiveId);
    }

    setTabs(prev => prev.filter(t => t.id !== id));

    // Create a new tab if closing the last one
    if (tabs.length === 1) {
      const newId = crypto.randomUUID();
      setTabs([{ id: newId, title: 'New Session', key: 0, isPinned: false, isMuted: false, color: 'default' as TabColor }]);
      setActiveTabId(newId);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      tabId
    });
  };

  const handleDuplicate = () => {
    if (!contextMenu) return;
    const tabToClone = tabs.find(t => t.id === contextMenu.tabId);
    if (tabToClone) {
      const newId = crypto.randomUUID();
      setTabs(prev => {
        const index = prev.findIndex(t => t.id === contextMenu.tabId);
        const newTabs = [...prev];
        newTabs.splice(index + 1, 0, {
          id: newId,
          title: tabToClone.customTitle || tabToClone.title,
          customTitle: tabToClone.customTitle,
          key: 0,
          isPinned: false,
          isMuted: tabToClone.isMuted,
          color: tabToClone.color
        });
        return newTabs;
      });
      setActiveTabId(newId);
    }
    setContextMenu(null);
  };

  const handleRefresh = () => {
    if (!contextMenu) return;
    setTabs(prev => prev.map(t =>
      t.id === contextMenu.tabId ? { ...t, key: t.key + 1 } : t
    ));
    setContextMenu(null);
  };

  const handleCloseOthers = () => {
    if (!contextMenu) return;
    // Keep pinned tabs and the target tab
    setTabs(prev => prev.filter(t => t.id === contextMenu.tabId || t.isPinned));
    setActiveTabId(contextMenu.tabId);
    setContextMenu(null);
  };

  // New features
  const handleRename = () => {
    if (!contextMenu) return;
    const tab = tabs.find(t => t.id === contextMenu.tabId);
    if (tab) {
      setRenameModal({ tabId: tab.id, currentName: tab.customTitle || tab.title });
    }
    setContextMenu(null);
  };

  const handleRenameSubmit = (newName: string) => {
    if (!renameModal) return;
    setTabs(prev => prev.map(t =>
      t.id === renameModal.tabId ? { ...t, customTitle: newName.trim() || undefined } : t
    ));
    setRenameModal(null);
  };

  const handlePin = () => {
    if (!contextMenu) return;
    setTabs(prev => {
      const updated = prev.map(t =>
        t.id === contextMenu.tabId ? { ...t, isPinned: !t.isPinned } : t
      );
      // Sort: pinned tabs first
      return updated.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    });
    setContextMenu(null);
  };

  const handleMute = () => {
    if (!contextMenu) return;
    setTabs(prev => prev.map(t =>
      t.id === contextMenu.tabId ? { ...t, isMuted: !t.isMuted } : t
    ));
    setContextMenu(null);
  };

  const handleMoveLeft = () => {
    if (!contextMenu) return;
    setTabs(prev => {
      const index = prev.findIndex(t => t.id === contextMenu.tabId);
      if (index <= 0) return prev;
      // Don't move past pinned tabs if unpinned
      const tab = prev[index];
      const prevTab = prev[index - 1];
      if (!tab.isPinned && prevTab.isPinned) return prev;

      const newTabs = [...prev];
      [newTabs[index - 1], newTabs[index]] = [newTabs[index], newTabs[index - 1]];
      return newTabs;
    });
    setContextMenu(null);
  };

  const handleMoveRight = () => {
    if (!contextMenu) return;
    setTabs(prev => {
      const index = prev.findIndex(t => t.id === contextMenu.tabId);
      if (index >= prev.length - 1) return prev;
      // Don't move pinned tab past unpinned
      const tab = prev[index];
      const nextTab = prev[index + 1];
      if (tab.isPinned && !nextTab.isPinned) return prev;

      const newTabs = [...prev];
      [newTabs[index], newTabs[index + 1]] = [newTabs[index + 1], newTabs[index]];
      return newTabs;
    });
    setContextMenu(null);
  };

  const handleCloneToWindow = () => {
    if (!contextMenu) return;
    const tab = tabs.find(t => t.id === contextMenu.tabId);
    if (tab) {
      // In a real app, this would use window.open()
      // For now, show a toast/notification
      alert(`Tab "${tab.customTitle || tab.title}" would open in a new window.\n\n(This feature requires multi-window support)`);
    }
    setContextMenu(null);
  };



  const handleSaveSession = () => {
    const sessionData = JSON.stringify(tabs, null, 2);
    const blob = new Blob([sessionData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stable-session-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setContextMenu(null);
  };

  const handleLoadSession = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const loaded = JSON.parse(e.target?.result as string);
            if (Array.isArray(loaded) && loaded.length > 0) {
              setTabs(loaded);
              setActiveTabId(loaded[0].id);
            }
          } catch {
            alert('Failed to load session file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
    setContextMenu(null);
  };

  const handleCompareMode = () => {
    if (!contextMenu) return;
    if (tabs.length < 2) {
      alert('Need at least 2 tabs to compare');
      setContextMenu(null);
      return;
    }

    const otherTab = tabs.find(t => t.id !== contextMenu.tabId);
    if (otherTab) {
      setCompareTabIds([contextMenu.tabId, otherTab.id]);
      setCompareMode(true);
    }
    setContextMenu(null);
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setCompareTabIds(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.isPinned) {
      e.preventDefault();
      return;
    }
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    if (draggedTabId && tabId !== draggedTabId) {
      setDragOverTabId(tabId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTabId(null);
  };

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === targetTabId) return;

    const targetTab = tabs.find(t => t.id === targetTabId);
    if (targetTab?.isPinned) return; // Can't drop on pinned tabs

    setTabs(prev => {
      const draggedIndex = prev.findIndex(t => t.id === draggedTabId);
      const targetIndex = prev.findIndex(t => t.id === targetTabId);
      const newTabs = [...prev];
      const [draggedTab] = newTabs.splice(draggedIndex, 1);
      newTabs.splice(targetIndex, 0, draggedTab);
      return newTabs;
    });

    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const handleDragEnd = () => {
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  // Update tab title based on session
  const updateTabTitle = (id: string, newTitle: string) => {
    setTabs(prev => prev.map(t => t.id === id && !t.customTitle ? { ...t, title: newTitle } : t));
  };

  const getTab = (id: string) => tabs.find(t => t.id === id);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen w-screen bg-slate-950 text-white overflow-hidden font-sans">

        {/* Tab Bar */}
        <div className="h-10 bg-black/40 border-b border-slate-800 flex items-center px-2 gap-1 select-none">
          {tabs.map(tab => {
            const colorClasses = TAB_COLOR_CLASSES[tab.color];
            const isActive = activeTabId === tab.id;
            const isDragOver = dragOverTabId === tab.id;

            return (
              <div
                key={tab.id}
                onClick={() => !compareMode && setActiveTabId(tab.id)}
                onContextMenu={(e) => handleContextMenu(e, tab.id)}
                draggable={!tab.isPinned}
                onDragStart={(e) => handleDragStart(e, tab.id)}
                onDragOver={(e) => handleDragOver(e, tab.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, tab.id)}
                onDragEnd={handleDragEnd}
                className={`group relative flex items-center gap-2 px-3 py-1.5 min-w-[160px] max-w-[240px] rounded-t-lg transition-all cursor-pointer border-t border-x ${isActive
                  ? `${colorClasses.bg} ${colorClasses.border} ${colorClasses.text}`
                  : 'border-transparent hover:bg-slate-900/50 pb-1 text-slate-400 hover:text-slate-200'
                  } ${isDragOver ? 'ring-2 ring-blue-500' : ''} ${draggedTabId === tab.id ? 'opacity-50' : ''}`}
              >
                {/* Pin indicator */}
                {tab.isPinned && (
                  <Pin className="w-3 h-3 text-amber-400 -rotate-45" />
                )}

                {/* Mute indicator */}
                {tab.isMuted && (
                  <VolumeX className="w-3 h-3 text-red-400" />
                )}

                {!tab.isPinned && !tab.isMuted && (
                  <LayoutGrid className="w-3 h-3 opacity-50" />
                )}

                <span className="text-xs font-medium truncate flex-1">
                  {tab.customTitle || tab.title}
                </span>

                {/* Close button - hidden for pinned tabs */}
                {!tab.isPinned && (
                  <button
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                    className={`opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-slate-800 text-slate-500 hover:text-white transition-all ${isActive ? 'opacity-100' : ''}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}

                {isActive && (
                  <div className="absolute -bottom-[1px] left-0 right-0 h-[1px] bg-slate-900 z-10" />
                )}
              </div>
            );
          })}

          <button
            onClick={addTab}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-1"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Compare Mode Toggle */}
          {compareMode && (
            <button
              onClick={exitCompareMode}
              className="ml-auto px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-2"
            >
              <Columns2 className="w-3 h-3" />
              Exit Compare
            </button>
          )}
        </div>

        {/* Console Sessions */}
        <div className="flex-1 relative">
          {compareMode && compareTabIds ? (
            // Compare Mode: Side by side
            <div className="flex h-full">
              <div className="flex-1 border-r border-slate-700">
                {getTab(compareTabIds[0]) && (
                  <ConsoleSession
                    key={`${compareTabIds[0]}-compare`}
                    id={compareTabIds[0]}
                    isActive={true}
                    isMuted={getTab(compareTabIds[0])?.isMuted}
                    initialGovernanceSettings={getTab(compareTabIds[0])?.governanceSettings}
                    onTitleChange={(title) => updateTabTitle(compareTabIds[0], title)}
                  />
                )}
              </div>
              <div className="flex-1">
                {getTab(compareTabIds[1]) && (
                  <ConsoleSession
                    key={`${compareTabIds[1]}-compare`}
                    id={compareTabIds[1]}
                    isActive={true}
                    isMuted={getTab(compareTabIds[1])?.isMuted}
                    initialGovernanceSettings={getTab(compareTabIds[1])?.governanceSettings}
                    onTitleChange={(title) => updateTabTitle(compareTabIds[1], title)}
                  />
                )}
              </div>
            </div>
          ) : (
            // Normal Mode
            tabs.map(tab => (
              <ConsoleSession
                key={`${tab.id}-${tab.key}`}
                id={tab.id}
                isActive={activeTabId === tab.id}
                isMuted={tab.isMuted}
                initialGovernanceSettings={tab.governanceSettings}
                onTitleChange={(title) => updateTabTitle(tab.id, title)}
              />
            ))
          )}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <TabContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            tabId={contextMenu.tabId}
            tab={tabs.find(t => t.id === contextMenu.tabId)}
            onClose={() => setContextMenu(null)}
            onDuplicate={handleDuplicate}
            onRefresh={handleRefresh}
            onCloseTab={() => {
              closeTab(contextMenu.tabId);
              setContextMenu(null);
            }}
            onCloseOthers={handleCloseOthers}
            onRename={handleRename}
            onPin={handlePin}
            onMute={handleMute}
            onMoveLeft={handleMoveLeft}
            onMoveRight={handleMoveRight}
            onCloneToWindow={handleCloneToWindow}
            onSaveSession={handleSaveSession}
            onLoadSession={handleLoadSession}
            onCompare={handleCompareMode}
          />
        )}

        {/* Rename Modal */}
        {renameModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRenameModal(null)}>
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 w-80 shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-medium mb-3">Rename Tab</h3>
              <input
                ref={renameInputRef}
                type="text"
                defaultValue={renameModal.currentName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit((e.target as HTMLInputElement).value);
                  if (e.key === 'Escape') setRenameModal(null);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new name..."
              />
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setRenameModal(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">
                  Cancel
                </button>
                <button
                  onClick={() => handleRenameSubmit(renameInputRef.current?.value || '')}
                  className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </TooltipProvider>
  );
}
