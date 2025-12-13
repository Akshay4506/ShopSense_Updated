export const API_URL = 'http://172.23.160.1:3000/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const apiClient = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  },

  post: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    // Handle specific auth error
    if (response.status === 401 || response.status === 403) {
      if (!endpoint.includes('/auth/login')) {
        // handle logout logic if needed
      }
    }
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || result.message || 'API Error');
    }
    return result;
  },

  put: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'API Error');
    }
    return result;
  },

  delete: async (endpoint: string) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error('API Error');
    }
    return response.json();
  },
};
