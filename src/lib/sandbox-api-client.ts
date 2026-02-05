/**
 * Generate the API client code that gets injected into the Sandpack sandbox.
 * This code uses postMessage to communicate with the parent frame.
 */
export function generateSandboxApiClient(): string {
  return `
// ===== Company API Bridge Client =====
// This code enables tools to communicate with company data sources

window.companyAPI = {
  // Query a database data source with SQL
  query: function(dataSourceId, sql, params, options) {
    options = options || {};
    return window.__bridgeCall('query', {
      dataSourceId: dataSourceId,
      sql: sql,
      params: params || [],
      timeout: options.timeout
    });
  },

  // List resources (tables, items, etc.) from a data source
  list: function(dataSourceId, options) {
    options = options || {};
    return window.__bridgeCall('list', {
      dataSourceId: dataSourceId,
      resource: options.resource,
      filters: options.filters,
      limit: options.limit,
      offset: options.offset
    });
  },

  // Create a new record in a data source
  create: function(dataSourceId, resource, data) {
    return window.__bridgeCall('create', {
      dataSourceId: dataSourceId,
      resource: resource,
      data: data
    });
  },

  // Update an existing record in a data source
  update: function(dataSourceId, resource, data, where) {
    return window.__bridgeCall('update', {
      dataSourceId: dataSourceId,
      resource: resource,
      data: data,
      where: where
    });
  },

  // Delete a record from a data source
  delete: function(dataSourceId, resource, where) {
    return window.__bridgeCall('delete', {
      dataSourceId: dataSourceId,
      resource: resource,
      where: where
    });
  },

  // Get list of available data sources for current user
  getSources: function() {
    return window.__bridgeCall('getSources', {});
  },

  // Legacy: Call a REST API endpoint (deprecated, use list/create/update/delete instead)
  call: function(dataSourceId, endpoint, data) {
    console.warn('[companyAPI] call() is deprecated. Use list(), create(), update(), or delete() instead.');
    if (data) {
      return window.__bridgeCall('create', {
        dataSourceId: dataSourceId,
        resource: endpoint,
        data: data
      });
    } else {
      return window.__bridgeCall('list', {
        dataSourceId: dataSourceId,
        resource: endpoint
      });
    }
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
      dataSourceId: payload.dataSourceId,
      sql: payload.sql,
      params: payload.params,
      resource: payload.resource,
      data: payload.data,
      where: payload.where,
      filters: payload.filters,
      limit: payload.limit,
      offset: payload.offset,
      timeout: payload.timeout
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
