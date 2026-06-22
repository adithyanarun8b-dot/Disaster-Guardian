# Disaster Guardian AI
### Multi-Hazard Early Warning System powered by Edge AI & Sensor Fusion

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Platform](https://img.shields.io/badge/Platform-Arduino%20UNO%20Q-blue)
![AI](https://img.shields.io/badge/AI-Edge%20Anomaly%20Detection-orange)
![License](https://img.shields.io/badge/License-MIT-lightgrey)
![Competition](https://img.shields.io/badge/IEEE%20MYOSA%206.0-Sensors%20Council-blueviolet)

---

## 📖 Overview

**Disaster Guardian AI** is a real-time, Edge AI-powered Multi-Hazard Early Warning System designed to detect early indicators of natural disasters including **earthquakes**, **landslides**, and **structural disturbances** — all processed locally on the device without relying on cloud services.

Built on the **Arduino UNO Q** platform with a **Modulino IMU sensor**, the system continuously analyzes three-axis acceleration and vibration data using a trained Edge AI anomaly detection model. When abnormal patterns are identified, it triggers instant multi-channel alerts — visual, audible, on-device display, and a live web dashboard — giving communities and authorities the critical seconds needed to respond.

> Unlike traditional threshold-based sensors, Disaster Guardian AI uses an **adaptive AI-driven approach** that learns normal environmental patterns and intelligently flags deviations — dramatically reducing false alarms while improving detection reliability.

---

## 🎯 Problem Statement

Natural disasters often provide subtle warning signs before major events occur. However, these early indicators are frequently missed due to:

- Limited and expensive monitoring infrastructure
- Systems designed for single-hazard detection only
- Heavy dependence on cloud connectivity during critical moments
- Lack of accessible solutions for rural and resource-constrained communities

Disaster Guardian AI addresses this gap by delivering a **unified, affordable, intelligent monitoring node** that operates independently at the edge.

---

## ✨ Key Features

- 🧠 **Edge AI Anomaly Detection** — Trained model runs fully on-device, no cloud required
- 📡 **Real-Time IMU Sensing** — 3-axis accelerometer data at 62.5Hz sampling rate
- 🌐 **Live Web Dashboard** — Real-time waveform, status, alerts, and threshold control
- 🚨 **Multi-Channel Alerting** — Buzzer + Red/Green LED + OLED display simultaneously
- ⚙️ **Adjustable Sensitivity** — Live threshold tuning via web interface
- 📊 **Sensor Fusion Ready** — Architecture designed for multi-sensor expansion
- 🔋 **Edge-First Design** — Low latency, works without internet connectivity
- 📱 **Responsive Dashboard** — Works on desktop, tablet, and mobile

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Arduino UNO Q                         │
│                                                         │
│  Modulino IMU (LSM6DSOX)                               │
│  62.5Hz → X, Y, Z acceleration                        │
│       │                                                 │
│  Arduino Bridge (Router Bridge RPC)                    │
│       │                                                 │
└───────┼─────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│                Python Processing Layer                  │
│                                                         │
│  g → m/s² conversion                                   │
│  Edge AI Anomaly Detection Brick                       │
│  Anomaly Score Computation                             │
│       │                                                 │
│  ┌────┴────────────────────────────┐                   │
│  │         Alert Triggers          │                   │
│  │  Bridge.call → Buzzer (Pin 13) │                   │
│  │  Bridge.call → Red LED (Pin 8) │                   │
│  │  Bridge.call → Green LED(Pin 7)│                   │
│  │  Bridge.call → OLED Display    │                   │
│  │  Socket.IO  → Web Dashboard    │                   │
│  └─────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│              Web Dashboard (WebUI)                      │
│                                                         │
│  Live Seismic Waveform (X/Y/Z)                        │
│  System Status  SAFE / DANGER                          │
│  Real-Time Anomaly Alerts + History                    │
│  Sensitivity Threshold Control                         │
│  Uptime Counter + Connection Status                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🧰 Hardware

| Component | Model | Purpose |
|---|---|---|
| Microcontroller | Arduino UNO Q | Main processing unit |
| IMU Sensor | Modulino IMU (LSM6DSOX) | 3-axis acceleration sensing |
| OLED Display | SSD1306 128×64 I2C | On-device status display |
| Buzzer | Passive Buzzer | Audible earthquake alert |
| Red LED | 5mm LED + 220Ω resistor | Visual danger indicator |
| Green LED | 5mm LED + 220Ω resistor | Visual safe indicator |

### 🔌 Wiring

| Component | Arduino UNO Q Pin |
|---|---|
| Modulino IMU | Wire1 (Qwiic connector) |
| OLED SDA | SDA |
| OLED SCL | SCL |
| OLED VCC | 3.3V |
| OLED GND | GND |
| Green LED (anode) | Pin 7 → 220Ω → GND |
| Red LED (anode) | Pin 8 → 220Ω → GND |
| Buzzer (+) | Pin 13 → GND |

---

## 💻 Software Stack

| Layer | Technology |
|---|---|
| Firmware | Arduino (C++) via Arduino App Lab |
| Bridge Communication | Arduino Router Bridge RPC |
| AI Processing | Edge AI Anomaly Detection Brick |
| Backend | Python 3 |
| Real-Time Communication | Socket.IO |
| Web Frontend | HTML5 + CSS3 + Vanilla JS |
| Display Library | SSD1306Ascii (Zephyr compatible) |

---

## 📁 Project Structure

```
disaster-guardian/
│
├── sketch/
│   └── sketch.ino          # Arduino firmware — IMU, LEDs, buzzer, OLED
│
├── main.py                 # Python bridge — AI detection, alert routing
│
├── web/
│   ├── index.html          # Web dashboard UI
│   ├── style.css           # Dark tactical theme styling
│   ├── app.js              # Socket.IO real-time logic
│   └── libs/
│       └── socket.io.min.js
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Arduino App Lab installed
- Arduino UNO Q board
- Python 3.x
- Libraries installed in App Lab:
  - `Arduino_Modulino` v0.7
  - `Arduino_RouterBridge`
  - `SSD1306Ascii` (by Bill Greiman)

### Installation

1. **Clone this repository**
```bash
git clone https://github.com/YOUR_USERNAME/disaster-guardian.git
cd disaster-guardian
```

2. **Open Arduino App Lab** and load the project folder

3. **Install required libraries** via Library Manager in App Lab:
   - `Arduino_Modulino` (v0.7)
   - `SSD1306Ascii`

4. **Upload** `sketch.ino` to your Arduino UNO Q

5. **Run** the Python backend:
```bash
python main.py
```

6. **Open** the Web Dashboard in your browser at the address shown in the App Lab terminal

---

## 🌐 Web Dashboard Features

| Feature | Description |
|---|---|
| Live Seismic Waveform | Real-time X/Y/Z axis plotting at 62.5Hz |
| Axis Readout Cards | Live X, Y, Z and magnitude values in m/s² |
| System Status Panel | Animated SAFE / DANGER indicator |
| Alert Banner | Sliding top banner on anomaly detection |
| Sensitivity Threshold | Live AI threshold adjustment (0–20+) |
| Recent Alerts Log | Last 5 anomaly events with score + timestamp |
| Uptime Counter | Live HH:MM:SS monitoring uptime |
| Connection Status | Real-time board connection indicator |

---

## 🧠 How the AI Works

The Edge AI anomaly detection brick is trained on **normal vibration patterns** from the deployment environment. At runtime, each incoming sensor sample is scored against these learned patterns. The score represents how far the current vibration deviates from normal — a higher score means more anomalous behavior.

```
Normal vibration  →  Low anomaly score  →  SAFE state
Abnormal vibration →  High anomaly score →  DANGER alert triggered
```

The detection threshold is user-adjustable in real time via the web dashboard, allowing sensitivity to be tuned based on the specific deployment environment.

---

## 🌍 Applications

- 🏔️ Earthquake early warning systems
- 🏗️ Structural health monitoring (buildings, bridges)
- ⛰️ Landslide detection in slope-prone areas
- 🏭 Industrial machine vibration safety
- 🌆 Smart city infrastructure monitoring
- 🏫 Educational disaster preparedness demonstrations

---

## 🔮 Future Scope

- Integration of additional sensors (humidity, pressure, soil moisture) for full multi-hazard detection
- LoRa/GSM wireless alert transmission to remote authorities
- GPS tagging of alert events for geographic mapping
- Multi-node mesh network for area-wide monitoring
- Mobile push notification integration
- Cloud dashboard for multi-site monitoring

---


## 📄 License

This project is licensed under the MIT License. See `LICENSE` for details.