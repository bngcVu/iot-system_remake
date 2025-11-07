// STOMP + SockJS client wrapper for sensors/devices
import { WS, INTERVALS } from '../config.js';

export function connectStomp({ onSensors, onDevices, onConnected, onDisconnected } = {}) {
  const sock = new SockJS(WS.endpoint);
  const client = Stomp.over(sock);
  client.debug = () => {};
  client.connect({}, () => {
    onConnected && onConnected();
    if (onSensors) client.subscribe(WS.topicSensors, (frame) => {
      try { onSensors(JSON.parse(frame.body)); } catch {}
    });
    if (onDevices) client.subscribe(WS.topicDevices, (frame) => {
      try { onDevices(JSON.parse(frame.body)); } catch {}
    });
  }, () => {
    onDisconnected && onDisconnected();
    setTimeout(() => connectStomp({ onSensors, onDevices, onConnected, onDisconnected }), INTERVALS.wsReconnectDelay);
  });
  return client;
}


