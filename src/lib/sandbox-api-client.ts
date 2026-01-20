/**
 * Generate the API client code that gets injected into the Sandpack sandbox.
 * This code uses postMessage to communicate with the parent frame.
 */
export function generateSandboxApiClient(): string {
  return `
// ===== Company API Bridge Client =====
// This code enables tools to communicate with company data sources

window.companyAPI = {
  // Query a database data source
  query: function(source, sql, params) {
    params = params || [];
    return window.__bridgeCall('query', { source: source, sql: sql, params: params });
  },

  // Call a REST API endpoint
  call: function(source, endpoint, data) {
    data = data || {};
    return window.__bridgeCall('call', { source: source, endpoint: endpoint, data: data });
  },

  // Get list of available data sources for current user
  getSources: function() {
    return window.__bridgeCall('getSources', {});
  }
};

// Internal bridge call implementation
window.__bridgeCall = function(operation, payload) {
  return new Promise(function(resolve, reject) {
    var id = 'bridge_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    var timeout = setTimeout(function() {
      window.removeEventListener('message', handler);
      reject(new Error('API call timeout (30s)'));
    }, 30000);

    function handler(e) {
      if (e.data && e.data.type === 'api-bridge-response' && e.data.id === id) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.result);
        }
      }
    }

    window.addEventListener('message', handler);

    parent.postMessage({
      type: 'api-bridge',
      id: id,
      operation: operation,
      source: payload.source,
      sql: payload.sql,
      params: payload.params,
      endpoint: payload.endpoint,
      data: payload.data
    }, '*');
  });
};

// Log that API is ready
console.log('[Falcon] Company API Bridge ready');
`;
}

/**
 * Get the full app code with API client injected
 */
export function injectApiClient(userCode: string): string {
  const apiClient = generateSandboxApiClient();
  return `
${apiClient}

import React from 'react';
import { createRoot } from 'react-dom/client';

${userCode}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}
