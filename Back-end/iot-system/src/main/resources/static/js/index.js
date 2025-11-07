// Module hóa cấu hình và API/WS
import { ENDPOINTS, WS } from './config.js';
import { fetchDevices, sendDeviceCommand } from './api/devices.js';
import { fetchSensorsPage } from './api/sensors.js';
import { connectStomp } from './realtime/wsClient.js';

// -------- Trạng thái --------
let windowSize = 15;

let echart = null;
let pauseRealtime = false;
const lastFlashAt = { temp: 0, hum: 0, light: 0 };

// Settings state
const settings = {
  thresholds: {
    temp: 30,
    hum: 80,
    light: 800
  },
  refreshInterval: 0,
  unitTemp: 'C',
  theme: 'light'
};

function loadSettings() {
  try {
    const raw = localStorage.getItem('iot_settings');
    if (raw) {
      const incoming = JSON.parse(raw);
      Object.assign(settings, incoming);
      normalizeSettings();
    } else {
      normalizeSettings();
    }
    // Force theme to light to avoid dark mode sticking
    settings.theme = 'light';
    try { localStorage.setItem('iot_settings', JSON.stringify(settings)); } catch {}
  } catch {}
}
function saveSettings() {
  try {
    localStorage.setItem('iot_settings', JSON.stringify(settings));
  } catch (e) {
    console.warn('Save settings failed', e);
  }
}
function applyTheme() {
  document.documentElement.classList.remove('theme-dark');
}

function normalizeSettings() {
  const t = settings.thresholds || {};
  function toNum(val, def) {
    const n = Number((val && typeof val === 'object') ? val.soft : val);
    return isNaN(n) ? def : n;
  }
  settings.thresholds = {
    temp: toNum(t.temp, 30),
    hum: toNum(t.hum, 80),
    light: toNum(t.light, 800)
  };
}
function openSettings() {
  const modal = select('settings-modal');
  if (!modal) return;
  select('th-temp').value = settings.thresholds.temp;
  select('th-hum').value = settings.thresholds.hum;
  select('th-light').value = settings.thresholds.light;
  // removed controls
  modal.style.display = 'block'; modal.setAttribute('aria-hidden','false');
}
function closeSettings() {
  const modal = select('settings-modal');
  if (!modal) return;
  modal.style.display = 'none'; modal.setAttribute('aria-hidden','true');
}
let deviceIdByToggleIndex = [null, null, null];
// Pending command tracking: deviceId -> { correlationId, desired, timer, toggleIndex }
const pendingMap = new Map();

// -------- Hàm tiện ích --------
function pad2(n){ return n < 10 ? `0${n}` : `${n}`; }
function parseDateTime(ts) {
  if (!ts && ts !== 0) return null;
  if (ts instanceof Date) return isNaN(ts) ? null : ts;
  if (typeof ts === 'number') { const d = new Date(ts); return isNaN(d) ? null : d; }
  if (typeof ts === 'string') {
    // Thử định dạng ISO trước
    const iso = new Date(ts);
    if (!isNaN(iso)) return iso;
    // Thử HH:mm:ss (giả định là hôm nay)
    const hm = ts.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (hm) {
      const now = new Date();
      const [ , hh, mm, ss ] = hm;
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(hh), Number(mm), Number(ss));
      return isNaN(d) ? null : d;
    }
    // Thử dd-MM-yyyy HH:mm:ss
    const m = ts.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (m) {
      const [ , dd, MM, yyyy, hh, mm, ss ] = m;
      const d = new Date(
        Number(yyyy),
        Number(MM) - 1,
        Number(dd),
        Number(hh),
        Number(mm),
        Number(ss)
      );
      return isNaN(d) ? null : d;
    }
  }
  return null;
}
function fmtTime(ts) {
  const d = parseDateTime(ts);
  if (!d) return '--:--:--';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function select(id) { return document.getElementById(id); }
function highlightValue(el) {
  if (!el) return;
  
  // GSAP pulse animation
  gsap.fromTo(el, 
    { 
      scale: 1.1, 
      backgroundColor: 'rgba(34, 197, 94, 0.3)',
      boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)'
    },
    { 
      scale: 1, 
      backgroundColor: 'transparent',
      boxShadow: '0 0 0px rgba(34, 197, 94, 0)',
      duration: 0.8,
      ease: "power2.out"
    }
  );
}

