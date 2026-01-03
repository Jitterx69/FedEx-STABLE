import { useState } from 'react';
import { Trash2, Plus, Edit2, Check, X, AlertTriangle, Flag, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Annotation } from '@/stores/annotationTypes';

interface Props {
  annotations: Annotation[];
  onAdd: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
  onDelete: (id: string) => void;
  currentTime?: number;
  isOpen: boolean;
  onClose: () => void;
}

const ANNOTATION_TYPES = [
  { value: 'note', label: 'Note', icon: MessageSquare, color: '#3b82f6' },
  { value: 'event', label: 'Event', icon: Flag, color: '#10b981' },
  { value: 'alert', label: 'Alert', icon: AlertTriangle, color: '#ef4444' },
] as const;

const AnnotationPanel = ({
  annotations,
  onAdd,
  onUpdate,
  onDelete,
  currentTime = 0,
  isOpen,
  onClose
}: Props) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAnnotation, setNewAnnotation] = useState({
    timePoint: currentTime,
    label: '',
    description: '',
    type: 'note' as const,
  });

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newAnnotation.label.trim()) return;
    onAdd(newAnnotation);
    setNewAnnotation({ timePoint: currentTime, label: '', description: '', type: 'note' });
    setIsAdding(false);
  };

  const getTypeIcon = (type: string) => {
    const t = ANNOTATION_TYPES.find(at => at.value === type);
    if (!t) return MessageSquare;
    return t.icon;
  };

  const getTypeColor = (type: string) => {
    const t = ANNOTATION_TYPES.find(at => at.value === type);
    return t?.color || '#3b82f6';
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 z-50 bg-slate-900 border-l border-slate-700 shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-white">Annotations</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Add button */}
      <div className="p-3 border-b border-slate-800">
        {!isAdding ? (
          <Button
            onClick={() => setIsAdding(true)}
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            Add Annotation
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Time Point</label>
                <input
                  type="number"
                  value={newAnnotation.timePoint}
                  onChange={(e) => setNewAnnotation({ ...newAnnotation, timePoint: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Type</label>
                <select
                  value={newAnnotation.type}
                  onChange={(e) => setNewAnnotation({ ...newAnnotation, type: e.target.value as typeof newAnnotation.type })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                >
                  {ANNOTATION_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Label</label>
              <input
                type="text"
                value={newAnnotation.label}
                onChange={(e) => setNewAnnotation({ ...newAnnotation, label: e.target.value })}
                placeholder="Enter annotation label..."
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Description (optional)</label>
              <textarea
                value={newAnnotation.description}
                onChange={(e) => setNewAnnotation({ ...newAnnotation, description: e.target.value })}
                placeholder="Optional description..."
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white resize-none"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAdd}
                className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700"
                size="sm"
                disabled={!newAnnotation.label.trim()}
              >
                <Check className="w-3 h-3" />
                Save
              </Button>
              <Button
                onClick={() => {
                  setIsAdding(false);
                  setNewAnnotation({ timePoint: currentTime, label: '', description: '', type: 'note' });
                }}
                variant="outline"
                className="flex-1 gap-1"
                size="sm"
              >
                <X className="w-3 h-3" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Annotations list */}
      <div className="flex-1 overflow-y-auto">
        {annotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-xs">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
            <p>No annotations yet</p>
            <p className="text-[10px]">Click "Add Annotation" to create one</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {annotations
              .sort((a, b) => a.timePoint - b.timePoint)
              .map(annotation => {
                const Icon = getTypeIcon(annotation.type);
                const color = getTypeColor(annotation.type);
                const isEditing = editingId === annotation.id;

                return (
                  <div
                    key={annotation.id}
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="p-1.5 rounded"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          {isEditing ? (
                            <input
                              type="text"
                              defaultValue={annotation.label}
                              onBlur={(e) => {
                                onUpdate(annotation.id, { label: e.target.value });
                                setEditingId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  onUpdate(annotation.id, { label: (e.target as HTMLInputElement).value });
                                  setEditingId(null);
                                }
                                if (e.key === 'Escape') {
                                  setEditingId(null);
                                }
                              }}
                              className="bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-xs text-white w-full"
                              autoFocus
                            />
                          ) : (
                            <span className="text-xs font-medium text-white truncate">
                              {annotation.label}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 ml-2 shrink-0">
                            T{annotation.timePoint}
                          </span>
                        </div>
                        {annotation.description && (
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                            {annotation.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                        onClick={() => setEditingId(annotation.id)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                        onClick={() => onDelete(annotation.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <span className="flex-1" />
                      <span className="text-[9px] text-slate-500">
                        {new Date(annotation.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
        <span>{annotations.length} annotation{annotations.length !== 1 ? 's' : ''}</span>
        {annotations.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('Delete all annotations?')) {
                annotations.forEach(a => onDelete(a.id));
              }
            }}
            className="text-red-400 hover:text-red-300"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
};

export default AnnotationPanel;
