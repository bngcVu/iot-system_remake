package com.iot_system.domain.dto;

import com.iot_system.domain.enums.DeviceState;

import jakarta.validation.constraints.NotNull;

public record DeviceControlDTO(
    @NotNull
    Long deviceId,

    @NotNull
    DeviceState action
) {}
