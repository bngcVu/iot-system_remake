package com.iot_system.mqtt;

import org.springframework.context.ApplicationEvent;

public class DeviceStatusEvent extends ApplicationEvent {
    private final String topic;
    private final String message;

    public DeviceStatusEvent(Object source, String topic, String message) {
        super(source);
        this.topic = topic;
        this.message = message;
    }

    public String getTopic() {
        return topic;
    }

    public String getMessage() {
        return message;
    }
}
