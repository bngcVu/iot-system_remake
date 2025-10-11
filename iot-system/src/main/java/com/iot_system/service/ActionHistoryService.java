package com.iot_system.service;

import com.iot_system.domain.dto.ActionHistoryDTO;
import com.iot_system.domain.dto.PagedResponse;
import com.iot_system.domain.entity.DeviceActionHistory;
import com.iot_system.domain.enums.DeviceState;
import com.iot_system.domain.enums.DeviceType;
import com.iot_system.repository.DeviceActionHistoryRepository;
import com.iot_system.repository.DeviceRepository;
import com.iot_system.util.DateTimeUtils;
import com.iot_system.exception.InvalidDateFormatException;
import com.iot_system.util.ResponseUtils;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ActionHistoryService {


    private final DeviceActionHistoryRepository historyRepo;
    private final DeviceRepository deviceRepo;

    public ActionHistoryService(DeviceActionHistoryRepository historyRepo, DeviceRepository deviceRepo) {
        this.historyRepo = historyRepo;
        this.deviceRepo = deviceRepo;
    }

    @Transactional
    public void logAction(Long deviceId, DeviceState action) {
        var device = deviceRepo.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Thiết bị không tồn tại"));

        DeviceActionHistory history = new DeviceActionHistory();
        history.setDevice(device);
        history.setAction(action);

        historyRepo.save(history);
    }

    /**
     * Tìm kiếm lịch sử hoạt động theo ngày/giờ với nhiều định dạng, có phân trang
     * Hỗ trợ: dd-MM-yyyy HH:mm:ss, dd-MM-yyyy HH:mm, dd-MM-yyyy, ddMMyyyy, dd/MM/yyyy, ddMMyy
     */
    public PagedResponse<ActionHistoryDTO> search(String dateStr, DeviceType deviceType, DeviceState action,
                                                  int page, int size, String sort) {
        LocalDateTime start = null;
        LocalDateTime end = null;
        String searchMessage = "";

    // Xử lý tìm kiếm theo một chuỗi ngày/giờ (dateStr)
        if (dateStr != null && !dateStr.isBlank()) {
            DateTimeUtils.DateTimeParseResult parseResult = DateTimeUtils.parseDateTime(dateStr);
            
            if (parseResult != null) {
                if (parseResult.isExactMatch()) {
                    // Tìm kiếm chính xác theo giây
                    start = parseResult.getStart();
                    end = parseResult.getEnd();
                    searchMessage = "Tìm thấy kết quả chính xác cho " + dateStr;
                } else {
                    // Tìm kiếm theo phút (trong khoảng 1 phút) hoặc theo ngày
                    start = parseResult.getStart();
                    end = parseResult.getEnd();
                    searchMessage = "Tìm thấy kết quả trong khoảng thời gian " + dateStr;
                }
            } else {
                throw new InvalidDateFormatException("Hỗ trợ: dd-MM-yyyy HH:mm:ss, dd-MM-yyyy HH:mm, dd-MM-yyyy, ddMMyyyy, dd/MM/yyyy, ddMMyy");
            }
        }

        Pageable pageable = PageRequest.of(page, size,
                ("asc".equalsIgnoreCase(sort))
                        ? org.springframework.data.domain.Sort.by("executedAt").ascending()
                        : org.springframework.data.domain.Sort.by("executedAt").descending()
        );
        
    // Không lọc theo tên thiết bị (đồng bộ với Controller); truyền null để bỏ qua điều kiện này
    Page<DeviceActionHistory> historyPage = historyRepo.search(null, deviceType, action, start, end, pageable);

        int startIndex = page * size;
        return ResponseUtils.mapToPagedResponse(historyPage, page, size,
                (start != null)
                        ? searchMessage + " (" + historyPage.getContent().size() + " kết quả)"
                        : "Tìm thấy " + historyPage.getContent().size() + " kết quả.",
                history -> {
                    int index = historyPage.getContent().indexOf(history);
                    return ActionHistoryDTO.from(history, startIndex + index + 1);
                },
                "Không tìm thấy lịch sử hoạt động.");
    }


}