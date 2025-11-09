// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://sevalink-ttbd.onrender.com';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

export default API_CONFIG;
