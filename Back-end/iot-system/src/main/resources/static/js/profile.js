window.addEventListener('DOMContentLoaded',()=>{

  document.querySelectorAll('.thread-opener').forEach(input=>{
    input.addEventListener('click', ()=>{
      const url = input.value?.trim();
      if(!url) return;
      const w = 980, h = 700;
      const left = (window.screen.width - w) / 2;
      const top = (window.screen.height - h) / 2;
      window.open(url, '_blank', `width=${w},height=${h},left=${left},top=${top},noopener`);
    });
  });

  document.querySelectorAll('.thread-open-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const url = input?.value?.trim();
      if(!url) return;
      const w = 980, h = 700;
      const left = (window.screen.width - w) / 2;
      const top = (window.screen.height - h) / 2;
      window.open(url, '_blank', `width=${w},height=${h},left=${left},top=${top},noopener`);
    });
  });

  const genBtn = document.getElementById('generatePdfBtn');
  if (genBtn) {
    genBtn.addEventListener('click', () => {
    const btn = document.getElementById('generatePdfBtn');
    const originalText = btn.innerHTML;
    
    try {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo PDF...';
      btn.disabled = true;
      
      const profileData = {
        fullname: document.querySelector('[data-profile="fullname"]').value,
        studentId: document.querySelector('[data-profile="studentId"]').value,
        figmaLink: document.getElementById('figmaLink').value,
        githubLink: document.getElementById('githubLink').value
      };
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('BÁO CÁO DỰ ÁN IOT SYSTEM', 105, 30, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setFont(undefined, 'normal');
      doc.text('Thông tin sinh viên', 20, 50);
      
      doc.setFontSize(12);
      doc.text(`Họ và tên: ${profileData.fullname}`, 20, 65);
      doc.text(`Mã sinh viên: ${profileData.studentId}`, 20, 75);
      doc.text(`Lớp: D22HTTT05`, 20, 85);
      
      doc.setFontSize(16);
      doc.text('Thông tin dự án', 20, 105);
      
      doc.setFontSize(12);
      doc.text('Tên dự án: IoT System - Hệ thống giám sát thông minh', 20, 120);
      doc.text('Mô tả: Hệ thống giám sát và điều khiển thiết bị IoT qua giao diện web', 20, 130);
      doc.text('Công nghệ sử dụng:', 20, 145);
      doc.text('• Backend: Spring Boot, Java 21', 25, 155);
      doc.text('• Frontend: HTML, CSS, JavaScript', 25, 165);
      doc.text('• Database: MySQL', 25, 175);
      doc.text('• MQTT: Eclipse Paho', 25, 185);
      doc.text('• WebSocket: Real-time communication', 25, 195);
      
      doc.setFontSize(16);
      doc.text('Liên kết dự án', 20, 215);
      
      doc.setFontSize(12);
      doc.text(`GitHub: ${profileData.githubLink}`, 20, 230);
      doc.text(`Figma: ${profileData.figmaLink}`, 20, 240);
      
      doc.setFontSize(16);
      doc.text('Tính năng chính', 20, 260);
      
      doc.setFontSize(12);
      doc.text('• Giám sát dữ liệu cảm biến real-time', 25, 275);
      doc.text('• Điều khiển thiết bị từ xa', 25, 285);
      doc.text('• Lịch sử hoạt động và dữ liệu', 25, 295);
      doc.text('• Giao diện web responsive', 25, 305);
      doc.text('• API RESTful cho tích hợp', 25, 315);
      
      const currentDate = new Date().toLocaleDateString('vi-VN');
      doc.setFontSize(10);
      doc.text(`Ngày tạo: ${currentDate}`, 20, 280);
      
      doc.save(`BaoCao_IOT_${profileData.studentId}.pdf`);
      
      btn.innerHTML = '<i class="fa-solid fa-check"></i> PDF đã được tạo!';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      btn.innerHTML = '<i class="fa-solid fa-exclamation-triangle"></i> Lỗi tạo PDF';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);
    }
    });
  }

});


