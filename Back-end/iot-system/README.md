#

Hệ thống IoT quản lý thiết bị thông minh với giao diện web real-time, hỗ trợ điều khiển thiết bị và theo dõi dữ liệu cảm biến qua MQTT và WebSocket.

## 📌 Tổng quan

Xây dựng bằng Spring Boot 3.5.x (Java 21), MySQL, MQTT (HiveMQ Cloud), WebSocket/STOMP và frontend tĩnh (HTML/CSS/JS).

Tính năng chính:

## ⚙️ Yêu cầu

## 🛠️ Cấu hình
Chỉnh sửa `src/main/resources/application.properties` để thiết lập Database và MQTT.

Ví dụ MySQL:
```
jdbc:mysql://localhost:3306/iot_db
Charset/Collation: utf8mb4/utf8mb4_unicode_ci
```

Xem thêm hướng dẫn trong `ENV_SETUP.md`.

## 🚀 Chạy ứng dụng

### Cách 1: Chạy ở chế độ dev
```powershell
./mvnw.cmd spring-boot:run
```

### Cách 2 (Windows – khuyến nghị): Console UTF‑8 + chạy JAR
Sử dụng script đã chuẩn bị để tránh lỗi font tiếng Việt và hạn chế DevTools restart:
```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\run-utf8.ps1
```
Nếu đã build sẵn và chỉ muốn chạy:
```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\run-utf8.ps1 -SkipBuild
```

### Cách 3: Build JAR và chạy thủ công
```powershell
./mvnw.cmd clean package -DskipTests
java -jar target/iot-system-0.0.1-SNAPSHOT.jar
```

Truy cập:

## 🔌 MQTT Topics

- `sensor/data`: ESP32 → Backend (dữ liệu cảm biến)
- `device_actions`: Backend → ESP32 (lệnh điều khiển)
- `device_actions_ack`: ESP32 → Backend (phản hồi lệnh)
## 🧰 Công nghệ sử dụng (Backend)
- Spring Boot 3.5.5 (Java 21), Maven Wrapper
## 🧠 Kiến thức/Thiết kế áp dụng trong Backend
- Phân lớp rõ ràng: Controller → Service → Repository → Entity/DTO
## �️ Cấu trúc hệ thống

```
iot-system/
├── src/main/java/com/iot_system/
│   ├── config/      # Cấu hình (CORS, MQTT, WebSocket)
│   ├── controller/  # REST Controllers
│   ├── domain/      # dto/, entity/, enums/
│   ├── mqtt/        # MQTT Publisher/Subscriber
│   ├── repository/  # JPA Repositories
│   ├── service/     # Business Logic
│   └── util/        # Tiện ích
├── src/main/resources/
│   ├── static/      # HTML/CSS/JS giao diện
│   │   ├── css/
│   │   ├── js/
│   │   ├── img/
│   │   └── *.html
│   └── application.properties
├── scripts/
│   └── run-utf8.ps1 # Chạy app với UTF‑8 console (Windows)
├── logs/            # app.log (tạo khi chạy)
├── target/          # build output
├── pom.xml
└── ENV_SETUP.md
```

## �📂 Cấu trúc thư mục (rút gọn)
│   ├── controller/  # REST Controllers
│   ├── domain/      # dto/, entity/, enums/
│   ├── mqtt/        # MQTT Publisher/Subscriber
│   ├── repository/  # JPA Repositories
│   ├── service/     # Business Logic
│   └── util/        # Tiện ích
├── src/main/resources/
│   ├── static/      # HTML/CSS/JS giao diện
│   └── application.properties
├── scripts/
│   └── run-utf8.ps1 # Chạy app với UTF‑8 console (Windows)
├── logs/            # app.log (tạo khi chạy)
├── target/          # build output
├── pom.xml
└── ENV_SETUP.md
```

## 📊 Giám sát & Logs
- Logs ứng dụng: `logs/app.log` (UTF‑8, xoay file theo ngày – cấu hình tại `logback-spring.xml`)
- Health check: http://localhost:8081/actuator/health




