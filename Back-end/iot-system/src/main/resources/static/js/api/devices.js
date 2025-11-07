import { ENDPOINTS } from '../config.js';

export async function fetchDevices() {
  const res = await fetch(ENDPOINTS.devices);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function sendDeviceCommand(deviceId, action) {
  const res = await fetch(ENDPOINTS.deviceCommand, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, action })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return null;
  const raw = await res.text();
  if (!raw || raw.trim() === '') return null;
  try { return JSON.parse(raw); } catch { return null; }
}


