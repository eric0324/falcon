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
    var timeoutMs = (payload.dataSourceId === 'llm' || payload.dataSourceId === 'scrape') ? 60000 : 30000;
    var timeout = setTimeout(function() {
      window.removeEventListener('message', handler);
      reject(new Error('API call timeout (' + (timeoutMs / 1000) + 's)'));
    }, timeoutMs);

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

// ===== Tool Database SDK =====

// Retry wrapper for tooldb — draft tool may not be ready yet when iframe loads
window.__tooldbCall = function(payload) {
  var maxRetries = 5;
  var delay = 800;
  function attempt(n) {
    return window.__bridgeCall(payload).catch(function(err) {
      if (n < maxRetries && err.message && err.message.indexOf('toolId') !== -1) {
        return new Promise(function(resolve) {
          setTimeout(function() { resolve(attempt(n + 1)); }, delay);
        });
      }
      throw err;
    });
  }
  return attempt(0);
};

window.tooldb = {
  createTable: function(name, columns) {
    return window.__tooldbCall({ dataSourceId: 'tooldb', action: 'createTable', params: { name: name, columns: columns } });
  },
  updateSchema: function(tableId, columns) {
    return window.__tooldbCall({ dataSourceId: 'tooldb', action: 'updateSchema', params: { tableId: tableId, columns: columns } });
  },
  deleteTable: function(tableId) {
    return window.__tooldbCall({ dataSourceId: 'tooldb', action: 'deleteTable', params: { tableId: tableId } });
  },
  listTables: function() {
    return window.__tooldbCall({ dataSourceId: 'tooldb', action: 'listTables', params: {} });
  },
  insert: function(tableId, data) {
    return window.__tooldbCall({ dataSourceId: 'tooldb', action: 'insert', params: { tableId: tableId, data: data } });
  },
  list: function(tableId, options) {
    var params = { tableId: tableId };
    if (options) {
      if (options.filter) params.filter = options.filter;
      if (options.sort) params.sort = options.sort;
      if (typeof options.limit === 'number') params.limit = options.limit;
      if (typeof options.offset === 'number') params.offset = options.offset;
    }
    return window.__tooldbCall({ dataSourceId: 'tooldb', action: 'list', params: params });
  },
  get: function(tableId, rowId) {
    return window.__tooldbCall({ dataSourceId: 'tooldb', action: 'get', params: { tableId: tableId, rowId: rowId } });
  },
  update: function(tableId, rowId, data) {
    return window.__tooldbCall({ dataSourceId: 'tooldb', action: 'update', params: { tableId: tableId, rowId: rowId, data: data } });
  },
  delete: function(tableId, rowId) {
    return window.__tooldbCall({ dataSourceId: 'tooldb', action: 'delete', params: { tableId: tableId, rowId: rowId } });
  }
};

console.log('[Falcon] Company API Bridge ready');
`;
}
