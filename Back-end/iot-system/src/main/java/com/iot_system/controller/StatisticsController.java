package com.iot_system.controller;

import com.iot_system.domain.dto.DeviceActionsCountDTO;
import com.iot_system.domain.dto.SensorViolationsCountDTO;
import com.iot_system.service.StatisticsService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/statistics")
public class StatisticsController {

    private final StatisticsService statisticsService;

    public StatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    /**
     * Chỉ hành động BẬT
     * GET /api/statistics/device-actions?date=07-11-2025
     */
    @GetMapping("/device-actions")
    public DeviceActionsCountDTO getDeviceActionCounts(
            @RequestParam(name = "date") String dateStr) {
        return statisticsService.countDeviceActions(dateStr);
    }

    /**
     * Lấy số lần vi phạm của cảm biến cho một ngày và ngưỡng cụ thể
     * GET /api/statistics/violations?date=07-11-2025&temp=30&hum=80&light=800
     * Phản hồi: { "temp": 100, "hum": 50, "light": 200 }
     */
    @GetMapping("/violations")
    public SensorViolationsCountDTO getSensorViolationCounts(
            @RequestParam(name = "date") String dateStr,
            @RequestParam(name = "temp", required = true) Double tempThreshold,
            @RequestParam(name = "hum", required = true) Double humThreshold,
            @RequestParam(name = "light", required = true) Double lightThreshold) {
        return statisticsService
            .countSensorViolations(dateStr, tempThreshold, humThreshold, lightThreshold);
    }

    // lay
}
