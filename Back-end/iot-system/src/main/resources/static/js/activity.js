import { fetchActionsPage } from './api/actions.js';
import { downloadCsvFromRows, sanitizeCsvField } from './utils/csv.js';

class ActivityManager {
    constructor() {
        this.currentPage = 0;
        this.pageSize = 15;
        this.totalPages = 0;
        this.totalElements = 0;
        this.currentData = [];
        this.isLoading = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadData();
    }

    initializeElements() {
        this.searchInput = document.getElementById('searchInput');
        this.sortSelect = document.getElementById('sortSelect');
        this.actionFilter = document.getElementById('actionFilter');
        this.deviceFilter = document.getElementById('deviceFilter');
        this.searchBtn = document.getElementById('searchBtn');
        this.pageSizeSelect = document.getElementById('pageSizeSelect');
        this.table = document.getElementById('activityDataTable');
        this.tbody = this.table.querySelector('tbody');
        this.recordCount = document.getElementById('recordCount');
        
        // Bottom pagination controls
        this.prevPageBtn = document.getElementById('prevPageBottom');
        this.nextPageBtn = document.getElementById('nextPageBottom');
        this.pageNumbers = document.getElementById('pageNumbersBottom');
        this.toast = document.getElementById('toast');
        this.csvBtn = document.getElementById('btn-export-csv-activity');
        this.refreshBtn = document.getElementById('refreshActivityBtn');
    }