// -------- Number formatting helpers --------
function formatValueFlexible(num, maxDecimals) {
  if (!Number.isFinite(num)) return '--';
  const str = num.toFixed(maxDecimals);
  return str.replace(/\.0+$|(?<=\.\d*[1-9])0+$/g, '');
}

// -------- Icons & Animations --------
function injectIcons() {
  const iconLight = select('icon-light');
  if (iconLight) iconLight.innerHTML = `
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3a7 7 0 0 0-7 7c0 3 2 5 3 6h8c1-1 3-3 3-6a7 7 0 0 0-7-7z"/>
      <path d="M9 18h6"/>
      <path d="M10 21h4"/>
    </svg>`;

  const iconFan = select('icon-fan');
  if (iconFan) iconFan.innerHTML = `
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="2"/>
      <path d="M12 4a4 4 0 0 1 4 4c0 .7-.2 1.4-.5 2L12 12"/>
      <path d="M20 12a4 4 0 0 1-4 4c-.7 0-1.4-.2-2-.5L12 12"/>
      <path d="M12 20a4 4 0 0 1-4-4c0-.7.2-1.4.5-2L12 12"/>
    </svg>`;

  const iconAir = select('icon-air');
  if (iconAir) iconAir.innerHTML = `
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="6" width="20" height="10" rx="2"/>
      <path d="M4 9h6"/>
      <path id="w1" d="M4 14h4"/>
      <path id="w2" d="M10 14h4"/>
      <path id="w3" d="M16 14h4"/>
    </svg>`;

  
}

function injectSensorIcons() {
  const t = select('icon-temp');
  if (t) t.innerHTML = `<svg class="sensor-icon-temp" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z"/></svg>`;

  const h = select('icon-hum');
  if (h) h.innerHTML = `<svg class="sensor-icon-hum" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#06b6d4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c3 4 7 7 7 10a7 7 0 1 1-14 0c0-3 4-6 7-10Z"/></svg>`;

  const l = select('icon-light-sensor');
  if (l) l.innerHTML = `<svg class="sensor-icon-light" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#22c55e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M4.2 4.2l2.2 2.2"/><path d="M17.6 17.6l2.2 2.2"/><path d="M19.8 4.2l-2.2 2.2"/><path d="M6.4 17.6l-2.2 2.2"/></svg>`;
}

function flashSensorIcon(kind) {
  const map = { temp: '#icon-temp svg', hum: '#icon-hum svg', light: '#icon-light-sensor svg' };
  const sel = map[kind];
  if (!sel) return;
  gsap.fromTo(sel, { scale: 1, filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))' }, { scale: 1.1, duration: 0.15, yoyo: true, repeat: 1, filter: 'drop-shadow(0 0 10px rgba(16,185,129,.6))' });
}

const iconTimelines = {
  light: gsap.timeline({ paused: true, repeat: -1, yoyo: true }),
  fan: gsap.timeline({ paused: true, repeat: -1 }),
  air: gsap.timeline({ paused: true, repeat: -1 })
};

function initIconTimelines() {
  iconTimelines.light.to('#icon-light svg', { filter: 'brightness(1.8)', duration: 0.6, ease: 'power2.inOut' });
  iconTimelines.fan.to('#icon-fan svg', { rotate: 360, transformOrigin: '50% 50%', duration: 1.2, ease: 'none' });
  iconTimelines.air
    .fromTo('#icon-air #w1', { x: -4, opacity: .4 }, { x: 6, opacity: 1, duration: .9 }, 0)
    .fromTo('#icon-air #w2', { x: -6, opacity: .3 }, { x: 8, opacity: 1, duration: 1.1 }, 0.05)
    .fromTo('#icon-air #w3', { x: -8, opacity: .2 }, { x: 10, opacity: 1, duration: 1.0 }, 0.1);
}

