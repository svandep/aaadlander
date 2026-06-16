#include "HX711.h"
#include <SPI.h>
#include <nRF24L01.h>
#include "RF24.h"
#include <Servo.h>

#define LPP_WEIGHT 154
#define LPP_DIGITAL_OUTPUT 1

// HX711 pins
#define HX711_DOUT 3
#define HX711_CLK 2

// NRF24 pins
#define CE_PIN 7
#define CSN_PIN 8

#define RF24_PAYLOAD_SIZE 32
#define AAAD_CUBESAT 4
#define AAAD_MODULE 2

Servo arm;
Servo gripper;

HX711 scale;
RF24 radio(CE_PIN, CSN_PIN);

float calibration_factor = 722.0;

uint8_t txData[RF24_PAYLOAD_SIZE];
uint8_t rxData[RF24_PAYLOAD_SIZE];

const uint8_t rf24_channel[] = { 100, 105, 110, 115, 120 };

const uint64_t addresses[] = {
  0x4141414430LL,
  0x4141414431LL,
  0x4141414432LL,
  0x4141414433LL,
  0x4141414434LL,
  0x4141414435LL
};

unsigned long previousMillis = 0;
const unsigned long sampleTime = 5000;
unsigned long lastConnectionHeartbeatMillis = 0;
const unsigned long CONNECTION_LED_TIMEOUT_MS = 8000;

// Control pins - adapt these to your hardware wiring
const uint8_t ARM_PIN = 9;
const uint8_t GRIPPER_PIN = 10;
const uint8_t CONNECTION_LED_PIN = A3;

const uint8_t SPINDLE_IN3_PIN = 4;
const uint8_t SPINDLE_IN4_PIN = 6;
const uint8_t SPINDLE_ENB_PIN = 5;

const bool SPINDLE_DIR_UP = LOW;
const bool SPINDLE_DIR_DOWN = HIGH;

// --- GEWISSELD VOOR DE GOEDE RICHTING ---
const int eindOnder = A0; // Was A1
const int eindBoven = A1; // Was A0

void print2Hex(unsigned v) {
  Serial.print("0123456789ABCDEF"[v >> 4]);
  Serial.print("0123456789ABCDEF"[v & 0xF]);
}

void setConnectionLed(bool isOn) {
  digitalWrite(CONNECTION_LED_PIN, isOn ? HIGH : LOW);
}

void setupControlPins() {
  pinMode(SPINDLE_IN3_PIN, OUTPUT);
  pinMode(SPINDLE_IN4_PIN, OUTPUT);
  pinMode(SPINDLE_ENB_PIN, OUTPUT);
  pinMode(CONNECTION_LED_PIN, OUTPUT);
  setConnectionLed(false);

  // Activeer de interne pull-up weerstanden (pinnen zijn stabiel HIGH in rust)
  pinMode(eindOnder, INPUT_PULLUP);
  pinMode(eindBoven, INPUT_PULLUP);

  // STEL EERST DE STARTPOSITIE IN
  arm.write(10);      // Bijv. 0 graden is "in"
  gripper.write(90);  // Bijv. 0 graden is "open"

  // DAARNA PAS ATTACHEN
  arm.attach(ARM_PIN);
  gripper.attach(GRIPPER_PIN);

  analogWrite(SPINDLE_ENB_PIN, 0);
}

void setup() {
  Serial.begin(9600);

  setupControlPins();

  scale.begin(HX711_DOUT, HX711_CLK);
  scale.set_scale(calibration_factor);
  scale.tare();

  SPI.begin();

  radio.begin();
  radio.setAddressWidth(5);
  radio.setRetries(15, 15);
  radio.setPayloadSize(RF24_PAYLOAD_SIZE);
  radio.setPALevel(RF24_PA_HIGH);
  radio.setDataRate(RF24_250KBPS);
  radio.setChannel(rf24_channel[AAAD_CUBESAT]);
  radio.openWritingPipe(addresses[AAAD_MODULE]);
  radio.openReadingPipe(1, addresses[AAAD_MODULE]);
  radio.startListening();

  Serial.println("Loadcell TX ready (AAAD2, ch120)");
}

