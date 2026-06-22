import json
import threading
from datetime import datetime
from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.vibration_anomaly_detection import VibrationAnomalyDetection

logger = Logger("vibration-detector")

# ── AI Brick ─────────────────────────────────────────────────
vibration_detection = VibrationAnomalyDetection(anomaly_detection_threshold=1.0)

def on_override_th(value: float):
    try:
        vibration_detection.anomaly_detection_threshold = value
    except ValueError as exc:
        logger.warning(f"Ignoring invalid anomaly threshold {value!r}: {exc}")
        return
    logger.info(f"Setting new anomaly threshold: {vibration_detection.anomaly_detection_threshold}")

# ── Web UI ────────────────────────────────────────────────────
ui = WebUI()
ui.on_message("override_th", lambda sid, threshold: on_override_th(threshold))

def get_fan_status(anomaly_detected: bool):
    return {
        "anomaly": anomaly_detected,
        "status_text": "Anomaly detected!" if anomaly_detected else "No anomaly"
    }

# ── Alert Timer (same pattern as working buzzer code) ─────────
BUZZER_DURATION_S = 3.0
_alarm_timer = None

def _reset_alarm():
    """Called after BUZZER_DURATION_S — turns off buzzer, red LED, turns green LED back on."""
    global _alarm_timer
    _alarm_timer = None

    # Buzzer OFF (unchanged)
    Bridge.call("set_alarm_pin", False)

    # Red LED OFF → Green LED ON (safe state restored)
    Bridge.call("set_red_led",   False)
    Bridge.call("set_green_led", True)

    ui.send_message('fan_status_update', get_fan_status(False))
    logger.info("Alert cleared — green LED ON, red LED OFF, buzzer OFF")

# ── Anomaly Handler ───────────────────────────────────────────
def on_detected_anomaly(anomaly_score: float, classification: dict):
    global _alarm_timer

    anomaly_payload = {
        "score": anomaly_score,
        "timestamp": datetime.now().isoformat()
    }

    # Send to WebUI
    ui.send_message('anomaly_detected', json.dumps(anomaly_payload))
    ui.send_message('fan_status_update', get_fan_status(True))

    # Buzzer ON (unchanged)
    Bridge.call("set_alarm_pin", True)

    # Green LED OFF → Red LED ON
    Bridge.call("set_green_led", False)
    Bridge.call("set_red_led",   True)

    logger.warning(f"EARTHQUAKE RISK — score: {anomaly_score:.3f} | Red LED ON, Buzzer ON")

    # Only start a new timer if one isn't already running
    if _alarm_timer is not None:
        return
    _alarm_timer = threading.Timer(BUZZER_DURATION_S, _reset_alarm)
    _alarm_timer.daemon = True
    _alarm_timer.start()

vibration_detection.on_anomaly(on_detected_anomaly)

# ── Sensor Data Handler ───────────────────────────────────────
def record_sensor_movement(x: float, y: float, z: float):
    x_ms2 = x * 9.81
    y_ms2 = y * 9.81
    z_ms2 = z * 9.81

    ui.send_message('sample', {'x': x_ms2, 'y': y_ms2, 'z': z_ms2})
    vibration_detection.accumulate_samples((x_ms2, y_ms2, z_ms2))

# ── Bridge RPC Provider ───────────────────────────────────────
Bridge.provide("record_sensor_movement", record_sensor_movement)

App.run()