function setIconState(kind, isOn) {
  const el = select(`icon-${kind}`);
  if (!el) return;
  if (isOn) {
    el.classList.add('icon-on');
    iconTimelines[kind].play();
  } else {
    el.classList.remove('icon-on');
    iconTimelines[kind].pause(0);
  }
}

// -------- Thiết bị --------
async function loadDevices() {
  try {
    const devices = await fetchDevices();
    const controls = devices.filter(d => d && d.deviceUid !== 'esp32-1');
    const firstThree = controls.slice(0, 3);

    const titleFallbacks = ['LIGHT', 'FAN', 'AIR'];
    const headers = document.querySelectorAll('.cards .card.device .card-header h3');

    firstThree.forEach((d, idx) => {
      deviceIdByToggleIndex[idx] = d.id;

    if (headers[idx]) {
      const title = (d && d.name ? String(d.name) : titleFallbacks[idx] || `DEVICE ${idx + 1}`);
      // Keep icon and update only the text part
      const iconSpan = headers[idx].querySelector('.dev-icon');
      if (iconSpan) {
        // Remove existing text nodes, keep icon
        const textNodes = Array.from(headers[idx].childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
        textNodes.forEach(node => node.remove());
        // Add title after icon
        headers[idx].appendChild(document.createTextNode(' ' + title));
      } else {
        headers[idx].textContent = title;
      }
    }

      const toggle = select(`led${idx}-toggle`);
      if (toggle) {
        toggle.checked = d.state === 'ON';
        toggle.onchange = async (e) => {
          const currentState = e.target.checked;
          const action = currentState ? 'ON' : 'OFF';
          const sentAt = performance.now();
          
          // Rollback toggle ngay lập tức - không thay đổi UI cho đến khi có ACK
          e.target.checked = !currentState;
          
          // GSAP toggle animation
          gsap.to(e.target.closest('.card'), {
            scale: 0.95,
            duration: 0.1,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
          });
          
          // Pessimistic: disable toggle và chờ ACK từ hardware
          toggle.disabled = true;
          try {
            const resp = await sendDeviceCommand(d.id, action);
            const correlationId = resp && resp.correlationId ? String(resp.correlationId) : null;
            console.log(`Device ${d.id} command sent: ${action}`, correlationId ? `(cid=${correlationId})` : '');
            const rtt = Math.round(performance.now() - sentAt);
            const pingEl = select(`dev${idx}-ping`);
            if (pingEl) pingEl.textContent = `${rtt} ms`;
            // Start timeout rollback if no ACK
            const timer = setTimeout(() => {
              try {
                const pend = pendingMap.get(d.id);
                if (!pend) return;
                // Timeout: enable toggle và giữ nguyên trạng thái hiện tại
                toggle.disabled = false;
                pendingMap.delete(d.id);
                console.log(`Device ${d.id} command timeout - no ACK received`);
              } catch {}
            }, 2000);
            pendingMap.set(d.id, { correlationId, desired: action, timer, toggleIndex: idx });
          } catch (err) {
            console.error('Send command failed', err);
            // Error animation
            gsap.to(e.target.closest('.card'), {
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              duration: 0.2,
              yoyo: true,
              repeat: 2
            });
            // Lỗi: enable toggle và giữ nguyên trạng thái hiện tại
            toggle.disabled = false;
          }
        };
      }
    });
  } catch (e) {
    console.error('Failed to load devices:', e);
  }
}

// -------- Biểu đồ (ECharts) --------
function initCharts() {
  echart = echarts.init(document.getElementById('combinedChart'));
  echart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Nhiệt độ (°C)', 'Độ ẩm (%)', 'Ánh sáng (Lux)'] },
    xAxis: { type: 'category', data: [] },
    yAxis: [
      { type: 'value', name: '°C / %' },
      { type: 'value', name: 'Lux' }
    ],
    series: [
      { name: 'Nhiệt độ (°C)', type: 'line', smooth: true, data: [] },
      { name: 'Độ ẩm (%)', type: 'line', smooth: true, data: [] },
      { name: 'Ánh sáng (Lux)', type: 'line', smooth: true, yAxisIndex: 1, data: [] }
    ]
  });
  // Ensure proper sizing after init
  setTimeout(() => { if (echart) echart.resize(); }, 0);
  window.addEventListener('resize', () => { if (echart) echart.resize(); });
}

