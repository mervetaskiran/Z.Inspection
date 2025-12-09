/// <reference types="vite/client" />

const DEFAULT_API_URL = 'http://127.0.0.1:5000';

// Merkezi API URL tanımı. Frontend'i farklı bir host/porttan çalıştırırken
// .env içine VITE_API_URL=yeni_adres yazarak güncelleyebilirsiniz.
export const API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

export const api = (path: string) => `${API_BASE_URL}${path}`;

