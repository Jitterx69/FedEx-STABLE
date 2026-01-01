import React, { useState, useEffect } from 'react';
import ConsoleSession from './components/ConsoleSession';
import TabContextMenu from './components/ui/TabContextMenu';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Plus, X, LayoutGrid } from "lucide-react";

interface Tab {
  id: string;
  title: string;
  key: number; // Used to force refresh
  initialState?: {
    isStableMode: boolean;
    isPlaying: boolean;
  };
}

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([{ id: '1', title: 'Baseline Console', key: 0 }]);
  const [activeTabId, setActiveTabId] = useState<string>('1');
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    tabId: string;
  } | null>(null);

  const addTab = () => {
    const newId = crypto.randomUUID();
    setTabs(prev => [...prev, { id: newId, title: 'New Session', key: 0 }]);
    setActiveTabId(newId);
  };

  const closeTab = (id: string) => {
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
       setTabs([{ id: newId, title: 'New Session', key: 0 }]);
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
      // Note: Deep cloning initial state is tricky without access to internal component state.
      // Ideally ConsoleSession would lift state up, but for now we clone the structure.
      // Since specific UI state is internal to ConsoleSession, we duplicate as a fresh session 
      // but we *could* improve this by lifting more state. 
      // For "multitasking" usually fresh state is desired or persistent storage.
      // We will init a fresh session for now as lifting *all* state is a larger refactor.
      setTabs(prev => {
        const index = prev.findIndex(t => t.id === contextMenu.tabId);
        const newTabs = [...prev];
        newTabs.splice(index + 1, 0, { id: newId, title: tabToClone.title, key: 0 });
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
      setTabs(prev => prev.filter(t => t.id === contextMenu.tabId));
      setActiveTabId(contextMenu.tabId);
      setContextMenu(null);
  }

  // Update tab title based on session
  const updateTabTitle = (id: string, newTitle: string) => {
     setTabs(prev => prev.map(t => t.id === id ? { ...t, title: newTitle } : t));
  };


  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen w-screen bg-slate-950 text-white overflow-hidden font-sans">
        
        {/* Tab Bar */}
        <div className="h-10 bg-black/40 border-b border-slate-800 flex items-center px-2 gap-1 select-none">
           {tabs.map(tab => (
             <div 
               key={tab.id}
               onClick={() => setActiveTabId(tab.id)}
               onContextMenu={(e) => handleContextMenu(e, tab.id)}
               className={`group relative flex items-center gap-2 px-3 py-1.5 min-w-[160px] max-w-[240px] rounded-t-lg transition-all cursor-pointer border-t border-x border-transparent ${
                 activeTabId === tab.id 
                 ? 'bg-slate-900 border-slate-800 text-white' 
                 : 'hover:bg-slate-900/50 pb-1 text-slate-400 hover:text-slate-200'
               }`}
             >
                <LayoutGrid className="w-3 h-3 opacity-50" />
                <span className="text-xs font-medium truncate flex-1">{tab.title}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className={`opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-slate-800 text-slate-500 hover:text-white transition-all ${activeTabId === tab.id ? 'opacity-100' : ''}`}
                >
                  <X className="w-3 h-3" />
                </button>
                
                {activeTabId === tab.id && (
                  <div className="absolute -bottom-[1px] left-0 right-0 h-[1px] bg-slate-900 z-10" />
                )}
             </div>
           ))}
           
           <button 
              onClick={addTab}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-1"
           >
              <Plus className="w-4 h-4" />
           </button>
        </div>

        {/* Console Sessions */}
        <div className="flex-1 relative">
           {tabs.map(tab => (
              <ConsoleSession 
                key={`${tab.id}-${tab.key}`} // Key change triggers refresh
                id={tab.id}
                isActive={activeTabId === tab.id}
                onTitleChange={(title) => updateTabTitle(tab.id, title)}
              />
           ))}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <TabContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onDuplicate={handleDuplicate}
            onRefresh={handleRefresh}
            onCloseTab={() => {
              closeTab(contextMenu.tabId);
              setContextMenu(null);
            }}
            onCloseOthers={handleCloseOthers}
          />
        )}

      </div>
    </TooltipProvider>
  );
}