// --------BOX Dữ liệu cảm biến --------
function updateSensorCards(latest) {
  if (!latest) return;
  // Chuẩn hóa trường timestamp qua các payload khác nhau
  const ts = latest.recordedAt ?? latest.time ?? latest.timestamp ?? latest.createdAt;
  const withTs = { ...latest, recordedAt: ts };
  lastUiUpdateAt = Date.now();
  
  const tNum = Number(latest.temperature);
  if (Number.isFinite(tNum)) {
    const el = select('box-temp');
    el.textContent = formatValueFlexible(tNum, 1);
    highlightValue(el);
    flashSensorIcon('temp');
    const prevVal = Number(el.getAttribute('data-prev'));
    const trendElT = select('trend-temp');
    if (!isNaN(prevVal) && trendElT) {
      trendElT.className = 'trend-arrow ' + (tNum > prevVal ? 'trend-up' : tNum < prevVal ? 'trend-down' : '');
      if (trendElT.className.includes('trend-')) gsap.fromTo(trendElT, { scale: 0.6, opacity: 0.3 }, { scale: 1, opacity: 1, duration: 0.25 });
    }
    el.setAttribute('data-prev', String(tNum));
    select('box-temp-time').textContent = fmtTime(withTs.recordedAt);
    highlightValue(select('box-temp-time'));
    const dTemp = select('delta-temp');
    if (dTemp && !isNaN(prevVal)) {
      const deltaNum = tNum - prevVal;
      const delta = formatValueFlexible(deltaNum, 1);
      dTemp.textContent = (deltaNum > 0 ? '+' : '') + delta;
      dTemp.className = 'delta-badge ' + (delta > 0 ? 'delta-up' : delta < 0 ? 'delta-down' : 'delta-zero');
    }
    // Alert check
    const tempCard = select('card-temp');
    if (tempCard) {
      tempCard.classList.remove('alert-soft','alert-hard','alert');
      if (latest.temperature > settings.thresholds.temp) tempCard.classList.add('alert-hard');
      if (tempCard.classList.contains('alert-hard')) {
        const now = performance.now();
        if (now - lastFlashAt.temp > 2000) {
          lastFlashAt.temp = now;
          tempCard.classList.add('alert-flash');
          setTimeout(() => tempCard.classList.remove('alert-flash'), 700);
          // First flash stronger using GSAP
          gsap.fromTo('#icon-temp svg', { scale: 1 }, { scale: 1.15, yoyo: true, repeat: 3, duration: 0.15 });
        }
      }
    }
  } else {
    select('box-temp').textContent = '--';
    select('box-temp-time').textContent = fmtTime(withTs.recordedAt);
  }
  
  const hNum = Number(latest.humidity);
  if (Number.isFinite(hNum)) {
    const el = select('box-hum');
    el.textContent = formatValueFlexible(hNum, 1);
    highlightValue(el);
    flashSensorIcon('hum');
    const prevVal = Number(el.getAttribute('data-prev'));
    const trendElH = select('trend-hum');
    if (!isNaN(prevVal) && trendElH) {
      trendElH.className = 'trend-arrow ' + (hNum > prevVal ? 'trend-up' : hNum < prevVal ? 'trend-down' : '');
      if (trendElH.className.includes('trend-')) gsap.fromTo(trendElH, { scale: 0.6, opacity: 0.3 }, { scale: 1, opacity: 1, duration: 0.25 });
    }
    el.setAttribute('data-prev', String(hNum));
    select('box-hum-time').textContent = fmtTime(withTs.recordedAt);
    highlightValue(select('box-hum-time'));
    const dHum = select('delta-hum');
    if (dHum && !isNaN(prevVal)) {
      const deltaNum = hNum - prevVal;
      const delta = formatValueFlexible(deltaNum, 1);
      dHum.textContent = (deltaNum > 0 ? '+' : '') + delta;
      dHum.className = 'delta-badge ' + (delta > 0 ? 'delta-up' : delta < 0 ? 'delta-down' : 'delta-zero');
    }
    // Alert check
    const humCard = select('card-hum');
    if (humCard) {
      humCard.classList.remove('alert-soft','alert-hard','alert');
      if (latest.humidity > settings.thresholds.hum) humCard.classList.add('alert-hard');
      if (humCard.classList.contains('alert-hard')) {
        const now = performance.now();
        if (now - lastFlashAt.hum > 2000) {
          lastFlashAt.hum = now;
          humCard.classList.add('alert-flash');
          setTimeout(() => humCard.classList.remove('alert-flash'), 700);
          gsap.fromTo('#icon-hum svg', { scale: 1 }, { scale: 1.15, yoyo: true, repeat: 3, duration: 0.15 });
        }
      }
    }
  } else {
    select('box-hum').textContent = '--';
    select('box-hum-time').textContent = fmtTime(withTs.recordedAt);
  }
  
  const lNum = Number(latest.light);
  if (Number.isFinite(lNum)) {
    const el = select('box-light');
    el.textContent = formatValueFlexible(lNum, 4);
    highlightValue(el);
    flashSensorIcon('light');
    const prevVal = Number(el.getAttribute('data-prev'));
    const trendElL = select('trend-light');
    if (!isNaN(prevVal) && trendElL) {
      trendElL.className = 'trend-arrow ' + (lNum > prevVal ? 'trend-up' : lNum < prevVal ? 'trend-down' : '');
      if (trendElL.className.includes('trend-')) gsap.fromTo(trendElL, { scale: 0.6, opacity: 0.3 }, { scale: 1, opacity: 1, duration: 0.25 });
    }
    el.setAttribute('data-prev', String(lNum));
    select('box-light-time').textContent = fmtTime(withTs.recordedAt);
    highlightValue(select('box-light-time'));
    const dLight = select('delta-light');
    if (dLight && !isNaN(prevVal)) {
      const deltaNum = lNum - prevVal;
      const delta = formatValueFlexible(deltaNum, 4);
      dLight.textContent = (deltaNum > 0 ? '+' : '') + delta;
      dLight.className = 'delta-badge ' + (delta > 0 ? 'delta-up' : delta < 0 ? 'delta-down' : 'delta-zero');
    }
    // Alert check
    const lightCard = select('card-light');
    if (lightCard) {
      lightCard.classList.remove('alert-soft','alert-hard','alert');
      if (latest.light > settings.thresholds.light) lightCard.classList.add('alert-hard');
      if (lightCard.classList.contains('alert-hard')) {
        const now = performance.now();
        if (now - lastFlashAt.light > 2000) {
          lastFlashAt.light = now;
          lightCard.classList.add('alert-flash');
          setTimeout(() => lightCard.classList.remove('alert-flash'), 700);
          gsap.fromTo('#icon-light-sensor svg', { scale: 1 }, { scale: 1.15, yoyo: true, repeat: 3, duration: 0.15 });
        }
      }
    }
  } else {
    select('box-light').textContent = '--';
    select('box-light-time').textContent = fmtTime(withTs.recordedAt);
  }
}

