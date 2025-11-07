package com.iot_system.mqtt;

import org.eclipse.paho.client.mqttv3.MqttClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.annotation.PostConstruct;

@Component
public class CommandSubscriber {

    private final MqttClient mqttClient;
    private final ApplicationEventPublisher eventPublisher;
    private static final Logger log = LoggerFactory.getLogger(CommandSubscriber.class);

    @Value("${mqtt.telemetryTopic}")
    private String sensorTopic;

    @Value("${mqtt.actionTopic}")
    private String actionTopic;

    public CommandSubscriber(MqttClient mqttClient, ApplicationEventPublisher eventPublisher) {
        this.mqttClient = mqttClient;
        this.eventPublisher = eventPublisher;
    }

    @PostConstruct
    public void init() {
        try {
            mqttClient.subscribe(actionTopic + "_ack", (topic, message) -> {
                String payload = new String(message.getPayload());
                eventPublisher.publishEvent(new DeviceStatusEvent(this, topic, payload));
            });

            mqttClient.subscribe(sensorTopic, (topic, message) -> {
                String payload = new String(message.getPayload());
                eventPublisher.publishEvent(new DeviceStatusEvent(this, topic, payload));
            });

            log.info("[MQTT] Đã subscribe tới: {} và {}", actionTopic + "_ack", sensorTopic);
        } catch (Exception e) {
            log.error("[MQTT] Lỗi subscribe", e);
        }
    }
}
