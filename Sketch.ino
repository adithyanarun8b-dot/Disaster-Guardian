#include <Arduino_RouterBridge.h>
#include <Arduino_Modulino.h>
#include <Wire.h>
#include <SSD1306AsciiWire.h>

// ── OLED Config ──────────────────────────────────────────────
// OLED SDA → A4 (default Wire)
// OLED SCL → A5 (default Wire)
// OLED VCC → 3.3V
// OLED GND → GND

#define OLED_ADDRESS 0x3C
SSD1306AsciiWire oled;

// ── Pin Definitions ──────────────────────────────────────────
#define ALARM_PIN      13
#define LED_GREEN_PIN   7
#define LED_RED_PIN     8

// ── IMU ──────────────────────────────────────────────────────
ModulinoMovement movement;

float x_accel, y_accel, z_accel;
unsigned long previousMillis = 0;
const long interval = 16;
int has_movement = 0;

// ── Display State ─────────────────────────────────────────────
bool isAnomalyActive = false;
unsigned long anomalyDisplayUntil = 0;
const unsigned long DISPLAY_HOLD_MS = 4000;

// ── OLED Helpers ──────────────────────────────────────────────
void showLoadingScreen() {
  oled.clear();
  oled.setFont(System5x7);

  oled.setCursor(0, 0);
  oled.println(F("==================="));
  oled.println(F(" DISASTER GUARDIAN "));
  oled.println(F("==================="));
  oled.println();
  oled.println(F("  Edge AI Monitor  "));
  oled.println();
  oled.println(F("  Initializing...  "));

  delay(1500);

  // Loading bar animation using text chars
  oled.clear();
  oled.setCursor(0, 0);
  oled.println(F(" DISASTER GUARDIAN "));
  oled.println(F("-------------------"));
  oled.setCursor(0, 4);
  oled.print(F("Loading: ["));
  for (int i = 0; i < 8; i++) {
    oled.print(F("#"));
    delay(100);
  }
  oled.println(F("]"));
  oled.setCursor(0, 6);
  oled.println(F("    System Ready!   "));
  delay(800);
}

void showSafeStatus() {
  oled.clear();
  oled.setFont(System5x7);

  oled.setCursor(0, 0);
  oled.println(F(" DISASTER GUARDIAN "));
  oled.println(F("-------------------"));
  oled.setCursor(0, 3);
  oled.println(F("  STATUS:  SAFE    "));
  oled.println();
  oled.println(F(" No anomaly detect "));
  oled.println(F("-------------------"));
  oled.println(F("  System Normal    "));
}

void showDangerStatus(float score) {
  oled.clear();
  oled.setFont(System5x7);

  oled.setCursor(0, 0);
  oled.println(F("!! EARTHQUAKE !!   "));
  oled.println(F("==================="));
  oled.setCursor(0, 3);
  oled.println(F(" STATUS: DANGER!   "));
  oled.println();
  oled.print(F(" Score: "));
  oled.println(score, 2);
  oled.println(F("-------------------"));
  oled.println(F(" Take cover now!   "));
}

// ── Bridge RPCs ───────────────────────────────────────────────
void set_alarm_pin(bool state) {
  digitalWrite(ALARM_PIN, state ? HIGH : LOW);
}

void set_green_led(bool state) {
  digitalWrite(LED_GREEN_PIN, state ? HIGH : LOW);
}

void set_red_led(bool state) {
  digitalWrite(LED_RED_PIN, state ? HIGH : LOW);
}

void show_anomaly(float score) {
  isAnomalyActive     = true;
  anomalyDisplayUntil = millis() + DISPLAY_HOLD_MS;
  showDangerStatus(score);
}

void setup() {
  Bridge.begin();

  pinMode(ALARM_PIN,     OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_RED_PIN,   OUTPUT);

  digitalWrite(ALARM_PIN,     LOW);
  digitalWrite(LED_GREEN_PIN, HIGH);
  digitalWrite(LED_RED_PIN,   LOW);

  Bridge.provide("set_alarm_pin", set_alarm_pin);
  Bridge.provide("set_green_led", set_green_led);
  Bridge.provide("set_red_led",   set_red_led);
  Bridge.provide("show_anomaly",  show_anomaly);

  // OLED on default Wire (A4/A5)
  Wire.begin();
  oled.begin(&Adafruit128x64, OLED_ADDRESS);
  oled.setFont(System5x7);
  showLoadingScreen();

  // IMU on Wire1 (Qwiic) — no conflict!
  Modulino.begin(Wire1);
  while (!movement.begin()) {
    delay(1000);
  }

  showSafeStatus();
}

void loop() {
  unsigned long currentMillis = millis();

  // Auto-revert to SAFE after hold time
  if (isAnomalyActive && currentMillis >= anomalyDisplayUntil) {
    isAnomalyActive = false;
    showSafeStatus();
  }

  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    has_movement = movement.update();
    if (has_movement == 1) {
      x_accel = movement.getX();
      y_accel = movement.getY();
      z_accel = movement.getZ();
      Bridge.notify("record_sensor_movement", x_accel, y_accel, z_accel);
    }
  }
}