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