void loop() {
  unsigned long now = millis();
  if (now - previousMillis >= sampleTime) {
    previousMillis = millis();
    sendWeight();
  }

  if (lastConnectionHeartbeatMillis != 0 && now - lastConnectionHeartbeatMillis > CONNECTION_LED_TIMEOUT_MS) {
    setConnectionLed(false);
    lastConnectionHeartbeatMillis = 0;
    Serial.println("Connection LED OFF (heartbeat timeout)");
  }

  // --- ACTIEVE VEILIGHEIDSCHECK (TIJDENS BEWEGING) ---
  bool bovenBereikt = (digitalRead(eindBoven) == LOW);
  bool onderBereikt = (digitalRead(eindOnder) == LOW);

  // Controleer continu welke kant de motor momenteel op draait
  bool isMovingDown = (digitalRead(SPINDLE_IN3_PIN) == SPINDLE_DIR_DOWN && digitalRead(SPINDLE_IN4_PIN) == !SPINDLE_DIR_DOWN);
  bool isMovingUp = (digitalRead(SPINDLE_IN3_PIN) == SPINDLE_DIR_UP && digitalRead(SPINDLE_IN4_PIN) == !SPINDLE_DIR_UP);

  // Als hij de grens fysiek raakt terwijl hij die kant op rijdt -> DIRECT EMERGENCE STOP
  if ((isMovingUp && bovenBereikt) || (isMovingDown && onderBereikt)) {
    analogWrite(SPINDLE_ENB_PIN, 0);
    digitalWrite(SPINDLE_IN3_PIN, LOW);
    digitalWrite(SPINDLE_IN4_PIN, LOW);
    Serial.println("!!! Noodstop: Eindschakelaar geraakt tijdens beweging !!!");
  }

  // --- ACTIEVE FAILSAFE TIJDENS BEWEGING ---
  // Als de mast omlaag rijdt, maar de arm wordt tijdens de rit plotseling ingetrokken (< 50) -> DIRECT STOP
  int actueleArmPositie = arm.read();
  if (isMovingDown && actueleArmPositie <= 50) {
    analogWrite(SPINDLE_ENB_PIN, 0);
    digitalWrite(SPINDLE_IN3_PIN, LOW);
    digitalWrite(SPINDLE_IN4_PIN, LOW);
    Serial.println("!!! Noodstop: Mast bewoog omlaag terwijl de arm werd ingetrokken !!!");
  }

  receiveCommands();
}

void sendWeight() {
  float weightGram = scale.get_units(10);
  if (weightGram < 25) {
    weightGram = 0;
  }

  uint16_t weightInt = (uint16_t)weightGram;

  uint8_t cursor = 0;
  txData[cursor++] = 1;           // channel id
  txData[cursor++] = LPP_WEIGHT;  // type
  txData[cursor++] = highByte(weightInt);
  txData[cursor++] = lowByte(weightInt);

  while (cursor < RF24_PAYLOAD_SIZE) {
    txData[cursor++] = 0;
  }

  radio.stopListening();
  bool ok = radio.write(&txData, sizeof(txData));
  radio.startListening();

  Serial.print("Weight (g): ");
  Serial.print(weightGram);
  Serial.print(" | TX ");
  Serial.println(ok ? "OK" : "FAIL");
}

void receiveCommands() {
  while (radio.available()) {
    radio.read(rxData, RF24_PAYLOAD_SIZE);
    Serial.print("rxData: ");
    for (size_t i = 0; i < RF24_PAYLOAD_SIZE; ++i) {
      if (i != 0) Serial.print(" ");
      print2Hex(rxData[i]);
    }
    Serial.println();
    parseLppPayload(rxData, RF24_PAYLOAD_SIZE);
  }
}

