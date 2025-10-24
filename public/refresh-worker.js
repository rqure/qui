// Token Refresh Web Worker
// Runs in a separate thread to avoid browser throttling when tab is inactive

let refreshInterval = null;
let intervalMs = 30000; // Default 30 seconds

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'start':
      if (data?.intervalMs) {
        intervalMs = data.intervalMs;
      }
      startRefreshInterval();
      break;
      
    case 'stop':
      stopRefreshInterval();
      break;
      
    case 'update-interval':
      if (data?.intervalMs) {
        intervalMs = data.intervalMs;
        // Restart with new interval
        stopRefreshInterval();
        startRefreshInterval();
      }
      break;
  }
};

function startRefreshInterval() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  refreshInterval = setInterval(() => {
    // Send message to main thread to trigger refresh
    self.postMessage({ type: 'refresh' });
  }, intervalMs);
  
  self.postMessage({ type: 'started', intervalMs });
}

function stopRefreshInterval() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    self.postMessage({ type: 'stopped' });
  }
}
