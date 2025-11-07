// App-wide configuration constants
// Centralize URLs, endpoints, topics, and intervals for easy maintenance

export const API_BASE = 'http://localhost:8081';

// REST endpoints
export const ENDPOINTS = {
  devices: `${API_BASE}/api/devices`,
  deviceCommand: `${API_BASE}/api/devices/command`,
  sensors: `${API_BASE}/api/sensor-data`,
  actionsSearch: `${API_BASE}/api/device-actions/search`
};

// WebSocket (STOMP + SockJS)
export const WS = {
  endpoint: `${API_BASE}/ws`,
  topicSensors: '/topic/sensors',
  topicDevices: '/topic/devices'
};

// Polling / realtime intervals (ms)
export const INTERVALS = {
  historyPollWhenWsDown: 6000,
  historySilentRefreshOnWsQuiet: 2000,
  wsReconnectDelay: 4000
};


