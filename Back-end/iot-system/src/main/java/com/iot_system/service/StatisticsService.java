package com.iot_system.service;

import com.iot_system.domain.dto.DeviceActionsCountDTO;
import com.iot_system.domain.dto.SensorViolationsCountDTO;
import com.iot_system.repository.DeviceActionHistoryRepository;
import com.iot_system.repository.SensorDataRepository;
import org.springframework.stereotype.Service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class StatisticsService {

    private final EntityManager entityManager;
    private final DeviceActionHistoryRepository actionHistoryRepository;
    private final SensorDataRepository sensorDataRepository;

    public StatisticsService(EntityManager entityManager,
                           DeviceActionHistoryRepository actionHistoryRepository,
                           SensorDataRepository sensorDataRepository) {
        this.entityManager = entityManager;
        this.actionHistoryRepository = actionHistoryRepository;
        this.sensorDataRepository = sensorDataRepository;
    }

    /**
    * Đếm số lần bật thiết bị trong một ngày cụ thể
    * Trả về số lượng được nhóm theo tên thiết bị (LIGHT, FAN, AIR)
    */

    public DeviceActionsCountDTO countDeviceActions(String dateStr) {
        LocalDate date = parseDate(dateStr);
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

        String sql = """
            SELECT d.name, COUNT(*) as cnt
            FROM device_action_history h
            JOIN device d ON h.device_id = d.id
            WHERE h.executed_at >= :start 
              AND h.executed_at < :end
              AND h.action = 'ON'
            GROUP BY d.name
            """;

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("start", startOfDay);
        query.setParameter("end", endOfDay);

        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();

        int light = 0, fan = 0, air = 0;
        for (Object[] row : results) {
            String deviceName = (String) row[0];
            int count = ((Number) row[1]).intValue();
            
            if ("LIGHT".equalsIgnoreCase(deviceName)) {
                light = count;
            } else if ("FAN".equalsIgnoreCase(deviceName)) {
                fan = count;
            } else if ("AIR".equalsIgnoreCase(deviceName)) {
                air = count;
            }
        }

        return new DeviceActionsCountDTO(light, fan, air);
    }

    /**
     * Đến số lần vi phạm của cảm biến cho một ngày và ngưỡng cụ thể
     */
    public SensorViolationsCountDTO countSensorViolations(String dateStr, 
                                                         Double tempThreshold,
                                                         Double humThreshold,
                                                         Double lightThreshold) {
        LocalDate date = parseDate(dateStr);
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

        // Đếm số lần vượt ngưỡng nhiệt độ
        String tempSql = """
            SELECT COUNT(*) FROM sensor_data
            WHERE recorded_at >= :start 
              AND recorded_at < :end
              AND temperature > :threshold
            """;
        Query tempQuery = entityManager.createNativeQuery(tempSql);
        tempQuery.setParameter("start", startOfDay);
        tempQuery.setParameter("end", endOfDay);
        tempQuery.setParameter("threshold", tempThreshold);
        int tempCount = ((Number) tempQuery.getSingleResult()).intValue();

        // Đếm số lần vượt ngưỡng độ ẩm
        String humSql = """
            SELECT COUNT(*) FROM sensor_data
            WHERE recorded_at >= :start 
              AND recorded_at < :end
              AND humidity > :threshold
            """;
        Query humQuery = entityManager.createNativeQuery(humSql);
        humQuery.setParameter("start", startOfDay);
        humQuery.setParameter("end", endOfDay);
        humQuery.setParameter("threshold", humThreshold);
        int humCount = ((Number) humQuery.getSingleResult()).intValue();

        // Đếm số lần vượt ngưỡng ánh sáng
        String lightSql = """
            SELECT COUNT(*) FROM sensor_data
            WHERE recorded_at >= :start 
              AND recorded_at < :end
              AND light > :threshold
            """;
        Query lightQuery = entityManager.createNativeQuery(lightSql);
        lightQuery.setParameter("start", startOfDay);
        lightQuery.setParameter("end", endOfDay);
        lightQuery.setParameter("threshold", lightThreshold);
        int lightCount = ((Number) lightQuery.getSingleResult()).intValue();

        return new SensorViolationsCountDTO(tempCount, humCount, lightCount);
    }

    /**
     * Phân tích chuỗi ngày theo định dạng dd-MM-yyyy
     */
    private LocalDate parseDate(String dateStr) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy");
        return LocalDate.parse(dateStr, formatter);
    }
}
