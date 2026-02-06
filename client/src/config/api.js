// API Configuration
// Use the environment variable, but fallback to relative path /api if not set (for same-domain deployment)
// or use a default production URL if needed.
const getBaseUrl = () => {
  let url = process.env.REACT_APP_API_URL || 'https://psychological-natala-srmuniversityap-216270a4.koyeb.app';
  // Remove trailing slash if present
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const API_BASE_URL = getBaseUrl();

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

export default API_CONFIG;
