# 🔐 Environment Variables Setup Guide

## Tạo file .env.example (Template)

Tạo file `.env.example` trong thư mục gốc của dự án:

```bash
# ===========================================
# IoT System Environment Configuration
# ===========================================
# Copy this file to .env and update with your actual values
# DO NOT commit .env file to Git!

# ===========================================
# Database Configuration
# ===========================================
DB_URL=jdbc:mysql://localhost:3306/iot_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Ho_Chi_Minh&useUnicode=true&characterEncoding=utf8
DB_USERNAME=root
DB_PASSWORD=your_secure_password_here

# ===========================================
# MQTT Configuration (HiveMQ Cloud)
# ===========================================
MQTT_HOST=your_mqtt_host.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=your_mqtt_username
MQTT_PASSWORD=your_mqtt_password

# MQTT Topics
MQTT_TELEMETRY_TOPIC=sensor/data
MQTT_ACTION_TOPIC=device_actions

# ===========================================
# Application Configuration
# ===========================================
SERVER_PORT=8081
JPA_DDL_AUTO=update
JPA_SHOW_SQL=false

# ===========================================
# Security Configuration (Production)
# ===========================================
JWT_SECRET=your_jwt_secret_key_minimum_32_characters
ENCRYPTION_KEY=your_encryption_key_32_characters
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081

# ===========================================
# External Services (Optional)
# ===========================================
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200

# ===========================================
# Monitoring & Logging
# ===========================================
ACTUATOR_USERNAME=admin
ACTUATOR_PASSWORD=your_actuator_password
PROMETHEUS_ENABLED=true

# ===========================================
# Email Configuration (Optional)
# ===========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@iot-system.com

# ===========================================
# Development vs Production
# ===========================================
SPRING_PROFILES_ACTIVE=dev
DEBUG_MODE=true
```

## Tạo file .env (Local)

1. Copy từ template:
```bash
cp .env.example .env
```

2. Chỉnh sửa với thông tin thực tế:
```bash
nano .env  # hoặc vim .env
```

3. Điền thông tin thực tế:
```bash
# Database Configuration
DB_URL=jdbc:mysql://localhost:3306/iot_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Ho_Chi_Minh&useUnicode=true&characterEncoding=utf8
DB_USERNAME=root
DB_PASSWORD=123456

# MQTT Configuration
MQTT_HOST=7c3aa4ee26624b92a6748300e938cd6b.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=esp32
MQTT_PASSWORD=Bnv2003@

# MQTT Topics
MQTT_TELEMETRY_TOPIC=sensor/data
MQTT_ACTION_TOPIC=device_actions

# Application Configuration
SERVER_PORT=8081
JPA_DDL_AUTO=update
JPA_SHOW_SQL=false
```

## Cách chạy với Environment Variables

### Development Mode:
```bash
# Load environment variables và chạy
export $(cat .env | xargs) && mvn spring-boot:run

# Hoặc sử dụng Maven plugin
mvn spring-boot:run -Dspring-boot.run.environmentVariables="$(cat .env | xargs | tr ' ' ',')"
```

### Production Mode:
```bash
# Build JAR file
mvn clean package

# Chạy với environment variables
export $(cat .env | xargs) && java -jar target/iot-system-1.0.0.jar

# Hoặc set trực tiếp
DB_PASSWORD=your_prod_password MQTT_PASSWORD=your_prod_mqtt_password java -jar target/iot-system-1.0.0.jar
```

### Docker Mode:
```bash
# Chạy với Docker và .env file
docker run --env-file .env your-iot-system:latest
```

## Bảo mật

✅ **Nên làm:**
- Commit `.env.example` vào Git
- Giữ `.env` trong `.gitignore`
- Sử dụng password phức tạp
- Rotate credentials định kỳ

❌ **Không nên:**
- Commit `.env` vào Git
- Hardcode password trong code
- Share credentials qua email/chat
- Sử dụng password yếu

## Troubleshooting

### Lỗi "Failed to configure a DataSource":
```bash
# Kiểm tra environment variables
echo $DB_URL
echo $DB_USERNAME
echo $DB_PASSWORD

# Chạy lại với debug
export $(cat .env | xargs) && mvn spring-boot:run -Ddebug
```

### Lỗi MQTT connection:
```bash
# Kiểm tra MQTT credentials
echo $MQTT_HOST
echo $MQTT_USERNAME
echo $MQTT_PASSWORD

# Test MQTT connection
mosquitto_pub -h $MQTT_HOST -p $MQTT_PORT -u $MQTT_USERNAME -P $MQTT_PASSWORD -t test -m "hello"
```
