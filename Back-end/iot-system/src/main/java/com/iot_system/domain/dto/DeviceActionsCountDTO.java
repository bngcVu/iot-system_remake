package com.iot_system.domain.dto;

public class DeviceActionsCountDTO {
    private int light;
    private int fan;
    private int air;

    public DeviceActionsCountDTO() {}

    public DeviceActionsCountDTO(int light, int fan, int air) {
        this.light = light;
        this.fan = fan;
        this.air = air;
    }

    public int getLight() {
        return light;
    }

    public void setLight(int light) {
        this.light = light;
    }

    public int getFan() {
        return fan;
    }

    public void setFan(int fan) {
        this.fan = fan;
    }

    public int getAir() {
        return air;
    }

    public void setAir(int air) {
        this.air = air;
    }
}
