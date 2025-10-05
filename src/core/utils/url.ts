/**
 * Gets the base URL for qweb API requests
 */
export function getApiBaseUrl(): string {  
  return `${window.location.origin}/api`;
}

/**
 * Gets the WebSocket URL for qweb
 */
export function getWebSocketUrl(): string {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}/ws`;
}
