#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>
#include <LittleFS.h>

Adafruit_ADS1115 ads;

// WIFI + BACKEND
const char* WIFI_SSID     = "Ishaan's S23 FE";
const char* WIFI_PASSWORD = "ishaanoedit";
const char* SERVER_URL    = "http://10.182.168.64:3000/api/readings";
const char* DEVICE_ID     = "beepboop_001";

// SENSOR CALIBRATION
const float ADS_GAIN_VOLTS      = 0.0001875;
const float BURDEN_RESISTOR     = 22.0;
const int   CT_TURNS            = 2000;
const float CURRENT_FACTOR      = (float)CT_TURNS / BURDEN_RESISTOR;
const float CURRENT_CALIBRATION = 0.1255;   // 60W iron, verified with 30W
const float VOLTAGE_CALIBRATION = 1031.6;;     // multimeter @ 122.4V

// No tariff constant here — pricing is tiered and depends on the
// household's monthly cumulative total, which the device cannot know.
// The device reports energy; the database prices it.

// TIME (hardened)
const long  GMT_OFFSET_SEC      = -3 * 3600;
const int   DAYLIGHT_OFFSET_SEC = 0;
bool          timeIsSynced = false;
unsigned long lastSync     = 0;
const unsigned long SYNC_INTERVAL = 6UL * 3600UL * 1000UL;

// ADAPTIVE INTERVAL
const unsigned long INTERVAL_ONLINE    = 3000;
const unsigned long INTERVAL_OFFLINE_1 = 10000;
const unsigned long INTERVAL_OFFLINE_2 = 60000;
const unsigned long INTERVAL_OFFLINE_3 = 300000;
unsigned long offlineSince    = 0;
unsigned long lastSend        = 0;
unsigned long currentInterval = INTERVAL_ONLINE;

// STORAGE
const char*  BUFFER_FILE = "/buffer.txt";
const size_t MAX_BUFFER_BYTES = 1200000;

// STATE
long sequenceNumber = 0;

// SAMPLING
const unsigned long CURRENT_WINDOW_MS = 200;
const int CURRENT_AVG_WINDOWS = 5;
const int VOLTAGE_SAMPLES     = 256;

//For appliance fingerprinting
struct Features { float rms, peak, crest, form, shape; };

// Fast readings
struct Reading {
  float voltage, current, watts, kwh;
  float crest, form, shape, peak;
};

//For testing
unsigned long t;



void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("beepBoop — firmware v2 (energy reporting, tiered billing)");

  if (!LittleFS.begin(true)) { Serial.println("LittleFS failed."); while (1); }
  Wire.begin(21, 22);
  if (!ads.begin()) { Serial.println("ADS1115 not found."); while (1); }
  ads.setDataRate(RATE_ADS1115_860SPS);
  ads.setGain(GAIN_TWOTHIRDS);

  connectWiFi();
  Serial.print("Initial time sync");
  syncTime();
  Serial.println("Setup complete.\n");
}


// WIFI
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500); Serial.print("."); tries++;
  }
}


// HARDENED TIME
void syncTime() {
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC,
             "pool.ntp.org", "time.google.com", "time.nist.gov");
  struct tm t; int tries = 0;
  while (!getLocalTime(&t) && tries < 10) { delay(500); Serial.print("."); tries++; }
  if (tries < 10) { timeIsSynced = true; lastSync = millis(); Serial.println(" synced"); }
  else Serial.println(" failed, will retry");
}

void maintainTime() {
  if (WiFi.status() == WL_CONNECTED &&
      (!timeIsSynced || millis() - lastSync > SYNC_INTERVAL)) syncTime();
}

String getTimestamp() {
  struct tm t;
  if (!timeIsSynced || !getLocalTime(&t)) return "UNSYNCED";
  char buf[25];
  sprintf(buf, "%04d-%02d-%02dT%02d:%02d:%02d",
          t.tm_year+1900, t.tm_mon+1, t.tm_mday, t.tm_hour, t.tm_min, t.tm_sec);
  return String(buf);
}


