import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

export const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface GovernanceControls {
    information_sharpness: number;
    noise_injection: number;
}

export interface Account {
    account_id: string;
    outstanding_balance: number;
    status: string;
    days_past_due: number;
}

export const updateGovernance = async (data: GovernanceControls) => {
    return api.post('/governance/controls', data);
};

export const fetchAccounts = async (): Promise<Account[]> => {
    const response = await api.get('/accounts');
    return response.data;
};

export const ingestMockAccount = async () => {
    // Helper for demo purposes to inject data easily from UI
    const id = Math.random().toString(36).substring(7);
    return api.post('/ingest/account', {
        account_id: `ACC-${id.toUpperCase()}`,
        balance: Math.floor(Math.random() * 10000),
        days_past_due: Math.floor(Math.random() * 180),
    });
};

export interface SystemStats {
    total: number;
    active: number;
    recovered: number;
    escalated: number;
}

export const fetchSystemStats = async (): Promise<SystemStats> => {
    const response = await api.get('/stats');
    return response.data;
};
