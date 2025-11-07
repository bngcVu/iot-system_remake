#include <Wire.h>
#include <BH1750.h>
#include "DHT.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

#define DHTPIN 4
#define DHTTYPE DHT11
#define RELAY_TEMP 25
#define RELAY_LIGHT 33
#define RELAY_HUMI 32
#define RELAY_DUST 34

const char* ssid = "free wifi - 5G";
const char* password = "tu1den10";

const char* mqtt_server = "7c3aa4ee26624b92a6748300e938cd6b.s1.eu.hivemq.cloud";
const int   mqtt_port   = 8883;
const char* mqtt_user   = "esp32";
const char* mqtt_pass   = "Bnv2003@";

const char* TOPIC_ACTIONS     = "device_actions";
const char* TOPIC_ACTIONS_ACK = "device_actions_ack";
const char* TOPIC_SENSOR      = "sensor/data";
const char* TOPIC_WILL        = "device/status";
const char* DEVICE_UID        = "esp32-1";

WiFiClientSecure espClient;
PubSubClient client(espClient);

DHT dht(DHTPIN, DHTTYPE);
BH1750 lightMeter;

bool overrideTemp = false;
bool overrideHumi = false;
bool overrideLight = false;
bool overrideDust = false;
unsigned long overrideTempAt = 0;
unsigned long overrideHumiAt = 0;
unsigned long overrideLightAt = 0;
unsigned long overrideDustAt = 0;
const unsigned long overrideTimeoutMs = 60000;

unsigned long lastSampleAt = 0;
const unsigned long sampleEveryMs = 2000;

// Fake dust sensor data
float fakeDustValue = 25.0; // PM2.5 µg/m³
float dustTrend = 0.5;

float generateFakeDustData() {
  // Random walk pattern
  fakeDustValue += random(-20, 30) / 10.0;
  
  // Keep in realistic range (0-500 µg/m³)
  if (fakeDustValue < 0) fakeDustValue = 0;
  if (fakeDustValue > 500) fakeDustValue = 500;
  
  // Add some trend
  fakeDustValue += dustTrend;
  if (fakeDustValue > 200 || fakeDustValue < 5) {
    dustTrend = -dustTrend; // Reverse trend
  }
  
  return fakeDustValue;
}

void connectWiFi() {
  Serial.print("Connecting to WiFi '" ); Serial.print(ssid); Serial.println("'...");
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(ssid, password);
  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
    if (millis() - started > 20000) {
      Serial.println("WiFi connect timed out, retrying...");
      started = millis();
      WiFi.disconnect();
      WiFi.begin(ssid, password);
    }
  }
  Serial.print("WiFi connected, IP="); Serial.println(WiFi.localIP());
}

void onMessage(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, payload, length)) return;

  int deviceId = doc["deviceId"] | 0;
  const char* action = doc["action"] | "";
  const char* cid    = doc["correlationId"] | "";
  bool turnOn = strcmp(action, "ON") == 0;

  if (deviceId == 1) { digitalWrite(RELAY_TEMP,  turnOn ? HIGH : LOW);  overrideTemp  = true; overrideTempAt  = millis(); }
  if (deviceId == 2) { digitalWrite(RELAY_LIGHT, turnOn ? HIGH : LOW);  overrideLight = true; overrideLightAt = millis(); }
  if (deviceId == 3) { digitalWrite(RELAY_HUMI,  turnOn ? HIGH : LOW);  overrideHumi  = true; overrideHumiAt  = millis(); }
  if (deviceId == 4) { digitalWrite(RELAY_DUST,  turnOn ? HIGH : LOW);  overrideDust  = true; overrideDustAt  = millis(); }

  StaticJsonDocument<200> ack;
  ack["deviceId"] = deviceId;
  ack["state"] = action;
  ack["correlationId"] = cid;
  char buf[200];
  size_t n = serializeJson(ack, buf, sizeof(buf));
  client.publish(TOPIC_ACTIONS_ACK, (uint8_t*)buf, n, false);
}

void resubscribe() {
  client.subscribe(TOPIC_ACTIONS);
}

