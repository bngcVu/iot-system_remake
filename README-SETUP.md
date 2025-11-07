# IoT System - Separate Frontend and Backend

## Project Structure

```
iot-system_remake/
├── Back-end/           # Spring Boot backend server
│   └── iot-system/     # Main backend application
├── Front-end/          # Static HTML/CSS/JS files
│   ├── index.html      # Main dashboard
│   ├── history.html    # Sensor data page
│   ├── activity.html   # Device activity page
│   ├── profile.html    # User profile page
│   ├── js/             # JavaScript modules
│   ├── css/            # Stylesheets
│   └── img/            # Images
├── run-backend.bat     # Start backend server
├── run-frontend.bat    # Start frontend server
└── iot.ino             # Arduino ESP32 code
```

## How to Run

### 1. Start Backend Server

Open a terminal and run:
```powershell
.\run-backend.bat
```

The backend will start on `http://localhost:8081`

**Optional arguments:**
- Clean build: `.\run-backend.bat clean`
- Custom profile: `.\run-backend.bat -Dspring-boot.run.profiles=dev`

### 2. Start Frontend Server

Open **another terminal** and run:
```powershell
.\run-frontend.bat
```

The frontend will start on `http://localhost:8080`

**Optional custom port:**
```powershell
.\run-frontend.bat 3000
```

### 3. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:8080/index.html
- **Backend API**: http://localhost:8081/api/devices

## Configuration

### Frontend API Configuration

The frontend is configured to connect to the backend at `http://localhost:8081`.

If you need to change this, edit `Front-end/js/config.js`:

```javascript
export const API_BASE = 'http://localhost:8081';
```

### Backend CORS Configuration

The backend is already configured to accept requests from any origin.

If you need to restrict CORS, edit `Back-end/iot-system/src/main/java/com/iot_system/config/CorsConfig.java`.

## Requirements

- **Backend**: Java 17+, Maven
- **Frontend**: Python 3 (for simple HTTP server)
  - Alternative: Any HTTP server (e.g., `npx http-server`, `live-server`)

## Development Notes

- Backend runs on port `8081`
- Frontend runs on port `8080` (default)
- WebSocket endpoint: `ws://localhost:8081/ws`
- MQTT broker: HiveMQ Cloud (configured in `application.properties`)

## Troubleshooting

### Frontend cannot connect to backend

1. Check if backend is running: http://localhost:8081/api/devices
2. Check browser console for CORS errors
3. Verify `API_BASE` in `Front-end/js/config.js`

### WebSocket not connecting

1. Check WebSocket config in backend
2. Open browser DevTools → Network → WS tab
3. Verify connection to `ws://localhost:8081/ws`

### Backend fails to start

1. Check if port 8081 is already in use
2. Verify Java version: `java -version` (must be 17+)
3. Check MQTT broker credentials in `application.properties`
