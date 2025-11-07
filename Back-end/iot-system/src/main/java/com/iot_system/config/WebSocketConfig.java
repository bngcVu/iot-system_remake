package com.iot_system.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Cấu hình endpoint cho client kết nối vào (FE dùng SockJS -> /ws).
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")                 // endpoint FE sẽ kết nối
                .setAllowedOriginPatterns("*")      // cho phép tất cả domain kết nối (fix CORS)
                .withSockJS();                      // bật SockJS fallback
    }

    /**
     * Cấu hình broker (đường truyền message).
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Nơi FE sẽ subscribe để nhận message từ BE
        registry.enableSimpleBroker("/topic");

        // Prefix khi FE gửi message ngược lên BE (nếu cần)
        registry.setApplicationDestinationPrefixes("/app");
    }

}