void reconnectMQTT() {
  String clientId = "ESP32-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  static int attempt = 0;
  while (!client.connected()) {
    // Use QoS 0 and do NOT retain the LWT message on the broker.
    // This prevents a retained "offline" payload from being delivered to subscribers
    // when the device is re-flashed or temporarily disconnected.
    attempt++;
    Serial.print("MQTT connect attempt #"); Serial.println(attempt);
    bool ok = client.connect(clientId.c_str(), mqtt_user, mqtt_pass, TOPIC_WILL, 0, false, "offline");
    if (ok) {
      Serial.println("MQTT connected");
      // Publish an "online" retained state so subscribers can see current status.
      // Keeping the will non-retained avoids old "offline" retained messages.
      bool pubOk = client.publish(TOPIC_WILL, "online", true);
      Serial.print("Published 'online' retained: "); Serial.println(pubOk ? "OK" : "FAILED");
      resubscribe();
      attempt = 0;
    } else {
      int st = client.state();
      Serial.print("MQTT connect failed, state="); Serial.print(st);
      Serial.print(" (");
      switch (st) {
        case 0: Serial.print("CONNECTION_TIMEOUT"); break;
        case 1: Serial.print("CONNECTION_LOST"); break;
        case 2: Serial.print("CONNECT_FAILED"); break;
        case 3: Serial.print("DISCONNECTED"); break;
        case 4: Serial.print("CONNECTED"); break;
        case 5: Serial.print("CONNECT_BAD_PROTOCOL"); break;
        case 6: Serial.print("CONNECT_BAD_CLIENT_ID"); break;
        case 7: Serial.print("CONNECT_UNAVAILABLE"); break;
        case 8: Serial.print("CONNECT_BAD_CREDENTIALS"); break;
        case 9: Serial.print("CONNECT_UNAUTHORIZED"); break;
        default: Serial.print("UNKNOWN"); break;
      }
      Serial.println(") -- retrying in 1s");
      delay(1000);
    }
  }
}

void autoRelay(float t, float h, float lux, float dust) {
  if (overrideTemp  && millis() - overrideTempAt  > overrideTimeoutMs)  overrideTemp  = false;
  if (overrideHumi  && millis() - overrideHumiAt  > overrideTimeoutMs)  overrideHumi  = false;
  if (overrideLight && millis() - overrideLightAt > overrideTimeoutMs)  overrideLight = false;
  if (overrideDust  && millis() - overrideDustAt  > overrideTimeoutMs)  overrideDust  = false;

  if (!overrideTemp)  digitalWrite(RELAY_TEMP,  (!isnan(t) && t < 25) ? HIGH : LOW);
  if (!overrideHumi)  digitalWrite(RELAY_HUMI,  (!isnan(h) && h < 10) ? HIGH : LOW);
  if (!overrideLight) digitalWrite(RELAY_LIGHT, (lux > 0 && lux < 20) ? HIGH : LOW);
  if (!overrideDust)  digitalWrite(RELAY_DUST,  (dust > 100) ? HIGH : LOW); // Bật khi bụi > 100 µg/m³
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_TEMP, OUTPUT);
  pinMode(RELAY_LIGHT, OUTPUT);
  pinMode(RELAY_HUMI, OUTPUT);
  pinMode(RELAY_DUST, OUTPUT);
  digitalWrite(RELAY_TEMP, LOW);
  digitalWrite(RELAY_LIGHT, LOW);
  digitalWrite(RELAY_HUMI, LOW);
  digitalWrite(RELAY_DUST, LOW);

  connectWiFi();
  Wire.begin(21, 22);
  lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  dht.begin();
  
  randomSeed(analogRead(0)); // Initialize random seed for dust data

  espClient.setInsecure();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(onMessage);
  client.setKeepAlive(30);
  client.setSocketTimeout(60);
  client.setBufferSize(512);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!client.connected()) reconnectMQTT();
  client.loop();

  unsigned long now = millis();
  if (now - lastSampleAt >= sampleEveryMs) {
    lastSampleAt = now;

    float lux = lightMeter.readLightLevel();
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    float dust = generateFakeDustData(); // Generate fake dust data

    StaticJsonDocument<256> doc;
    doc["deviceUid"] = DEVICE_UID;
    if (!isnan(t))   doc["temperature"] = t;   else doc["temperature"] = nullptr;
    if (!isnan(h))   doc["humidity"]    = h;   else doc["humidity"]    = nullptr;
    if (!isnan(lux)) doc["light"]       = lux; else doc["light"]       = nullptr;
    doc["dust"] = dust; // Always send dust data

    char payload[256];
    size_t n = serializeJson(doc, payload, sizeof(payload));
    client.publish(TOPIC_SENSOR, (uint8_t*)payload, n, false);

    autoRelay(t, h, lux, dust);
  }
}