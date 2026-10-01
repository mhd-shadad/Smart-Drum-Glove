// ============================================================
//  Right Hand Glove - ESP32 Firmware
//  Sends to UDP port 5005 (backend's RH listener)
// ============================================================
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Wire.h>

// ---------------- USER CONFIG ----------------
const char* WIFI_SSID  = "poco";
const char* WIFI_PASS  = "12345678";
const char* PC_IP      = "10.149.237.222";   // ← your PC's IP
const int   PC_PORT    = 5005;                // ← Right hand destination
const int   LOCAL_PORT = 6005;                // ← Right hand source port
const char  HAND_ID    = 'R';                 // ← Right hand ID

#define SEND_SERIAL true
#define SEND_UDP    true

// ---------------- PINS ----------------
#define FLEX1_PIN 34
#define FLEX2_PIN 35
#define FLEX3_PIN 32
#define FLEX4_PIN 33
#define I2C_SDA   21
#define I2C_SCL   22
#define MPU_ADDR  0x68

#define SAMPLE_INTERVAL_MS 20

// ---------------- GLOBALS ----------------
WiFiUDP udp;
IPAddress pcIP;
bool mpuOK = false, wifiOK = false;
unsigned long lastSample = 0, bootTime = 0;

// ---------------- MPU6050 ----------------
bool mpuInit() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); Wire.write(0x00);
  if (Wire.endTransmission() != 0) return false;
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x1C); Wire.write(0x00);
  if (Wire.endTransmission() != 0) return false;
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x1B); Wire.write(0x00);
  if (Wire.endTransmission() != 0) return false;
  return true;
}

void mpuRead(float &ax, float &ay, float &az,
             float &gx, float &gy, float &gz) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)MPU_ADDR, (uint8_t)14, (uint8_t)true);

  int16_t rAx = (Wire.read() << 8) | Wire.read();
  int16_t rAy = (Wire.read() << 8) | Wire.read();
  int16_t rAz = (Wire.read() << 8) | Wire.read();
  Wire.read(); Wire.read();
  int16_t rGx = (Wire.read() << 8) | Wire.read();
  int16_t rGy = (Wire.read() << 8) | Wire.read();
  int16_t rGz = (Wire.read() << 8) | Wire.read();

  ax = rAx / 16384.0; ay = rAy / 16384.0; az = rAz / 16384.0;
  gx = rGx / 131.0;   gy = rGy / 131.0;   gz = rGz / 131.0;
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);
  delay(500);

  analogReadResolution(12);
  analogSetPinAttenuation(FLEX1_PIN, ADC_11db);
  analogSetPinAttenuation(FLEX2_PIN, ADC_11db);
  analogSetPinAttenuation(FLEX3_PIN, ADC_11db);
  analogSetPinAttenuation(FLEX4_PIN, ADC_11db);

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000);
  mpuOK = mpuInit();

  Serial.println("# ============================");
  Serial.println("# Right Hand Glove starting");
  Serial.print("# MPU6050: ");
  Serial.println(mpuOK ? "OK" : "NOT FOUND");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("# Connecting WiFi");
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(500); Serial.print("."); tries++;
  }
  Serial.println();

  wifiOK = (WiFi.status() == WL_CONNECTED);
  if (wifiOK) {
    Serial.print("# WiFi OK. IP: ");
    Serial.println(WiFi.localIP());
    pcIP.fromString(PC_IP);
    Serial.print("# UDP -> ");
    Serial.print(pcIP); Serial.print(":"); Serial.println(PC_PORT);
    Serial.print("# Local port: "); Serial.println(LOCAL_PORT);
    udp.begin(LOCAL_PORT);
  } else {
    Serial.println("# WiFi FAILED - USB only");
  }

  Serial.print("# Hand: "); Serial.println(HAND_ID);
  Serial.println("HAND,F1,F2,F3,F4,AX,AY,AZ,GX,GY,GZ");
  bootTime = millis();
}

// ---------------- LOOP ----------------
void loop() {
  unsigned long now = millis();
  if (now - lastSample < SAMPLE_INTERVAL_MS) return;
  lastSample = now;

  int f1 = analogRead(FLEX1_PIN);
  int f2 = analogRead(FLEX2_PIN);
  int f3 = analogRead(FLEX3_PIN);
  int f4 = analogRead(FLEX4_PIN);

  float ax=0, ay=0, az=0, gx=0, gy=0, gz=0;
  if (mpuOK) {
    mpuRead(ax, ay, az, gx, gy, gz);
  } else if (now - bootTime > 2000) {
    mpuOK = mpuInit();
    bootTime = now;
  }

  char packet[128];
  int n = snprintf(packet, sizeof(packet),
                   "%c,%d,%d,%d,%d,%.2f,%.2f,%.2f,%.2f,%.2f,%.2f",
                   HAND_ID, f1, f2, f3, f4, ax, ay, az, gx, gy, gz);

  if (SEND_SERIAL) Serial.println(packet);

  if (SEND_UDP && wifiOK) {
    udp.beginPacket(pcIP, PC_PORT);
    udp.write((const uint8_t*)packet, n);
    udp.endPacket();
  }
}
