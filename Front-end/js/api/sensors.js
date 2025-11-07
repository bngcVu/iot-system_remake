// Sensor data API layer
// Provide typed-like helpers to fetch sensor history/search

import { ENDPOINTS } from '../config.js';

export async function fetchSensorsPage({ page = 0, size = 15, sort = 'desc', metric = 'ALL', date = '', valueOp = '', value = '' } = {}) {
  // Backend expects all queries on /api/sensor-data with params:
  // - dateStr (optional)
  // - metric (ALL|TEMP|HUMIDITY|LIGHT)
  // - valueOp (optional, triggers value search when present; supports 'eq')
  // - value (optional Double)
  const params = new URLSearchParams({ page, size, sort });
  if (metric) params.append('metric', metric);
  // Map FE 'date' to BE 'dateStr'
  if (date) params.append('dateStr', date);
  if (valueOp) params.append('valueOp', valueOp);
  if (value !== '' && value !== null && value !== undefined) params.append('value', value);
  params.append('_', Date.now());
  // Always call the root endpoint; backend routes internally based on presence of valueOp/dateStr
  const res = await fetch(`${ENDPOINTS.sensors}?${params.toString()}`);
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    if (json && json.code === 'INVALID_DATE_FORMAT') {
      return json;
    }
    throw new Error(`HTTP ${res.status}`);
  }
  return json;
}


