/**
 * Gets the base URL for qweb API requests
 * Points directly to qweb backend (default port 3000)
 */
export function getApiBaseUrl(): string {
  // Use environment variable or default to localhost:3000
  const qwebHost = import.meta.env.VITE_QWEB_HOST || 'localhost:3000';
  const protocol = window.location.protocol;
  return `${protocol}//${qwebHost}/api`;
}

/**
 * Gets the WebSocket URL for qweb
 * Points directly to qweb backend (default port 3000)
 */
export function getWebSocketUrl(): string {
  // Use environment variable or default to localhost:3000
  const qwebHost = import.meta.env.VITE_QWEB_HOST || 'localhost:3000';
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${qwebHost}/ws`;
}
