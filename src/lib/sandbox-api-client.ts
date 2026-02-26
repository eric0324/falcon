/**
 * Generate the API client code that gets injected into the sandbox iframe.
 * Uses postMessage to communicate with the parent frame via the bridge.
 */
export function generateSandboxApiClient(): string {
  return `
// ===== Company API Bridge Client =====

window.companyAPI = {
  // Generic execute: call any data source action
  // e.g. execute('notion', 'list', {}) or execute('extdb_abc', 'query', { sql: '...' })
  execute: function(dataSourceId, action, params) {
    return window.__bridgeCall({
      dataSourceId: dataSourceId,
      action: action,
      params: params || {}
    });
  },

  // Shortcut for SQL queries on extdb_* sources
  // query(dataSourceId, sql)
  // query(dataSourceId, sql, { limit: 100, offset: 0 })
  query: function(dataSourceId, sql, options) {
    var p = { sql: sql };
    if (options && typeof options === 'object') {
      if (typeof options.limit === 'number') p.limit = options.limit;
      if (typeof options.offset === 'number') p.offset = options.offset;
    }
    return window.__bridgeCall({
      dataSourceId: dataSourceId,
      action: 'query',
      params: p
    });
  },

  // Shortcut for listing resources
  list: function(dataSourceId, params) {
    return window.__bridgeCall({
      dataSourceId: dataSourceId,
      action: 'list',
      params: params || {}
    });
  },

  // Shortcut for reading a single resource
  read: function(dataSourceId, params) {
    return window.__bridgeCall({
      dataSourceId: dataSourceId,
      action: 'read',
      params: params || {}
    });
  },

  // Shortcut for searching
  search: function(dataSourceId, params) {
    return window.__bridgeCall({
      dataSourceId: dataSourceId,
      action: 'search',
      params: params || {}
    });
  }
};

// Internal bridge call implementation
window.__bridgeCall = function(payload) {
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
      dataSourceId: payload.dataSourceId,
      action: payload.action,
      params: payload.params
    }, '*');
  });
};

console.log('[Falcon] Company API Bridge ready');
`;
}