// ADAPTIVE INTERVAL 
unsigned long getInterval() {
  if (WiFi.status() == WL_CONNECTED) { offlineSince = 0; return INTERVAL_ONLINE; }
  if (offlineSince == 0) offlineSince = millis();
  unsigned long dur = millis() - offlineSince;
  if (dur < 10UL*60*1000)      return INTERVAL_OFFLINE_1;
  else if (dur < 60UL*60*1000) return INTERVAL_OFFLINE_2;
  else                         return INTERVAL_OFFLINE_3;
}

//VOLTAGE (A2 single-ended)

float readVoltage() {
  long sumRaw = 0; float sumSq = 0;
  for (int i = 0; i < VOLTAGE_SAMPLES; i++) sumRaw += ads.readADC_SingleEnded(2);
  float mid = (float)sumRaw / VOLTAGE_SAMPLES;
  for (int i = 0; i < VOLTAGE_SAMPLES; i++) {
    float s = ads.readADC_SingleEnded(2) - mid;
    float v = s * ADS_GAIN_VOLTS; sumSq += v*v;
  }
  float voltage = sqrt(sumSq / VOLTAGE_SAMPLES) * VOLTAGE_CALIBRATION;
  if (voltage < 20) voltage = 0.0;
  return voltage;
}

// UNIFIED READING — one current window feeds RMS + shape features

Reading takeReading(float elapsedSec) {
  const int N = 256;
  static int16_t buf[256];

  long sum = 0;
  for (int i = 0; i < N; i++) { buf[i] = ads.readADC_Differential_0_1(); sum += buf[i]; }
  float mid = (float)sum / N;

  float sumSq = 0, sumAbs = 0, peak = 0;
  for (int i = 0; i < N; i++) {
    float c = buf[i] - mid;
    sumSq += c*c; sumAbs += fabs(c);
    if (fabs(c) > peak) peak = fabs(c);
  }
  float rms_raw  = sqrt(sumSq / N);
  float mean_abs = sumAbs / N;

  Reading r;
  r.current = rms_raw * ADS_GAIN_VOLTS * CURRENT_FACTOR * CURRENT_CALIBRATION;
  if (r.current < 0.05) r.current = 0.0;
  r.peak    = peak    * ADS_GAIN_VOLTS * CURRENT_FACTOR * CURRENT_CALIBRATION;
  r.crest   = (rms_raw > 0) ? peak / rms_raw : 0;
  r.form    = (mean_abs > 0) ? rms_raw / mean_abs : 0;
  r.shape   = (rms_raw > 0) ? mean_abs / rms_raw : 0;

  r.voltage = readVoltage();
  r.watts   = r.voltage * r.current;
  r.kwh     = (r.watts / 1000.0) * (elapsedSec / 3600.0);
  return r;
}


String buildJson(int clampId, float voltage, float current,
                 float watts, float kwh, float elapsedSec,
                 float crest, float form, float shape, float peak) {
  sequenceNumber++;
  
  String json = "{";
  json += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  json += "\"clamp_id\":" + String(clampId) + ",";
  json += "\"timestamp\":\"" + getTimestamp() + "\",";
  json += "\"voltage\":" + String(voltage, 1) + ",";
  json += "\"current\":" + String(current, 3) + ",";
  json += "\"watts\":" + String(watts, 1) + ",";
  json += "\"interval_sec\":" + String(elapsedSec, 2) + ",";
  json += "\"kwh\":" + String(kwh, 8) + ",";
  json += "\"seq\":" + String(sequenceNumber) + ",";
  json += "\"ms_since_boot\":" + String(millis()) + ",";
  json += "\"time_status\":\"" + String(timeIsSynced ? "synced" : "unsynced") + "\",";  // <- comma added
  json += "\"crest\":" + String(crest, 3) + ",";
  json += "\"form\":"  + String(form, 3)  + ",";
  json += "\"shape\":" + String(shape, 3) + ",";
  json += "\"peak\":"  + String(peak, 3);   // <- no trailing comma, this is last
  json += "}";
  return json;
}


// POST 
bool postJson(String json) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(json);
  http.end();
  return (code == 200 || code == 201);
}