    bindEvents() {
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        
        this.sortSelect.addEventListener('change', () => this.handleSearch());
        this.actionFilter.addEventListener('change', () => this.handleSearch());
        this.deviceFilter.addEventListener('change', () => this.handleSearch());
        this.pageSizeSelect.addEventListener('change', () => this.handlePageSizeChange());
        
        this.prevPageBtn.addEventListener('click', () => this.goToPreviousPage());
        this.nextPageBtn.addEventListener('click', () => this.goToNextPage());
        
        if (this.csvBtn) {
            this.csvBtn.addEventListener('click', () => this.exportCSV());
        }
        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Shift+Click chỉ làm mới dữ liệu bảng
                if (e.shiftKey) {
                    this.currentPage = 0;
                    this.loadData();
                    this.showToast && this.showToast('Đã làm mới dữ liệu');
                    return;
                }
                try {
                    const url = new URL(window.location.href);
                    url.searchParams.set('r', Date.now());
                    window.location.href = url.pathname + '?' + url.searchParams.toString();
                } catch (err) {
                    window.location.reload();
                }
            });
        }
        
    }

    async loadData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            const data = await fetchActionsPage({
                page: this.currentPage,
                size: this.pageSize,
                sort: this.sortSelect.value,
                dateStr: this.searchInput.value.trim(),
                deviceType: this.deviceFilter.value,
                action: this.actionFilter.value
            });
            if (data && typeof data.message === 'string' && data.message.toLowerCase().includes('sai định dạng')) {
                this.currentData = [];
                this.totalElements = 0;
                this.totalPages = 0;
                this.renderInvalidFormatMessage();
                this.updatePaginationInfo();
                this.updatePaginationButtons();
                this.showToast('Không có dữ liệu. Vui lòng nhập đúng định dạng', 'warning');
                return;
            }
            this.handleDataResponse(data);
            
        } catch (error) {
            console.error('Error loading activity data:', error);
            this.showToast('Lỗi khi tải dữ liệu: ' + error.message, 'error');
            this.renderEmptyTable();
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    handleDataResponse(data) {
        const nextData = Array.isArray(data.data) ? data.data : [];
        const isSame = this.isSameData(this.currentData, nextData);
        this.currentData = nextData;
        this.totalElements = data.totalElements || 0;
        this.totalPages = data.totalPages || 0;
        this.updatePaginationInfo();
        if (!isSame) this.renderTable();
        this.updatePaginationButtons();
    }

    isSameData(prev, next) {
        if (!Array.isArray(prev) || !Array.isArray(next)) return false;
        if (prev.length !== next.length) return false;
        for (let i = 0; i < next.length; i++) {
            const a = prev[i] || {};
            const b = next[i] || {};
            if (a.deviceName !== b.deviceName) return false;
            if (a.action !== b.action) return false;
            if (a.executedAt !== b.executedAt) return false;
        }
        return true;
    }

    renderTable() {
        if (this.currentData.length === 0) {
            this.renderEmptyTable();
            return;
        }

        const frag = document.createDocumentFragment();
        for (let i = 0; i < this.currentData.length; i++) {
            frag.appendChild(this.createTableRow(this.currentData[i], i));
        }
        this.tbody.replaceChildren(frag);
    }

    

    createTableRow(item, index) {
        const row = document.createElement('tr');
        row.className = 'activity-row';
        
        const stt = this.currentPage * this.pageSize + index + 1;
        const actionClass = this.getActionClass(item.action);
        const actionText = this.getActionText(item.action);
        const formattedTime = this.formatDateTime(item.executedAt);
        
        row.innerHTML = `
            <td>${stt}</td>
            <td>
                <div class="device-name">${item.deviceName}</div>
            </td>
            <td>
                <span class="action-badge ${actionClass}">${actionText}</span>
            </td>
            <td>
                <div class="time-info">
                    <div class="time-main">${formattedTime}</div>
                </div>
            </td>
        `;
        
        return row;
    }

    getDeviceIcon(deviceName) {
        const icons = {
            'LIGHT': '💡',
            'FAN': '🌀',
            'AIR': '❄️'
        };
        return icons[deviceName] || '📱';
    }

    getActionClass(action) {
        const classes = {
            'ON': 'action-on',
            'OFF': 'action-off'
        };
        return classes[action] || 'action-unknown';
    }

    getActionText(action) {
        const texts = {
            'ON': 'BẬT',
            'OFF': 'TẮT'
        };
        return texts[action] || action;
    }

    formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return '--:--:--';
        
        try {
            // Handle dd-MM-yyyy HH:mm:ss format from backend (expected format)
            if (typeof dateTimeStr === 'string' && dateTimeStr.includes('-')) {
                const parts = dateTimeStr.split(' ');
                if (parts.length === 2) {
                    const datePart = parts[0].split('-');
                    const timePart = parts[1].split(':');
                    
                    if (datePart.length === 3 && timePart.length === 3) {
                        // Create date: year-month-day hour:minute:second
                        const year = datePart[2];
                        const month = datePart[1];
                        const day = datePart[0];
                        const hour = timePart[0];
                        const minute = timePart[1];
                        const second = timePart[2];
                        
                        const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
                        const date = new Date(isoString);
                        if (!isNaN(date.getTime())) {
                            const formatted = `${day}-${month}-${year} ${hour}:${minute}:${second}`;
                            return formatted;
                        }
                    }
                }
            }
            
            // Handle HH:mm:ss dd/MM/yyyy format (if backend returns this format)
            if (typeof dateTimeStr === 'string' && dateTimeStr.includes('/')) {
                const parts = dateTimeStr.split(' ');
                if (parts.length === 2) {
                    const timePart = parts[0].split(':');
                    const datePart = parts[1].split('/');
                    
                    if (timePart.length === 3 && datePart.length === 3) {
                        const year = datePart[2];
                        const month = datePart[1];
                        const day = datePart[0];
                        const hour = timePart[0];
                        const minute = timePart[1];
                        const second = timePart[2];
                        
                        const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
                        const date = new Date(isoString);
                        
                        if (!isNaN(date.getTime())) {
                            // Convert to dd-MM-yyyy HH:mm:ss format
                            return `${day}-${month}-${year} ${hour}:${minute}:${second}`;
                        }
                    }
                }
            }
            
            // Fallback to standard Date parsing
            const date = new Date(dateTimeStr);
            
            if (!isNaN(date.getTime())) {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const hour = String(date.getHours()).padStart(2, '0');
                const minute = String(date.getMinutes()).padStart(2, '0');
                const second = String(date.getSeconds()).padStart(2, '0');
                
                const formatted = `${day}-${month}-${year} ${hour}:${minute}:${second}`;
                return formatted;
            }
            
            return dateTimeStr;
        } catch (error) {
            console.error('Error formatting date:', dateTimeStr, error);
            return dateTimeStr;
        }
    }

    renderEmptyTable() {
        this.tbody.innerHTML = `
            <tr>
                <td colspan="4" class="no-data">
                    <div style="text-align: center; padding: 2rem;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                        <div>Không có dữ liệu lịch sử hoạt động</div>
                        <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.5rem;">
                            Thử thay đổi bộ lọc hoặc tìm kiếm
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    renderInvalidFormatMessage() {
        this.tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 2rem; color: #6b7280;">
                    <div style="display: inline-flex; flex-direction: column; align-items: center; gap: 0.6rem;">
                        <div style="font-size: 1.4rem;">⚠️</div>
                        <div>Không có dữ liệu. Vui lòng nhập đúng định dạng</div>
                    </div>
                </td>
            </tr>
        `;
    }

    updatePaginationInfo() {
        const start = this.currentPage * this.pageSize + 1;
        const end = Math.min(start + this.currentData.length - 1, this.totalElements);
        this.recordCount.textContent = `Hiển thị ${start}-${end} trong ${this.totalElements} bản ghi (trang ${this.currentPage + 1}/${this.totalPages})`;
    }

    updatePaginationButtons() {
        this.prevPageBtn.disabled = this.currentPage === 0;
        this.nextPageBtn.disabled = this.currentPage >= this.totalPages - 1;
        
        this.renderPageNumbers();
    }

    exportCSV() {
        try {
            const rows = [];
            rows.push('stt,deviceName,action,executedAt');
            const trs = Array.from(this.tbody ? this.tbody.querySelectorAll('tr') : []);
            if (trs.length > 0) {
                trs.forEach(r => {
                    const c = r.cells;
                    if (c && c.length >= 4) {
                        const stt = sanitizeCsvField((c[0].innerText || '').trim());
                        const name = sanitizeCsvField((c[1].innerText || '').trim());
                        const action = sanitizeCsvField((c[2].innerText || '').trim());
                        const ts = sanitizeCsvField((c[3].innerText || '').trim());
                        rows.push(`${stt},${name},${action},${ts}`);
                    }
                });
            } else if (Array.isArray(this.currentData) && this.currentData.length > 0) {
                this.currentData.forEach((item, idx) => {
                    const stt = this.currentPage * this.pageSize + idx + 1;
                    rows.push([
                        sanitizeCsvField(stt),
                        sanitizeCsvField(item.deviceName || ''),
                        sanitizeCsvField(this.getActionText(item.action) || ''),
                        sanitizeCsvField(this.formatDateTime(item.executedAt))
                    ].join(','));
                });
            } else {
                this.showToast('Không có dữ liệu để xuất', 'warning');
                return;
            }
            downloadCsvFromRows(rows, `activity-history-${Date.now()}.csv`);
        } catch (e) {
            console.error('Export CSV error', e);
            this.showToast('Xuất CSV thất bại', 'error');
        }
    }

    renderPageNumbers() {
        this.pageNumbers.innerHTML = '';
        
        const maxVisiblePages = 5;
        let startPage = Math.max(0, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages - 1, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(0, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i + 1;
            pageBtn.addEventListener('click', () => this.goToPage(i));
            
            this.pageNumbers.appendChild(pageBtn);
        }
    }

    goToPage(page) {
        if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
            this.currentPage = page;
            this.loadData();
        }
    }

    goToPreviousPage() {
        if (this.currentPage > 0) {
            this.goToPage(this.currentPage - 1);
        }
    }

    goToNextPage() {
        if (this.currentPage < this.totalPages - 1) {
            this.goToPage(this.currentPage + 1);
        }
    }

    handleSearch() {
        this.currentPage = 0;
        this.loadData();
    }

    handlePageSizeChange() {
        this.pageSize = parseInt(this.pageSizeSelect.value);
        this.currentPage = 0;
        this.loadData();
    }

    showLoading() {}

    hideLoading() {}

    showToast(message, type = 'info') {}
}

document.addEventListener('DOMContentLoaded', () => {
    new ActivityManager();
});
