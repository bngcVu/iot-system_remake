// Device actions (activity) API layer
import { ENDPOINTS } from '../config.js';

export async function fetchActionsPage({ page = 0, size = 15, sort = 'desc', dateStr = '', deviceType = '', action = '' } = {}) {
  const params = new URLSearchParams({ page, size, sort });
  if (dateStr) params.append('dateStr', dateStr);
  if (deviceType) params.append('deviceType', deviceType);
  if (action) params.append('action', action);
  const res = await fetch(`${ENDPOINTS.actionsSearch}?${params.toString()}`);
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    if (json && json.code === 'INVALID_DATE_FORMAT') {
      return json;
    }
    throw new Error(`HTTP ${res.status}`);
  }
  return json;
}