function fillChartsFromList(list) {
  
  
  const ordered = [...list].reverse();
  const labels = ordered.map(r => fmtTime(r.recordedAt));
  const temps = ordered.map(r => r.temperature);
  const hums = ordered.map(r => r.humidity);
  const lights = ordered.map(r => r.light);

  const slicedLabels = labels.slice(-windowSize);
  const slicedTemps = temps.slice(-windowSize);
  const slicedHums = hums.slice(-windowSize);
  const slicedLights = lights.slice(-windowSize);

  const option = {
    xAxis: { type: 'category', data: slicedLabels },
    yAxis: [
      { type: 'value', name: '°C / %' },
      { type: 'value', name: 'Lux' }
    ],
    series: [
      { name: 'Nhiệt độ (°C)', type: 'line', smooth: true, data: slicedTemps },
      { name: 'Độ ẩm (%)', type: 'line', smooth: true, data: slicedHums },
      { name: 'Ánh sáng (Lux)', type: 'line', smooth: true, yAxisIndex: 1, data: slicedLights }
    ]
  };
  echart.setOption(option, false, true);
  if (echart) echart.resize();
  // Subtle post-update animation only
  gsap.fromTo('#combinedChart', { opacity: 0.9, scale: 0.99 }, { opacity: 1, scale: 1, duration: 0.2, ease: "power2.out" });
}

