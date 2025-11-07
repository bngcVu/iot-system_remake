package com.iot_system.repository;

import com.iot_system.domain.entity.DeviceActionHistory;
import com.iot_system.domain.enums.DeviceState;
import com.iot_system.domain.enums.DeviceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface DeviceActionHistoryRepository extends JpaRepository<DeviceActionHistory, Long> {

    @Query("""
           SELECT h FROM DeviceActionHistory h
           JOIN FETCH h.device d
           WHERE (:deviceName IS NULL OR LOWER(d.name) LIKE LOWER(CONCAT('%', :deviceName, '%')))
             AND (
                   :deviceType IS NULL
                OR :deviceType = com.iot_system.domain.enums.DeviceType.ALL
                OR d.type = :deviceType
             )
             AND (:action IS NULL OR h.action = :action)
             AND (:start IS NULL OR h.executedAt >= :start)
             AND (:end IS NULL OR h.executedAt < :end)
           """)
    Page<DeviceActionHistory> search(
            @Param("deviceName") String deviceName,
            @Param("deviceType") DeviceType deviceType,
            @Param("action") DeviceState action,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            Pageable pageable
    );


    Optional<DeviceActionHistory> findTopByDevice_IdOrderByExecutedAtDesc(Long deviceId);
}
