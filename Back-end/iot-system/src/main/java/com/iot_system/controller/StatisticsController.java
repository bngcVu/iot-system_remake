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
     * Get device action counts (ON actions only) for a specific date
     * GET /api/statistics/device-actions?date=07-11-2025
     * Response: { "light": 10, "fan": 5, "air": 3 }
     */
    @GetMapping("/device-actions")
    public DeviceActionsCountDTO getDeviceActionCounts(
            @RequestParam(name = "date") String dateStr) {
        return statisticsService.countDeviceActions(dateStr);
    }

    /**
     * Get sensor violations count for a specific date and thresholds
     * GET /api/statistics/violations?date=07-11-2025&temp=30&hum=80&light=800
     * Response: { "temp": 100, "hum": 50, "light": 200 }
     */
    @GetMapping("/violations")
    public SensorViolationsCountDTO getSensorViolationCounts(
            @RequestParam(name = "date") String dateStr,
            @RequestParam(name = "temp", defaultValue = "30") Double tempThreshold,
            @RequestParam(name = "hum", defaultValue = "80") Double humThreshold,
            @RequestParam(name = "light", defaultValue = "800") Double lightThreshold) {
        return statisticsService.countSensorViolations(dateStr, tempThreshold, humThreshold, lightThreshold);
    }
}