void parseLppPayload(const uint8_t *buffer, size_t length) {
  size_t cursor = 0;
  while (cursor + 2 < length) {
    uint8_t channel = buffer[cursor++];
    uint8_t type = buffer[cursor++];

    if (channel == 0 || type == 0) {
      break;
    }

    if (type == LPP_DIGITAL_OUTPUT) {
      if (cursor >= length) break;
      uint8_t value = buffer[cursor++];
      applyDigitalOutput(channel, value);
    } else {
      // skip unsupported types
      if (type == 3) {
        cursor += 2;  // analog output length
      } else {
        break;
      }
    }
  }
}

void applyDigitalOutput(uint8_t channel, uint8_t value) {
  Serial.print("Control channel ");
  Serial.print(channel);
  Serial.print(" value ");
  Serial.println(value);

  if (channel == 2) {
    bool direction = (value & 0x80) != 0;
    uint8_t speed = value & 0x7F;
    uint8_t pwm = speed * 2;

    bool bovenBereikt = (digitalRead(eindBoven) == LOW);
    bool onderBereikt = (digitalRead(eindOnder) == LOW);

    // --- INKOMENDE COMMANDO CHECK ---
    if (direction == SPINDLE_DIR_UP && bovenBereikt) {
      Serial.println("Actie geweigerd: Hefmast staat al op z'n hoogste punt.");
      analogWrite(SPINDLE_ENB_PIN, 0);
      return;
    }
    if (direction == SPINDLE_DIR_DOWN && onderBereikt) {
      Serial.println("Actie geweigerd: Hefmast staat al op z'n laagste punt.");
      analogWrite(SPINDLE_ENB_PIN, 0);
      return;
    }

    // --- OMGEKEERDE MECHANISCHE VEILIGHEIDSCHECK ---
    // Richting DOWN = omlaag. De arm MOET uitgeklapt zijn (> 50) om omlaag te mogen zakken.
    int huidigeArmPositie = arm.read();
    if (direction == SPINDLE_DIR_DOWN && huidigeArmPositie <= 50) {
      Serial.print("Actie geweigerd: Mast mag niet zakken zolang de arm ingeklapt is op positie ");
      Serial.println(huidigeArmPositie);
      analogWrite(SPINDLE_ENB_PIN, 0);
      return;
    }

    // Indien veilig: stuur de motor aan
    analogWrite(SPINDLE_ENB_PIN, pwm);
    digitalWrite(SPINDLE_IN3_PIN, direction);
    digitalWrite(SPINDLE_IN4_PIN, !direction);

    Serial.print(" Motor ");
    Serial.print(" pwm=");
    Serial.println(pwm);
    Serial.print(" Direction = ");
    Serial.println(direction);
  }

  if (channel == 3) {
    int currentPositionArm = arm.read();
    Serial.println("arm positie: " + String(currentPositionArm));
    if (currentPositionArm < value) {
      for (int i = currentPositionArm; i < value; i++) {
        arm.write(i);
        delay(50);
      }
    } else {
      if (currentPositionArm > value) {
        for (int i = currentPositionArm; i > value; i--) {
          arm.write(i);
          delay(50);
        }
      }
    }
  }

  if (channel == 4) {
    int currentPositionGripper = gripper.read();
    Serial.println("Gripper positie: " + String(currentPositionGripper));
    if (currentPositionGripper < value) {
      for (int i = currentPositionGripper; i < value; i++) {
        gripper.write(i);
        delay(50);
      }
    } else {
      if (currentPositionGripper > value) {
        for (int i = currentPositionGripper; i > value; i--) {
          gripper.write(i);
          delay(50);
        }
      }
    }
  }

  if (channel == 5) {
    if (value > 0) {
      setConnectionLed(true);
      lastConnectionHeartbeatMillis = millis();
      Serial.println("Connection LED ON");
    } else {
      setConnectionLed(false);
      lastConnectionHeartbeatMillis = 0;
      Serial.println("Connection LED OFF");
    }
  }
}
