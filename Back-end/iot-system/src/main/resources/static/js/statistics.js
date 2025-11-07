// Module hóa cấu hình và API
import { ENDPOINTS } from './config.js';

// Load settings from localStorage
const settings = {
  thresholds: {
    temp: 30,
    hum: 80,
    light: 800
  }
};

function loadSettings() {
  try {
    const raw = localStorage.getItem('iot_settings');
    console.log('[Settings] Loading from localStorage:', raw);
    if (raw) {
      const incoming = JSON.parse(raw);
      Object.assign(settings, incoming);
      normalizeSettings();
      console.log('[Settings] Loaded settings:', JSON.stringify(settings));
    } else {
      normalizeSettings();
      console.log('[Settings] Using default settings:', JSON.stringify(settings));
    }
  } catch (e) {
    console.error('[Settings] Load failed:', e);
  }
}

function saveSettings() {
  try {
    console.log('[Settings] Saving to localStorage:', JSON.stringify(settings));
    localStorage.setItem('iot_settings', JSON.stringify(settings));
    console.log('[Settings] Saved successfully');
  } catch (e) {
    console.warn('[Settings] Save failed:', e);
  }
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

// State
let chartInstance = null;
let statisticsData = {
  temp: 0,
  hum: 0,
  light: 0
};

// Device name mapping
const DEVICE_MAP = {
  'LED0': 'LIGHT',
  'LED1': 'FAN',
  'LED2': 'AIR'
};

// Utility functions
function select(id) {
  return document.getElementById(id);
}

function animateNumber(element, from, to, duration = 1000) {
  const obj = { value: from };
  gsap.to(obj, {
    value: to,
    duration: duration / 1000,
    ease: "power2.out",
    onUpdate: () => {
      element.textContent = Math.round(obj.value);
    }
  });
}

// Format date to dd-MM-yyyy HH:mm:ss
function formatDate(date) {
  const pad = (n) => n < 10 ? '0' + n : n;
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Format time to display
function formatTimeDisplay(dateString) {
  const date = new Date(dateString);
  const pad = (n) => n < 10 ? '0' + n : n;
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Fetch device actions and count on/off events
async function fetchStatistics(timeRange = 'today') {
  try {
    // Calculate date range - always today (0h to 24h)
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0); // Start of today
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); // End of today

    // Format date as dd-MM-yyyy for API
    const pad = (n) => n < 10 ? '0' + n : n;
    const dateStr = `${pad(startDate.getDate())}-${pad(startDate.getMonth() + 1)}-${startDate.getFullYear()}`;
    
    console.log('Fetching device actions for:', dateStr);

    // Fetch device actions within time range with large page size
    // Add cache buster to force fresh data
    const cacheBuster = `&_t=${Date.now()}`;
    const response = await fetch(`${ENDPOINTS.actionsSearch}?dateStr=${dateStr}&page=0&size=10000&sort=asc${cacheBuster}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch device actions');
    }

    const result = await response.json();
    const actions = result.data || [];
    console.log('Total device actions today:', actions.length);
    console.log('Sample actions:', actions.slice(0, 5));

    // Count ON actions only for each device
    const counts = {
      light: 0,
      fan: 0,
      air: 0
    };

    actions.forEach(action => {
      const deviceName = action.deviceName ? action.deviceName.toUpperCase() : '';
      const actionType = action.action ? action.action.toString().toUpperCase() : '';
      
      // Only count ON actions
      if (actionType === 'ON') {
        console.log('ON Action:', deviceName, action.executedAt);
        
        if (deviceName === 'LIGHT') {
          counts.light++;
        } else if (deviceName === 'FAN') {
          counts.fan++;
        } else if (deviceName === 'AIR') {
          counts.air++;
        }
      }
    });

    console.log('Final ON action counts:', counts);

    return { violations: counts };
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return { violations: { light: 0, fan: 0, air: 0 } };
  }
}

// Fetch sensor data and count threshold violations
async function fetchSensorViolations() {
  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Format date as dd-MM-yyyy for API (just the date, not time range)
    const pad = (n) => n < 10 ? '0' + n : n;
    const dateStr = `${pad(startDate.getDate())}-${pad(startDate.getMonth() + 1)}-${startDate.getFullYear()}`;
    
    console.log('[Violations] Fetching sensor data for date:', dateStr);
    console.log('[Violations] Current thresholds:', JSON.stringify(settings.thresholds));

    // Fetch sensor data - use dateStr parameter (Backend will return all data for that day)
    const cacheBuster = `&_t=${Date.now()}`;
    const response = await fetch(`${ENDPOINTS.sensors}?dateStr=${dateStr}&page=0&size=10000&sort=asc${cacheBuster}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch sensor data');
    }

    const result = await response.json();
    const data = result.data || [];
    console.log('[Violations] Total sensor records today:', data.length);
    if (data.length > 0) {
      console.log('[Violations] Sample data:', data.slice(0, 3));
    }

    // Count threshold violations - count EVERY record that exceeds threshold
    const violations = {
      temp: 0,
      hum: 0,
      light: 0
    };

    // Sort by timestamp
    const sortedData = data.sort((a, b) => {
      const timeA = new Date(a.recordedAt || a.timestamp || a.createdAt).getTime();
      const timeB = new Date(b.recordedAt || b.timestamp || b.createdAt).getTime();
      return timeA - timeB;
    });

    console.log('[Violations] Processing', sortedData.length, 'records...');

    // Count every record that exceeds threshold
    sortedData.forEach((record, index) => {
      // Check temperature
      const tempValue = parseFloat(record.temperature);
      if (tempValue > settings.thresholds.temp) {
        violations.temp++;
        if (violations.temp <= 3) { // Log first 3 for debugging
          console.log(`[Violations] Temp #${violations.temp} at record ${index}: ${tempValue}°C > ${settings.thresholds.temp}°C`);
        }
      }

      // Check humidity
      const humValue = parseFloat(record.humidity);
      if (humValue > settings.thresholds.hum) {
        violations.hum++;
        if (violations.hum <= 3) {
          console.log(`[Violations] Hum #${violations.hum} at record ${index}: ${humValue}% > ${settings.thresholds.hum}%`);
        }
      }

      // Check light
      const lightValue = parseFloat(record.light);
      if (lightValue > settings.thresholds.light) {
        violations.light++;
        if (violations.light <= 3) {
          console.log(`[Violations] Light #${violations.light} at record ${index}: ${lightValue} Lux > ${settings.thresholds.light} Lux`);
        }
      }
    });

    console.log('[Violations] Summary:');
    console.log('  - Temperature: ', violations.temp, 'records exceeded', settings.thresholds.temp, '°C');
    console.log('  - Humidity: ', violations.hum, 'records exceeded', settings.thresholds.hum, '%');
    console.log('  - Light: ', violations.light, 'records exceeded', settings.thresholds.light, 'Lux');
    console.log('[Violations] Final count:', violations);

    return violations;
  } catch (error) {
    console.error('Error fetching sensor violations:', error);
    return { temp: 0, hum: 0, light: 0 };
  }
}

// Update summary cards
function updateSummaryCards(data) {
  console.log('Updating UI with action counts:', data);
  
  const cards = [
    { id: 'total-light', value: data.light },
    { id: 'total-fan', value: data.fan },
    { id: 'total-air', value: data.air }
  ];

  cards.forEach(card => {
    const element = select(card.id);
    
    if (element) {
      const currentValue = parseInt(element.textContent) || 0;
      console.log(`${card.id}: ${currentValue} → ${card.value}`);
      animateNumber(element, currentValue, card.value, 800);
    }
  });
  
  // Sort devices by count (descending) for table display
  const devices = [
    { name: 'LIGHT', icon: '💡', count: data.light, key: 'light' },
    { name: 'FAN', icon: '🌀', count: data.fan, key: 'fan' },
    { name: 'AIR', icon: '❄️', count: data.air, key: 'air' }
  ];
  
  // Sort descending by count
  devices.sort((a, b) => b.count - a.count);
  console.log('Sorted devices:', devices);
  
  // Update table - reorder rows by count
  const tbody = select('activity-tbody');
  if (tbody) {
    // Clear existing rows
    tbody.innerHTML = '';
    
    // Add sorted rows
    devices.forEach((device, index) => {
      const row = document.createElement('tr');
      row.setAttribute('data-device', device.key);
      
      row.innerHTML = `
        <td class="rank-cell">${index + 1}</td>
        <td>
          <div class="device-info">
            <span class="device-icon">${device.icon}</span>
            <span class="device-name">${device.name}</span>
          </div>
        </td>
        <td class="count-cell"><span class="device-count">${device.count}</span></td>
      `;
      
      tbody.appendChild(row);
      
      // Animate the count
      const countElement = row.querySelector('.device-count');
      if (countElement) {
        animateNumber(countElement, 0, device.count, 800);
      }
    });
  }
  
  // Update last update time
  const lastUpdate = select('last-update');
  if (lastUpdate) {
    const now = new Date();
    const pad = (n) => n < 10 ? '0' + n : n;
    lastUpdate.textContent = `Cập nhật: ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }
}

// Update sensor violations table
function updateViolationsTable(violations) {
  console.log('[updateViolationsTable] Received violations:', violations);
  
  // Sort sensors by violation count (descending)
  const sensors = [
    { name: 'Nhiệt độ', icon: '🌡️', count: violations.temp, key: 'temp', unit: '°C' },
    { name: 'Độ ẩm', icon: '💧', count: violations.hum, key: 'hum', unit: '%' },
    { name: 'Ánh sáng', icon: '☀️', count: violations.light, key: 'light', unit: ' Lux' }
  ];
  
  // Sort descending by count
  sensors.sort((a, b) => b.count - a.count);
  console.log('[updateViolationsTable] Sorted sensors:', sensors);
  
  // Update table - reorder rows by count
  const tbody = select('violations-tbody');
  console.log('[updateViolationsTable] Found tbody element:', tbody);
  
  if (tbody) {
    // Clear existing rows
    tbody.innerHTML = '';
    console.log('[updateViolationsTable] Cleared tbody, adding new rows...');
    
    // Add sorted rows
    sensors.forEach((sensor, index) => {
      const row = document.createElement('tr');
      row.setAttribute('data-sensor', sensor.key);
      
      const thresholdValue = settings.thresholds[sensor.key];
      
      row.innerHTML = `
        <td class="rank-cell">${index + 1}</td>
        <td>
          <div class="device-info">
            <span class="device-icon">${sensor.icon}</span>
            <span class="device-name">${sensor.name}</span>
          </div>
        </td>
        <td><span class="threshold-display">${thresholdValue}</span>${sensor.unit}</td>
        <td class="count-cell"><span class="violation-count">${sensor.count}</span></td>
      `;
      
      tbody.appendChild(row);
      console.log(`[updateViolationsTable] Added row for ${sensor.name}: ${sensor.count} violations`);
      
      // Animate the count
      const countElement = row.querySelector('.violation-count');
      if (countElement) {
        animateNumber(countElement, 0, sensor.count, 800);
      }
    });
    
    console.log('[updateViolationsTable] All rows added successfully');
  } else {
    console.error('[updateViolationsTable] ERROR: violations-tbody element not found!');
  }
}

// Update activity table with violation details - REMOVED
// Table is now static with counts only

// Initialize chart - REMOVED
// No longer needed

// Update chart - REMOVED
// No longer needed

// Load and display statistics
async function loadStatistics() {
  console.log('[loadStatistics] Starting to load statistics...');
  
  const { violations } = await fetchStatistics('today');
  statisticsData = violations;
  
  console.log('[loadStatistics] Device action counts:', violations);
  updateSummaryCards(violations);
  
  // Fetch and update sensor violations
  console.log('[loadStatistics] Fetching sensor violations...');
  const sensorViolations = await fetchSensorViolations();
  console.log('[loadStatistics] Sensor violations result:', sensorViolations);
  updateViolationsTable(sensorViolations);
  
  console.log('[loadStatistics] All statistics loaded successfully');
}

// Page animations
function initPageAnimations() {
  // Animate summary cards
  gsap.from('.summary-card', {
    opacity: 0,
    y: 30,
    duration: 0.6,
    stagger: 0.1,
    ease: "power2.out"
  });

  // Animate activity card
  gsap.from('.activity-card', {
    opacity: 0,
    y: 30,
    duration: 0.6,
    delay: 0.4,
    ease: "power2.out"
  });
}

// Add hover effects
function addHoverEffects() {
  document.querySelectorAll('.summary-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, { 
        scale: 1.03, 
        duration: 0.3, 
        ease: "power2.out" 
      });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { 
        scale: 1, 
        duration: 0.3, 
        ease: "power2.out" 
      });
    });
  });
}

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
  loadSettings();
  
  // Display initial thresholds in violations table
  if (select('threshold-temp-display')) {
    select('threshold-temp-display').textContent = settings.thresholds.temp;
  }
  if (select('threshold-hum-display')) {
    select('threshold-hum-display').textContent = settings.thresholds.hum;
  }
  if (select('threshold-light-display')) {
    select('threshold-light-display').textContent = settings.thresholds.light;
  }

  // Load initial statistics
  await loadStatistics();
  
  // Animations
  initPageAnimations();
  addHoverEffects();

  // Settings button
  const btnSettings = select('btn-settings');
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      const modal = select('settings-modal');
      if (modal) {
        select('th-temp').value = settings.thresholds.temp;
        select('th-hum').value = settings.thresholds.hum;
        select('th-light').value = settings.thresholds.light;
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
      }
    });
  }

  // Settings close
  const btnClose = select('settings-close');
  const btnCancel = select('settings-cancel');
  const closeModal = () => {
    const modal = select('settings-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }
  };
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  // Settings save
  const btnSave = select('settings-save');
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const oldThresholds = {...settings.thresholds};
      
      settings.thresholds.temp = Number(select('th-temp').value);
      settings.thresholds.hum = Number(select('th-hum').value);
      settings.thresholds.light = Number(select('th-light').value);
      
      console.log('[Settings] Old thresholds:', oldThresholds);
      console.log('[Settings] New thresholds:', settings.thresholds);
      
      saveSettings();
      
      // Show notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
      `;
      notification.textContent = '✓ Đã lưu cài đặt ngưỡng';
      document.body.appendChild(notification);
      
      // Add animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
      
      // Remove notification after 2 seconds
      setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-in reverse';
        setTimeout(() => notification.remove(), 300);
      }, 2000);
      
      // Reload statistics with new thresholds
      console.log('[Settings] Reloading statistics with new thresholds...');
      await loadStatistics();
      
      closeModal();
    });
  }

  // Close modal on backdrop click
  const modal = select('settings-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Time range selector - REMOVED

  // Auto refresh every 30 seconds
  setInterval(async () => {
    await loadStatistics();
  }, 30000);
});