function exportChartCSV() {
  const opt = echart.getOption();
  const labels = (opt.xAxis && opt.xAxis[0] && opt.xAxis[0].data) ? opt.xAxis[0].data : [];
  const s0 = opt.series && opt.series[0] ? opt.series[0].data : [];
  const s1 = opt.series && opt.series[1] ? opt.series[1].data : [];
  const s2 = opt.series && opt.series[2] ? opt.series[2].data : [];
  let csv = 'time,temperature,humidity,light\n';
  for (let i = 0; i < labels.length; i++) {
    csv += `${labels[i]},${s0[i] ?? ''},${s1[i] ?? ''},${s2[i] ?? ''}\n`;
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `sensor-data-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function saveChartPNG() {
  const dataURL = echart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
  const a = document.createElement('a');
  a.href = dataURL; a.download = `chart-${Date.now()}.png`; a.click();
}

async function loadInitialSensorData() {
  try {
    const paged = await fetchSensorsPage({ page: 0, size: windowSize, sort: 'desc' });
    const list = Array.isArray(paged.data) ? paged.data : [];
    
    fillChartsFromList(list);
    if (list[0]) {
      updateSensorCards(list[0]);
    } else {
      const now = new Date();
      const fake = { recordedAt: now, temperature: NaN, humidity: NaN, light: NaN };
      updateSensorCards(fake);
    }
  } catch (e) {
    console.error('Failed to load initial sensor data:', e);
    const now = new Date();
    const fake = { recordedAt: now, temperature: NaN, humidity: NaN, light: NaN };
    updateSensorCards(fake);
  }
}

function appendRealtimePoint(msg) {
  if (pauseRealtime) return;
  const tsRaw = msg.recordedAt ?? msg.time ?? msg.timestamp ?? msg.createdAt;
  const parsed = parseDateTime(tsRaw);
  if (!parsed) return;
  const ts = parsed;
  const tsMs = ts.getTime();
  if (!Number.isFinite(tsMs)) return;
  if (tsMs <= lastAppliedTsMs) return;
  const label = fmtTime(ts);
  const { temperature, humidity, light } = msg;
  const tNum = Number(temperature);
  const hNum = Number(humidity);
  const lNum = Number(light);
  const key = `${tsMs}|${Number.isFinite(tNum)?tNum:''}|${Number.isFinite(hNum)?hNum:''}|${Number.isFinite(lNum)?lNum:''}`;
  if (key === lastAppliedKey) return;

  const opt = echart.getOption();
  const labelsNow = (opt.xAxis && opt.xAxis[0] && opt.xAxis[0].data) ? [...opt.xAxis[0].data] : [];
  const s0 = opt.series && opt.series[0] ? [...opt.series[0].data] : [];
  const s1 = opt.series && opt.series[1] ? [...opt.series[1].data] : [];
  const s2 = opt.series && opt.series[2] ? [...opt.series[2].data] : [];

  labelsNow.push(label);
  s0.push(Number.isFinite(tNum) ? tNum : null);
  s1.push(Number.isFinite(hNum) ? hNum : null);
  s2.push(Number.isFinite(lNum) ? lNum : null);

  while (labelsNow.length > windowSize) labelsNow.shift();
  while (s0.length > windowSize) s0.shift();
  while (s1.length > windowSize) s1.shift();
  while (s2.length > windowSize) s2.shift();

  echart.setOption({
    xAxis: { data: labelsNow },
    series: [ { data: s0 }, { data: s1 }, { data: s2 } ]
  });
  if (echart) echart.resize();

  updateSensorCards({ ...msg, recordedAt: ts });
  lastAppliedTsMs = tsMs;
  lastAppliedKey = key;
}

// -------- WebSocket --------
let stompClient = null;
let lastWsSensorAt = 0;
let lastUiUpdateAt = 0;
let lastAppliedTsMs = 0;
let lastAppliedKey = '';
function connectWS() {
  try {
    stompClient = connectStomp({
      onSensors: (payload) => {
        try { lastWsSensorAt = Date.now(); appendRealtimePoint(payload); } catch {}
      },
      onDevices: (ack) => {
        try {
          const idx = deviceIdByToggleIndex.findIndex(id => id === ack.deviceId);
          if (idx >= 0) {
            // Match ACK with pending command if any
            const pend = pendingMap.get(ack.deviceId);
            if (pend) {
              // Ignore status pushes that are not the correlated ACK to avoid flicker
              const toggleEl = document.getElementById(`led${idx}-toggle`);
              // Case 1: API gave correlationId but WS does not include it -> ignore
              if (pend.correlationId && !ack.correlationId) {
                if (toggleEl) toggleEl.disabled = true;
                return;
              }
              // Case 2: We have correlationId and it doesn't match -> ignore
              if (pend.correlationId && ack.correlationId && ack.correlationId !== pend.correlationId) {
                if (toggleEl) toggleEl.disabled = true;
                return;
              }
              // Case 3: We don't have correlationId from API, accept only if state equals desired
              if (!pend.correlationId && ack.state !== pend.desired) {
                if (toggleEl) toggleEl.disabled = true;
                return;
              }
              clearTimeout(pend.timer);
              pendingMap.delete(ack.deviceId);
            }
            const toggle = document.getElementById(`led${idx}-toggle`);
            if (toggle) {
              toggle.checked = ack.state === 'ON';
              toggle.disabled = false;
            }
            if (idx === 0) setIconState('light', ack.state === 'ON');
            if (idx === 1) setIconState('fan', ack.state === 'ON');
            if (idx === 2) setIconState('air', ack.state === 'ON');
            const pingEl = document.getElementById(`dev${idx}-ping`);
            if (pingEl && ack.recordedAt) pingEl.textContent = 'ACK';
          }
        } catch {}
      }
    });
  } catch (error) {
    setTimeout(connectWS, 5000);
  }
}

// -------- Gắn sự kiện giao diện --------
function bindWindowSelectors() {
  select('data-window').addEventListener('change', async (e) => {
    windowSize = parseInt(e.target.value, 10);
    await loadInitialSensorData();
  });
  const pauseBtn = select('btn-pause');
  if (pauseBtn) pauseBtn.addEventListener('click', () => {
    pauseRealtime = !pauseRealtime;
    pauseBtn.textContent = pauseRealtime ? 'Resume' : 'Pause';
  });
  const exCsv = select('btn-export-csv');
  if (exCsv) exCsv.addEventListener('click', exportChartCSV);
  const savePng = select('btn-save-png');
  if (savePng) savePng.addEventListener('click', saveChartPNG);
  const btn = select('btn-settings');
  if (btn) btn.addEventListener('click', openSettings);
  const closeBtn = select('settings-close');
  if (closeBtn) closeBtn.addEventListener('click', closeSettings);
  const cancelBtn = select('settings-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', closeSettings);
  const saveBtn = select('settings-save');
  if (saveBtn) saveBtn.addEventListener('click', () => {
    settings.thresholds.temp = Number(select('th-temp').value);
    settings.thresholds.hum = Number(select('th-hum').value);
    settings.thresholds.light = Number(select('th-light').value);
    // keep defaults for removed fields
    saveSettings();
    closeSettings();
  });
}

// -------- GSAP Animations --------
function initPageAnimations() {
  // Set initial states
  gsap.set('.card', { opacity: 0, y: 30 });
  gsap.set('.chart-card', { opacity: 0, scale: 0.9 });
  gsap.set('.topbar', { opacity: 0, y: -20 });
  
  // Create entrance timeline
  const tl = gsap.timeline();
  
  tl.to('.topbar', { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" })
    .to('.card.device', { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }, "-=0.3")
    .to('.card.sensor', { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }, "-=0.2")
    .to('.chart-card', { opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.7)" }, "-=0.1");
}

function addHoverEffects() {
  // Device cards hover
  document.querySelectorAll('.card.device').forEach(card => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, { scale: 1.02, duration: 0.3, ease: "power2.out" });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { scale: 1, duration: 0.3, ease: "power2.out" });
    });
  });
  
  // Sensor cards hover
  document.querySelectorAll('.card.sensor').forEach(card => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, { scale: 1.05, duration: 0.3, ease: "power2.out" });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { scale: 1, duration: 0.3, ease: "power2.out" });
    });
  });
  
  // Chart card hover
  const chartCard = document.querySelector('.chart-card');
  if (chartCard) {
    chartCard.addEventListener('mouseenter', () => {
      gsap.to(chartCard, { scale: 1.01, duration: 0.3, ease: "power2.out" });
    });
    chartCard.addEventListener('mouseleave', () => {
      gsap.to(chartCard, { scale: 1, duration: 0.3, ease: "power2.out" });
    });
  }
}

// -------- Khởi tạo --------
window.addEventListener('DOMContentLoaded', async () => {
  loadSettings();
  applyTheme();
  initCharts();
  injectIcons();
  injectSensorIcons();
  initIconTimelines();
  bindWindowSelectors();
  initPageAnimations();
  addHoverEffects();
  await loadDevices();
  
  await loadInitialSensorData();
  connectWS();
  // Realtime fallback: poll latest when WS silent > 5s
  setInterval(async () => {
    try {
      const now = Date.now();
      const wsSilent = now - lastWsSensorAt >= 5000;
      const uiStale = now - lastUiUpdateAt >= 4000;
      if (!wsSilent && !uiStale) return;
      const res = await fetch(`${SENSOR_API}?page=0&size=1&sort=desc&_=${Date.now()}`);
      if (!res.ok) return;
      const paged = await res.json();
      const item = Array.isArray(paged.data) && paged.data[0] ? paged.data[0] : null;
      if (item) {
        const parsedTs = parseDateTime(item.recordedAt ?? item.time ?? item.timestamp ?? item.createdAt);
        if (!parsedTs) return;
        const ageMs = Date.now() - parsedTs.getTime();
        if (ageMs <= 5000) {
          
          appendRealtimePoint(item);
        } else {
          // stale sample -> ignore to avoid fake realtime
        }
      }
    } catch {}
  }, 2000);
});
