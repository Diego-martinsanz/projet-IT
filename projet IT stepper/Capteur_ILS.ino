#define MAGNETIC_SWITCH 2
#define LED 13

#include <Arduino.h>

volatile bool pulseFlag = false;
volatile unsigned long lastIsrMillis = 0;
unsigned long lastValidPulse = 0;
const unsigned long debounceMs = 50;
unsigned long stepCount = 0;
unsigned long ledOffAt = 0;
const unsigned long heartbeatInterval = 10000;
unsigned long lastHeartbeat = 0;
bool useInterrupt = false;
int lastSwitchState = HIGH;

void handleInterrupt() {
  unsigned long now = millis();
  if (now - lastIsrMillis > 10) {
    lastIsrMillis = now;
    pulseFlag = true;
  }
}

void flashLed(unsigned long ms = 120) {
  digitalWrite(LED, HIGH);
  ledOffAt = millis() + ms;
}

void countPulse() {
  unsigned long now = millis();
  if (now - lastValidPulse >= debounceMs) {
    lastValidPulse = now;
    stepCount++;
    Serial.println("PULSE");
    Serial.print("STEP:");
    Serial.println(stepCount);
    flashLed(120);
  }
}

void processSerialCommands() {
  if (!Serial.available()) return;
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  if (cmd.equalsIgnoreCase("RESET")) {
    stepCount = 0;
    Serial.println("STEP:0");
    Serial.println("MSG:RESET OK");
  } else if (cmd.equalsIgnoreCase("GET")) {
    Serial.print("TOTAL:");
    Serial.println(stepCount);
  } else {
    Serial.print("MSG:UNKNOWN ");
    Serial.println(cmd);
  }
}

void setup() {
  pinMode(MAGNETIC_SWITCH, INPUT_PULLUP);
  pinMode(LED, OUTPUT);
  digitalWrite(LED, LOW);
  Serial.begin(9600);
  delay(100);
  if (digitalPinToInterrupt(MAGNETIC_SWITCH) != NOT_AN_INTERRUPT) {
    attachInterrupt(digitalPinToInterrupt(MAGNETIC_SWITCH), handleInterrupt, CHANGE);
    useInterrupt = true;
  } else {
    useInterrupt = false;
  }
  lastSwitchState = digitalRead(MAGNETIC_SWITCH);
  lastHeartbeat = millis();
}

void loop() {
  if (useInterrupt) {
    if (pulseFlag) {
      pulseFlag = false;
      countPulse();
    }
  } else {
    int state = digitalRead(MAGNETIC_SWITCH);
    if (state != lastSwitchState) {
      lastSwitchState = state;
      if (state == LOW) {
        countPulse();
      }
    }
  }
  if (ledOffAt && millis() >= ledOffAt) {
    digitalWrite(LED, LOW);
    ledOffAt = 0;
  }
  if (millis() - lastHeartbeat >= heartbeatInterval) {
    lastHeartbeat = millis();
    Serial.print("TOTAL:");
    Serial.println(stepCount);
  }
  processSerialCommands();
  delay(10);
}
