package com.iot_system.config;

import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Configuration
public class MQTTConfig {

    private static final Logger log = LoggerFactory.getLogger(MQTTConfig.class);

    @Value("${mqtt.host}")
    private String host;

    @Value("${mqtt.port}")
    private int port;

    @Value("${mqtt.username}")
    private String username;

    @Value("${mqtt.password}")
    private String password;

    @Value("${spring.application.name:iot-system}")
    private String appName;

    @Bean
    public MqttClient mqttClient() throws MqttException {
    // Địa chỉ Broker dạng ssl://host:port (HiveMQ Cloud yêu cầu SSL)
        String brokerUrl = "ssl://" + host + ":" + port;
        String clientId = appName + "-" + System.currentTimeMillis();

        MqttClient client = new MqttClient(brokerUrl, clientId, new MemoryPersistence());

        MqttConnectOptions options = new MqttConnectOptions();
        options.setUserName(username);
        options.setPassword(password.toCharArray());
        options.setAutomaticReconnect(true);
        options.setCleanSession(true);

        client.connect(options);

        log.info("[MQTT] Đã kết nối tới {}", brokerUrl);

        return client;
    }
}
