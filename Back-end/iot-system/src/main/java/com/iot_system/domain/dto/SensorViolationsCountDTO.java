package com.iot_system.domain.dto;

public class SensorViolationsCountDTO {
    private int temp;
    private int hum;
    private int light;

    public SensorViolationsCountDTO() {}

    public SensorViolationsCountDTO(int temp, int hum, int light) {
        this.temp = temp;
        this.hum = hum;
        this.light = light;
    }

    public int getTemp() {
        return temp;
    }

    public void setTemp(int temp) {
        this.temp = temp;
    }

    public int getHum() {
        return hum;
    }

    public void setHum(int hum) {
        this.hum = hum;
    }

    public int getLight() {
        return light;
    }

    public void setLight(int light) {
        this.light = light;
    }
}
