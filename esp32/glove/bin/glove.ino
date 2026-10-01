/*
 * Smart Drum Glove - ESP32 WIRELESS FIRMWARE
 * ------------------------------------------
 * Sends CSV sensor data over WiFi (UDP) to the PC.
 * CSV format identical to the USB version:
 *   F1,F2,F3,F4,AX,AY,AZ,GX,GY,GZ
 *
 * Fill in WIFI_SSID, WIFI_PASS and PC_IP below.
 * Baud: 115200 (for debug prints only)
 *
 * IMPORTANT: PC and ESP32 must be on the same WiFi network.
 * Find PC_IP with: hostname -I  (Linux) or  ipconfig  (Windows)
 */

#include <WiFi.h>
#include <WiFiUdp.h>
#include <Wire.h>

// ---------------- USER CONFIG ----------------
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// IP address of the PC running the Python app
// On Linux run:  hostname -I
// On Windows:    ipconfig
const char* PC_IP = "192.168.1.100";     // <-- CHANGE THIS

const int   UDP_PORT = 5005;

// ---------------- PINS ----------------
#define FLEX1_PIN   34
#define FLEX2_PIN   35
#define FLEX3_PIN   32
#define FLEX4_PIN   33

#define I2C_SDA     21
#define I2C_SCL     22
#define MPU_ADDR    0x68

#define SAMPLE_INTERVAL_MS 20

// ---------------- GLOBALS ----------------
WiFiUDP udp;
IPAddress pcIP;

bool mpuOK = false;
unsigned long lastSample = 0;
unsigned long bootTime = 0;

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
  ax = rAx / 16384.0;
  ay = rAy / 16384.0;
  az = rAz / 16384.0;
  gx = rGx / 131.0;
  gy = rGy / 131.0;
  gz = rGz / 131.0;
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);
  delay(300);

  analogReadResolution(12);
  analogSetPinAttenuation(FLEX1_PIN, ADC_11db);
  analogSetPinAttenuation(FLEX2_PIN, ADC_11db);
  analogSetPinAttenuation(FLEX3_PIN, ADC_11db);
  analogSetPinAttenuation(FLEX4_PIN, ADC_11db);

  Wire.begin(I2C_SDA, I2C_SCL);
  mpuOK = mpuInit();

  Serial.println();
  Serial.println("# Smart Drum Glove (WiFi)");
  Serial.print("# Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("# WiFi connected. ESP32 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("# WiFi FAILED. Check SSID/PASS.");
  }

  pcIP.fromString(PC_IP);
  Serial.print("# Sending UDP to: ");
  Serial.print(pcIP);
  Serial.print(":");
  Serial.println(UDP_PORT);

  Serial.println(mpuOK ? "# MPU6050: OK" : "# MPU6050: NOT FOUND");
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

  float ax = 0, ay = 0, az = 0, gx = 0, gy = 0, gz = 0;
  if (mpuOK) {
    mpuRead(ax, ay, az, gx, gy, gz);
  } else if (now - bootTime > 2000) {
    mpuOK = mpuInit();
    bootTime = now;
  }

  // Same CSV format as USB version
  char packet[120];
  int n = snprintf(packet, sizeof(packet),
                   "%d,%d,%d,%d,%.2f,%.2f,%.2f,%.2f,%.2f,%.2f",
                   f1, f2, f3, f4, ax, ay, az, gx, gy, gz);

  if (WiFi.status() == WL_CONNECTED) {
    udp.beginPacket(pcIP, UDP_PORT);
    udp.write((const uint8_t*)packet, n);
    udp.endPacket();
  }
}