// BUFFER 
void trimOldestReadings() {
  File f = LittleFS.open(BUFFER_FILE, "r");
  int total = 0;
  while (f.available()) { f.readStringUntil('\n'); total++; }
  f.close();
  int skip = total / 2;

  f = LittleFS.open(BUFFER_FILE, "r");
  File temp = LittleFS.open("/temp.txt", "w");
  int line = 0;
  while (f.available()) {
    String l = f.readStringUntil('\n');
    if (line >= skip) temp.println(l);
    line++;
  }
  f.close(); temp.close();
  LittleFS.remove(BUFFER_FILE);
  LittleFS.rename("/temp.txt", BUFFER_FILE);
  Serial.println("Buffer trimmed (kept newest half).");
}

void saveToBuffer(String json) {
  size_t size = 0;
  if (LittleFS.exists(BUFFER_FILE)) {
    File f = LittleFS.open(BUFFER_FILE, "r"); size = f.size(); f.close();
  }
  if (size > MAX_BUFFER_BYTES) trimOldestReadings();
  File f = LittleFS.open(BUFFER_FILE, "a");
  f.println(json); f.close();
  Serial.println("Stored offline.");
}

void flushBuffer() {
  if (!LittleFS.exists(BUFFER_FILE) || WiFi.status() != WL_CONNECTED) return;
  File f = LittleFS.open(BUFFER_FILE, "r");
  String remaining = ""; bool stopped = false;
  while (f.available()) {
    String line = f.readStringUntil('\n'); line.trim();
    if (line.length() == 0) continue;
    if (stopped) { remaining += line + "\n"; continue; }
    if (postJson(line)) { /* uploaded, drop it */ }
    else { remaining += line + "\n"; stopped = true; }
  }
  f.close();
  if (remaining.length() == 0) {
    LittleFS.remove(BUFFER_FILE);
    Serial.println("Buffer cleared.");
  } else {
    File w = LittleFS.open(BUFFER_FILE, "w"); w.print(remaining); w.close();
    Serial.println("Kept unsent readings.");
  }
}


//  SERIAL COMMANDS 
void dumpBuffer() {
  if (!LittleFS.exists(BUFFER_FILE)) { Serial.println("Buffer empty."); return; }
  File f = LittleFS.open(BUFFER_FILE, "r");
  int n = 0;
  Serial.println("───── BUFFER ─────");
  while (f.available()) {
    String l = f.readStringUntil('\n'); l.trim();
    if (l.length()) { Serial.println(l); n++; }
  }
  f.close();
  Serial.println("───── " + String(n) + " readings ─────");
}


// MAIN LOOP 
void loop() {
  if (Serial.available()) {
    char c = Serial.read();
    if (c == 'd') dumpBuffer();
    if (c == 'c') { LittleFS.remove(BUFFER_FILE); Serial.println("Buffer cleared."); }
  }

  currentInterval = getInterval();
  if (millis() - lastSend < currentInterval) return;

  // Measure the interval this reading actually represents
  unsigned long nowMs   = millis();
  unsigned long elapsed = (lastSend == 0) ? currentInterval : (nowMs - lastSend);
  lastSend = nowMs;
  float elapsedSec = elapsed / 1000.0;

  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  maintainTime();
  flushBuffer();

  Reading r = takeReading(elapsedSec);
  String json = buildJson(1, r.voltage, r.current, r.watts, r.kwh,
                        elapsedSec, r.crest, r.form, r.shape, r.peak);

  Serial.print("seq "); Serial.print(sequenceNumber);
  Serial.print(" | "); Serial.print(r.voltage, 1); Serial.print("V ");
  Serial.print(r.current, 3); Serial.print("A ");
  Serial.print(r.watts, 1);   Serial.print("W | ");
  Serial.print(r.kwh, 8);     Serial.print(" kWh over ");
  Serial.print(elapsedSec, 1); Serial.print("s | ");
  Serial.println(getTimestamp());

  if (postJson(json)) Serial.println("Sent live → OK");
  else saveToBuffer(json);
}