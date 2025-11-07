package com.iot_system.domain.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.iot_system.domain.entity.DeviceActionHistory;
import com.iot_system.domain.enums.DeviceState;

public class ActionHistoryDTO {
    private int stt;
    private Long id;
    private String deviceName;
    private DeviceState action;
    @JsonFormat(pattern = "dd-MM-yyyy HH:mm:ss", timezone = "Asia/Ho_Chi_Minh")
    private LocalDateTime executedAt;

    public ActionHistoryDTO(int stt, Long id, String deviceName, DeviceState action, LocalDateTime executedAt) {
        this.stt = stt;
        this.id = id;
        this.deviceName = deviceName;
        this.action = action;
        this.executedAt = executedAt;
    }

    public static ActionHistoryDTO from(DeviceActionHistory e, int stt) {
        return new ActionHistoryDTO(
                stt,
                e.getId(),
                e.getDevice().getName(),
                e.getAction(),
                e.getExecutedAt()
        );
    }

    public int getStt() {
        return stt;
    }

    public void setStt(int stt) {
        this.stt = stt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDeviceName() {
        return deviceName;
    }

    public void setDeviceName(String deviceName) {
        this.deviceName = deviceName;
    }

    public DeviceState getAction() {
        return action;
    }

    public void setAction(DeviceState action) {
        this.action = action;
    }

    public LocalDateTime getExecutedAt() {
        return executedAt;
    }

    public void setExecutedAt(LocalDateTime executedAt) {
        this.executedAt = executedAt;
    }

    
}