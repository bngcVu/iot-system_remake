package com.iot_system.controller;

import com.iot_system.domain.dto.PagedResponse;
import com.iot_system.domain.dto.SensorReadingDTO;
import com.iot_system.domain.enums.SensorMetric;
import com.iot_system.service.SensorDataService;
 
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sensor-data")
public class SensorDataController {

    private final SensorDataService sensorDataService;

    public SensorDataController(SensorDataService sensorDataService) {
        this.sensorDataService = sensorDataService;
    }

    @GetMapping
    public PagedResponse<SensorReadingDTO> search(
            @RequestParam(name = "dateStr", required = false) String dateStr,
            @RequestParam(name = "date", required = false) String dateAlias,
            @RequestParam(defaultValue = "ALL") SensorMetric metric,
            @RequestParam(required = false) String valueOp,
            @RequestParam(required = false) Double value,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "desc") String sort
    ) {
    String dateQuery = (dateStr != null && !dateStr.isBlank()) ? dateStr :
        ((dateAlias != null && !dateAlias.isBlank()) ? dateAlias : null);

        // Nếu truyền valueOp (không rỗng) => vào luồng tìm theo giá trị
        if (valueOp != null && !valueOp.isBlank()) {
            return sensorDataService.searchByValue(dateQuery, metric, valueOp, value, page, size, sort);
        }

        // Không có valueOp: nếu có ngày => tìm theo thời gian; nếu không => trả tất cả (có thể lọc metric)
        if (dateQuery == null || dateQuery.trim().isEmpty()) {
            return sensorDataService.getAllData(metric, page, size, sort);
        }
        return sensorDataService.search(dateQuery, metric, page, size, sort);
    }
}
