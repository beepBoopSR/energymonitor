//Deze firmware was gebruikt om de data te verzamelen voor appliance fingerprinting

#include <Wire.h>
#include <Adafruit_ADS1X15.h>

Adafruit_ADS1115 ads;

// !!!code runnde eerst met 220 ohms, maar calibration factor was van 22 ohms. dus alles was 10x kleiner. ik heb de burden_resistor constant verandert, maar sinds de code niet gerunned 

const float ADS_GAIN_VOLTS      = 0.0001875;
const float BURDEN_RESISTOR     = 22.0;   // your actual resistor
const int   CT_TURNS            = 2000;
const float CURRENT_FACTOR      = (float)CT_TURNS / BURDEN_RESISTOR;
const float CURRENT_CALIBRATION = 0.1255;  // note: paired with the 220R, leave as-is

// Capture window: long enough for many cycles, fast as the ADS allows
const int   SAMPLES = 400;                 // ~0.5s of samples at 860 SPS

void setup() {
  Serial.begin(115200);
  delay(1000);
  Wire.begin(21, 22);
  if (!ads.begin()) { Serial.println("ADS1115 not found."); while (1); }
  ads.setDataRate(RATE_ADS1115_860SPS);
  ads.setGain(GAIN_TWOTHIRDS);
  Serial.println("beepBoop — appliance feature capture");
  Serial.println("Type a label + Enter (e.g. 'grill') to capture one sample.\n");
  Serial.println("label,rms_a,peak_a,crest,form,zero_cross,shape");
}

void captureFeatures(String label) {
  int16_t buf[SAMPLES];
  long sum = 0;

  // Grab the raw window
  for (int i = 0; i < SAMPLES; i++) { buf[i] = ads.readADC_Differential_0_1(); sum += buf[i]; }
  float mid = (float)sum / SAMPLES;

  // Derived features
  float sumSq = 0, sumAbs = 0, peak = 0;
  int   zeroCross = 0;
  float prev = buf[0] - mid;

  for (int i = 0; i < SAMPLES; i++) {
    float c = buf[i] - mid;
    sumSq  += c * c;
    sumAbs += fabs(c);
    if (fabs(c) > peak) peak = fabs(c);
    if ((c > 0 && prev <= 0) || (c < 0 && prev >= 0)) zeroCross++;
    prev = c;
  }

  float rms_raw  = sqrt(sumSq / SAMPLES);
  float mean_abs = sumAbs / SAMPLES;

  // Convert the electrical ones to amps using your calibration
  float rms_a  = rms_raw * ADS_GAIN_VOLTS * CURRENT_FACTOR * CURRENT_CALIBRATION;
  float peak_a = peak    * ADS_GAIN_VOLTS * CURRENT_FACTOR * CURRENT_CALIBRATION;

  // Shape features — unit-less, describe the waveform not its size
  float crest = (rms_raw > 0) ? peak / rms_raw : 0;        // peakiness
  float form  = (mean_abs > 0) ? rms_raw / mean_abs : 0;   // form factor
  float shape = (rms_raw > 0) ? mean_abs / rms_raw : 0;    // inverse form

  // CSV line
  Serial.print(label);        Serial.print(",");
  Serial.print(rms_a, 3);     Serial.print(",");
  Serial.print(peak_a, 3);    Serial.print(",");
  Serial.print(crest, 3);     Serial.print(",");
  Serial.print(form, 3);      Serial.print(",");
  Serial.print(zeroCross);    Serial.print(",");
  Serial.println(shape, 3);
}

void loop() {
  if (Serial.available()) {
    String label = Serial.readStringUntil('\n');
    label.trim();
    if (label.length() > 0) captureFeatures(label);
  }
}