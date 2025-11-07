package com.iot_system.mqtt;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

@Service
public class CommandPublisher {

    private final MqttClient mqttClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final Logger log = LoggerFactory.getLogger(CommandPublisher.class);

    @Value("${mqtt.actionTopic}")
    private String actionTopic;

    public CommandPublisher(MqttClient mqttClient) {
        this.mqttClient = mqttClient;
    }

    public void sendAction(int deviceId, String action, String correlationId) {
        try {
            Map<String, Object> payload = Map.of(
                    "deviceId", deviceId,
                    "action", action,
                    "correlationId", correlationId
            );

            String json = objectMapper.writeValueAsString(payload);
            MqttMessage msg = new MqttMessage(json.getBytes());
            msg.setQos(1);

            mqttClient.publish(actionTopic, msg);

            log.info("[MQTT] Đã publish lên {}: {}", actionTopic, json);
        } catch (Exception e) {
            log.error("[MQTT] Lỗi publish MQTT", e);
        }
    }
}
