package com.iot_system.domain.dto;

import java.time.LocalDateTime;

import com.iot_system.domain.enums.DeviceState;
import com.iot_system.domain.enums.DeviceType;

public record DeviceStatusDTO(
    Long id, 
    String name, 
    String deviceUid,
    DeviceType type,
    DeviceState state,
    LocalDateTime lastSeenAt
) {}
