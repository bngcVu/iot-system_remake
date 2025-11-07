package com.iot_system.repository;

import com.iot_system.domain.entity.SensorData;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface SensorDataRepository extends JpaRepository<SensorData, Long>, JpaSpecificationExecutor<SensorData> {

    @Query("""
           SELECT s FROM SensorData s
           WHERE (:start IS NULL OR s.recordedAt >= :start)
             AND (:end IS NULL OR s.recordedAt < :end)
             AND (
                   :metricName = 'ALL'
                OR (:metricName = 'TEMP' AND s.temperature IS NOT NULL)
                OR (:metricName = 'HUMIDITY' AND s.humidity IS NOT NULL)
                OR (:metricName = 'LIGHT' AND s.light IS NOT NULL)
             )
           """)
    Page<SensorData> search(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("metricName") String metricName,
            Pageable pageable
    );

  
    Optional<SensorData> findTopByDevice_IdOrderByRecordedAtDesc(Long deviceId);

}

