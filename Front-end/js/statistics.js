// Module hóa cấu hình và API
import { ENDPOINTS } from './config.js';

// Load settings from localStorage
const settings = {
  thresholds: {
    temp: 30,
    hum: 80,
    light: 800,
    dust: 100
  }
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
  } catch {}
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
    light: toNum(t.light, 800),
    dust: toNum(t.dust, 100)
  };
}

// State
let chartInstance = null;
let statisticsData = {
  temp: 0,
  hum: 0,
  light: 0,
  dust: 0
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

// Fetch sensor data and calculate threshold violations
async function fetchStatistics(timeRange = '7d') {
  try {
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch(timeRange) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
    }

    const formatDate = (date) => {
      const pad = (n) => n < 10 ? '0' + n : n;
      return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    // Fetch all sensor data within time range
    const response = await fetch(`${ENDPOINTS.SENSORS}?page=0&size=10000&sort=asc&start=${formatDate(startDate)}&end=${formatDate(now)}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch sensor data');
    }

    const result = await response.json();
    const data = result.data || [];

    // Count threshold violations
    const violations = {
      temp: 0,
      hum: 0,
      light: 0,
      dust: 0
    };

    data.forEach(record => {
      if (record.temperature > settings.thresholds.temp) {
        violations.temp++;
      }
      if (record.humidity > settings.thresholds.hum) {
        violations.hum++;
      }
      if (record.light > settings.thresholds.light) {
        violations.light++;
      }
      if (record.dust && record.dust > settings.thresholds.dust) {
        violations.dust++;
      }
    });

    return violations;
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return { temp: 0, hum: 0, light: 0, dust: 0 };
  }
}

// Update summary cards
function updateSummaryCards(data) {
  const cards = [
    { id: 'total-temp', value: data.temp, threshold: 'threshold-temp', thresholdValue: settings.thresholds.temp, unit: '°C' },
    { id: 'total-hum', value: data.hum, threshold: 'threshold-hum', thresholdValue: settings.thresholds.hum, unit: '%' },
    { id: 'total-light', value: data.light, threshold: 'threshold-light', thresholdValue: settings.thresholds.light, unit: ' Lux' },
    { id: 'total-dust', value: data.dust, threshold: 'threshold-dust', thresholdValue: settings.thresholds.dust, unit: ' µg/m³' }
  ];

  cards.forEach(card => {
    const element = select(card.id);
    const thresholdElement = select(card.threshold);
    
    if (element) {
      const currentValue = parseInt(element.textContent) || 0;
      animateNumber(element, currentValue, card.value, 800);
    }
    
    if (thresholdElement) {
      thresholdElement.textContent = card.thresholdValue + card.unit;
    }
  });
}

// Sort and update rankings
function updateRankings(data) {
  const sensors = [
    { 
      name: 'Nhiệt độ', 
      value: data.temp, 
      threshold: settings.thresholds.temp + '°C',
      icon: 'temp-icon'
    },
    { 
      name: 'Độ ẩm', 
      value: data.hum, 
      threshold: settings.thresholds.hum + '%',
      icon: 'hum-icon'
    },
    { 
      name: 'Ánh sáng', 
      value: data.light, 
      threshold: settings.thresholds.light + ' Lux',
      icon: 'light-icon'
    },
    { 
      name: 'Độ bụi', 
      value: data.dust, 
      threshold: settings.thresholds.dust + ' µg/m³',
      icon: 'dust-icon'
    }
  ];

  // Sort descending by value
  sensors.sort((a, b) => b.value - a.value);

  // Update rankings with animation
  sensors.forEach((sensor, index) => {
    const rank = index + 1;
    const nameEl = select(`rank${rank}-name`);
    const countEl = select(`rank${rank}-count`);
    const thresholdEl = select(`rank${rank}-threshold`);
    const rankItem = document.querySelector(`.ranking-item[data-rank="${rank}"]`);

    if (nameEl) nameEl.textContent = sensor.name;
    if (thresholdEl) thresholdEl.textContent = sensor.threshold;
    
    if (countEl) {
      const currentValue = parseInt(countEl.textContent) || 0;
      animateNumber(countEl, currentValue, sensor.value, 1000);
    }

    // Update icon
    if (rankItem) {
      const iconContainer = rankItem.querySelector('.rank-icon');
      if (iconContainer) {
        // Remove all icon classes
        iconContainer.classList.remove('temp-icon', 'hum-icon', 'light-icon', 'dust-icon');
        // Add correct icon class
        iconContainer.classList.add(sensor.icon);
      }
    }
  });

  // Animate ranking items
  document.querySelectorAll('.ranking-item').forEach((item, index) => {
    gsap.fromTo(item, 
      { opacity: 0, x: -30 },
      { 
        opacity: 1, 
        x: 0, 
        duration: 0.5, 
        delay: index * 0.1,
        ease: "power2.out" 
      }
    );
  });
}

// Initialize chart
function initChart(data) {
  const ctx = document.getElementById('statistics-chart');
  if (!ctx) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Nhiệt độ', 'Độ ẩm', 'Ánh sáng', 'Độ bụi'],
      datasets: [{
        label: 'Số lượt vượt ngưỡng',
        data: [data.temp, data.hum, data.light, data.dust],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(6, 182, 212, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(168, 85, 247, 0.8)'
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(6, 182, 212, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(168, 85, 247, 1)'
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              return ' ' + context.parsed.y + ' lượt vượt ngưỡng';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            font: {
              size: 12
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          ticks: {
            font: {
              size: 12,
              weight: '500'
            }
          },
          grid: {
            display: false
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      }
    }
  });
}

// Update chart
function updateChart(data) {
  if (!chartInstance) {
    initChart(data);
    return;
  }

  chartInstance.data.datasets[0].data = [data.temp, data.hum, data.light, data.dust];
  chartInstance.update('active');
}

// Load and display statistics
async function loadStatistics(timeRange = '7d') {
  const data = await fetchStatistics(timeRange);
  statisticsData = data;
  
  updateSummaryCards(data);
  updateRankings(data);
  updateChart(data);
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

  // Animate chart
  gsap.from('.chart-card', {
    opacity: 0,
    scale: 0.95,
    duration: 0.7,
    delay: 0.4,
    ease: "back.out(1.7)"
  });

  // Animate rankings card
  gsap.from('.rankings-card', {
    opacity: 0,
    y: 30,
    duration: 0.6,
    delay: 0.6,
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
  
  // Display thresholds
  select('threshold-temp').textContent = settings.thresholds.temp + '°C';
  select('threshold-hum').textContent = settings.thresholds.hum + '%';
  select('threshold-light').textContent = settings.thresholds.light + ' Lux';
  select('threshold-dust').textContent = settings.thresholds.dust + ' µg/m³';

  // Load initial statistics
  await loadStatistics('7d');
  
  // Initialize chart
  initChart(statisticsData);
  
  // Animations
  initPageAnimations();
  addHoverEffects();

  // Time range selector
  const timeRangeSelect = select('time-range');
  if (timeRangeSelect) {
    timeRangeSelect.addEventListener('change', async (e) => {
      await loadStatistics(e.target.value);
    });
  }

  // Auto refresh every 30 seconds
  setInterval(async () => {
    const currentRange = timeRangeSelect ? timeRangeSelect.value : '7d';
    await loadStatistics(currentRange);
  }, 30000);
});
