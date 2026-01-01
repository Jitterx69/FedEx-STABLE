/**
 * Annotation Store using React Context
 * Provides state management for chart annotations
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Annotation {
  id: string;
  timePoint: number;
  label: string;
  description?: string;
  type: 'note' | 'event' | 'alert';
  color?: string;
  createdAt: number;
}

export interface ThresholdAlert {
  id: string;
  metric: 'active' | 'recovered' | 'escalated';
  operator: '>' | '<' | '>=' | '<=' | '==';
  value: number;
  enabled: boolean;
  color?: string;
  label: string;
}

interface AnnotationContextType {
  annotations: Annotation[];
  thresholdAlerts: ThresholdAlert[];
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  addThresholdAlert: (alert: Omit<ThresholdAlert, 'id'>) => void;
  updateThresholdAlert: (id: string, updates: Partial<ThresholdAlert>) => void;
  deleteThresholdAlert: (id: string) => void;
  toggleThresholdAlert: (id: string) => void;
  clearAllAnnotations: () => void;
}

const AnnotationContext = createContext<AnnotationContextType | null>(null);

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Provider component
export const AnnotationProvider = ({ children }: { children: ReactNode }) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [thresholdAlerts, setThresholdAlerts] = useState<ThresholdAlert[]>([
    // Default thresholds
    { id: 'default-high', metric: 'escalated', operator: '>', value: 10, enabled: false, color: '#ef4444', label: 'High Escalation' },
  ]);

  const addAnnotation = useCallback((annotation: Omit<Annotation, 'id' | 'createdAt'>) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: generateId(),
      createdAt: Date.now(),
    };
    setAnnotations(prev => [...prev, newAnnotation]);
  }, []);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }, []);

  const addThresholdAlert = useCallback((alert: Omit<ThresholdAlert, 'id'>) => {
    const newAlert: ThresholdAlert = {
      ...alert,
      id: generateId(),
    };
    setThresholdAlerts(prev => [...prev, newAlert]);
  }, []);

  const updateThresholdAlert = useCallback((id: string, updates: Partial<ThresholdAlert>) => {
    setThresholdAlerts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const deleteThresholdAlert = useCallback((id: string) => {
    setThresholdAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const toggleThresholdAlert = useCallback((id: string) => {
    setThresholdAlerts(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  }, []);

  const clearAllAnnotations = useCallback(() => {
    setAnnotations([]);
  }, []);

  return (
    <AnnotationContext.Provider value={{
      annotations,
      thresholdAlerts,
      addAnnotation,
      updateAnnotation,
      deleteAnnotation,
      addThresholdAlert,
      updateThresholdAlert,
      deleteThresholdAlert,
      toggleThresholdAlert,
      clearAllAnnotations,
    }}>
      {children}
    </AnnotationContext.Provider>
  );
};

// Hook to use annotation context
export const useAnnotations = () => {
  const context = useContext(AnnotationContext);
  if (!context) {
    throw new Error('useAnnotations must be used within an AnnotationProvider');
  }
  return context;
};

// Standalone helper hook for checking threshold violations
export const useThresholdViolations = (
  data: { active: number; recovered: number; escalated: number }[],
  alerts: ThresholdAlert[]
) => {
  return data.map((point, index) => {
    const violations = alerts
      .filter(alert => alert.enabled)
      .filter(alert => {
        const value = point[alert.metric];
        switch (alert.operator) {
          case '>': return value > alert.value;
          case '<': return value < alert.value;
          case '>=': return value >= alert.value;
          case '<=': return value <= alert.value;
          case '==': return value === alert.value;
          default: return false;
        }
      });
    return { index, violations };
  }).filter(v => v.violations.length > 0);
};

export default AnnotationProvider;
