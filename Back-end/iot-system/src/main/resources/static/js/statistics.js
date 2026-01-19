// Module hóa cấu hình và API
import { ENDPOINTS } from './config.js';

// Tải cài đặt từ localStorage
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
    console.log('[Cài đặt] Đang tải từ localStorage:', raw);
    if (raw) {
      const incoming = JSON.parse(raw);
      Object.assign(settings, incoming);
      normalizeSettings();
      console.log('[Cài đặt] Đã tải cài đặt:', JSON.stringify(settings));
    } else {
      normalizeSettings();
      console.log('[Cài đặt] Sử dụng cài đặt mặc định:', JSON.stringify(settings));
    }
  } catch (e) {
    console.error('[Cài đặt] Tải thất bại:', e);
  }
}

function saveSettings() {
  try {
    console.log('[Cài đặt] Đang lưu vào localStorage:', JSON.stringify(settings));
    localStorage.setItem('iot_settings', JSON.stringify(settings));
    console.log('[Cài đặt] Đã lưu thành công');
  } catch (e) {
    console.warn('[Cài đặt] Lưu thất bại:', e);
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

// Trạng thái
let chartInstance = null;
let statisticsData = {
  temp: 0,
  hum: 0,
  light: 0
};

// Ánh xạ tên thiết bị
const DEVICE_MAP = {
  'LED0': 'LIGHT',
  'LED1': 'FAN',
  'LED2': 'AIR'
};

// Các hàm tiện ích
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

// Định dạng ngày thành dd-MM-yyyy HH:mm:ss
function formatDate(date) {
  const pad = (n) => n < 10 ? '0' + n : n;
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Định dạng thời gian để hiển thị
function formatTimeDisplay(dateString) {
  const date = new Date(dateString);
  const pad = (n) => n < 10 ? '0' + n : n;
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Lấy hành động của thiết bị và đếm số lần bật/tắt
async function fetchStatistics(timeRange = 'today') {
  try {
    // Tính toán ngày - luôn là hôm nay
    const now = new Date();
    const pad = (n) => n < 10 ? '0' + n : n;
    const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
    
    console.log('Đang lấy số lần hoạt động của thiết bị từ Backend cho ngày:', dateStr);

    // Gọi API Backend mới (đếm phía máy chủ)
    const response = await fetch(`${ENDPOINTS.statisticsDeviceActions}?date=${dateStr}`);
    
    if (!response.ok) {
      throw new Error('Không thể lấy thống kê hành động của thiết bị');
    }

    const counts = await response.json(); // {light: X, fan: Y, air: Z}
    console.log('Số lần hoạt động của thiết bị (chỉ BẬT):', counts);

    // Trả về theo định dạng mong muốn cho UI
    return { violations: counts };
  } catch (error) {
    console.error('Lỗi khi lấy thống kê:', error);
    return { violations: { light: 0, fan: 0, air: 0 } };
  }
}

// Lấy dữ liệu cảm biến và đếm số lần vi phạm ngưỡng
async function fetchSensorViolations() {
  try {
    const now = new Date();
    const pad = (n) => n < 10 ? '0' + n : n;
    const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
    
    console.log('[Vi phạm] Đang lấy số lần vi phạm từ Backend cho ngày:', dateStr);
    console.log('[Vi phạm] Sử dụng ngưỡng:', JSON.stringify(settings.thresholds));

    // Gọi API Backend mới (đếm phía máy chủ với ngưỡng)
    const url = `${ENDPOINTS.statisticsViolations}?date=${dateStr}&temp=${settings.thresholds.temp}&hum=${settings.thresholds.hum}&light=${settings.thresholds.light}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Không thể lấy thống kê vi phạm cảm biến');
    }

    const violations = await response.json(); // {temp: X, hum: Y, light: Z}
    
    console.log('[Vi phạm] Tóm tắt từ Backend:');
    console.log('  - Nhiệt độ: ', violations.temp, 'bản ghi vượt quá', settings.thresholds.temp, '°C');
    console.log('  - Độ ẩm: ', violations.hum, 'bản ghi vượt quá', settings.thresholds.hum, '%');
    console.log('  - Ánh sáng: ', violations.light, 'bản ghi vượt quá', settings.thresholds.light, 'Lux');

    return violations;
  } catch (error) {
    console.error('Lỗi khi lấy số lần vi phạm cảm biến:', error);
    return { temp: 0, hum: 0, light: 0 };
  }
}

// Cập nhật thẻ tóm tắt
function updateSummaryCards(data) {
  console.log('Đang cập nhật UI với số lần hoạt động:', data);
  
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
  
  // Sắp xếp thiết bị theo số lần (giảm dần) để hiển thị bảng
  const devices = [
    { name: 'LIGHT', icon: '💡', count: data.light, key: 'light' },
    { name: 'FAN', icon: '🌀', count: data.fan, key: 'fan' },
    { name: 'AIR', icon: '❄️', count: data.air, key: 'air' }
  ];
  
  // Sắp xếp giảm dần theo số lần
  devices.sort((a, b) => b.count - a.count);
  console.log('Thiết bị đã sắp xếp:', devices);
  
  // Cập nhật bảng - sắp xếp lại các hàng theo số lần
  const tbody = select('activity-tbody');
  if (tbody) {
    // Xóa các hàng hiện có
    tbody.innerHTML = '';
    
    // Thêm các hàng đã sắp xếp
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
      
      // Tạo hiệu ứng cho số đếm
      const countElement = row.querySelector('.device-count');
      if (countElement) {
        animateNumber(countElement, 0, device.count, 800);
      }
    });
  }
  
  // Cập nhật thời gian cập nhật cuối cùng
  const lastUpdate = select('last-update');
  if (lastUpdate) {
    const now = new Date();
    const pad = (n) => n < 10 ? '0' + n : n;
    lastUpdate.textContent = `Cập nhật: ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }
}

// Cập nhật bảng vi phạm cảm biến
function updateViolationsTable(violations) {
  console.log('[updateViolationsTable] Đã nhận số lần vi phạm:', violations);
  
  // Sắp xếp cảm biến theo số lần vi phạm (giảm dần)
  const sensors = [
    { name: 'Nhiệt độ', icon: '🌡️', count: violations.temp, key: 'temp', unit: '°C' },
    { name: 'Độ ẩm', icon: '💧', count: violations.hum, key: 'hum', unit: '%' },
    { name: 'Ánh sáng', icon: '☀️', count: violations.light, key: 'light', unit: ' Lux' }
  ];
  
  // Sắp xếp giảm dần theo số lần
  sensors.sort((a, b) => b.count - a.count);
  console.log('[updateViolationsTable] Cảm biến đã sắp xếp:', sensors);
  
  // Cập nhật bảng - sắp xếp lại các hàng theo số lần
  const tbody = select('violations-tbody');
  console.log('[updateViolationsTable] Tìm thấy phần tử tbody:', tbody);
  
  if (tbody) {
    // Xóa các hàng hiện có
    tbody.innerHTML = '';
    console.log('[updateViolationsTable] Đã xóa tbody, đang thêm hàng mới...');
    
    // Thêm các hàng đã sắp xếp
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
      console.log(`[updateViolationsTable] Đã thêm hàng cho ${sensor.name}: ${sensor.count} lần vi phạm`);
      
      // Tạo hiệu ứng cho số đếm
      const countElement = row.querySelector('.violation-count');
      if (countElement) {
        animateNumber(countElement, 0, sensor.count, 800);
      }
    });
    
    console.log('[updateViolationsTable] Đã thêm tất cả các hàng thành công');
  } else {
    console.error('[updateViolationsTable] LỖI: không tìm thấy phần tử violations-tbody!');
  }
}

// Cập nhật bảng hoạt động với chi tiết vi phạm - ĐÃ XÓA
// Bảng bây giờ chỉ hiển thị số đếm tĩnh

// Khởi tạo biểu đồ - ĐÃ XÓA
// Không còn cần thiết

// Cập nhật biểu đồ - ĐÃ XÓA
// Không còn cần thiết

// Tải và hiển thị thống kê
async function loadStatistics() {
  console.log('[loadStatistics] Bắt đầu tải thống kê...');
  
  const { violations } = await fetchStatistics('today');
  statisticsData = violations;
  
  console.log('[loadStatistics] Số lần hoạt động của thiết bị:', violations);
  updateSummaryCards(violations);
  
  // Lấy và cập nhật số lần vi phạm cảm biến
  console.log('[loadStatistics] Đang lấy số lần vi phạm cảm biến...');
  const sensorViolations = await fetchSensorViolations();
  console.log('[loadStatistics] Kết quả số lần vi phạm cảm biến:', sensorViolations);
  updateViolationsTable(sensorViolations);
  
  console.log('[loadStatistics] Đã tải tất cả thống kê thành công');
}

// Hiệu ứng trang
function initPageAnimations() {
  // Hiệu ứng cho thẻ tóm tắt
  gsap.from('.summary-card', {
    opacity: 0,
    y: 30,
    duration: 0.6,
    stagger: 0.1,
    ease: "power2.out"
  });

  // Hiệu ứng cho thẻ hoạt động
  gsap.from('.activity-card', {
    opacity: 0,
    y: 30,
    duration: 0.6,
    delay: 0.4,
    ease: "power2.out"
  });
}

// Thêm hiệu ứng di chuột
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

// Khởi tạo
window.addEventListener('DOMContentLoaded', async () => {
  loadSettings();
  
  // Hiển thị ngưỡng ban đầu trong bảng vi phạm
  if (select('threshold-temp-display')) {
    select('threshold-temp-display').textContent = settings.thresholds.temp;
  }
  if (select('threshold-hum-display')) {
    select('threshold-hum-display').textContent = settings.thresholds.hum;
  }
  if (select('threshold-light-display')) {
    select('threshold-light-display').textContent = settings.thresholds.light;
  }

  // Tải thống kê ban đầu
  await loadStatistics();
  
  // Hiệu ứng
  initPageAnimations();
  addHoverEffects();

  // Nút cài đặt
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

  // Đóng cài đặt
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

  // Lưu cài đặt
  const btnSave = select('settings-save');
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const oldThresholds = {...settings.thresholds};
      
      settings.thresholds.temp = Number(select('th-temp').value);
      settings.thresholds.hum = Number(select('th-hum').value);
      settings.thresholds.light = Number(select('th-light').value);
      
      console.log('[Cài đặt] Ngưỡng cũ:', oldThresholds);
      console.log('[Cài đặt] Ngưỡng mới:', settings.thresholds);
      
      saveSettings();
      
      // Hiển thị thông báo
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
      
      // Thêm hiệu ứng
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
      
      // Xóa thông báo sau 2 giây
      setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-in reverse';
        setTimeout(() => notification.remove(), 300);
      }, 2000);
      
      // Tải lại thống kê với ngưỡng mới
      console.log('[Cài đặt] Đang tải lại thống kê với ngưỡng mới...');
      await loadStatistics();
      
      closeModal();
    });
  }

  // Đóng modal khi nhấp vào nền
  const modal = select('settings-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Bộ chọn phạm vi thời gian - ĐÃ XÓA

  // Tự động làm mới sau mỗi 30 giây
  setInterval(async () => {
    await loadStatistics();
  }, 30000);
});