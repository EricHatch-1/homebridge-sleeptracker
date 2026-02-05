# Changelog

## 0.3.0
- Adds environmental sensors (temperature, humidity, CO2, VOC, IAQ) via `/processor/latestEnvironmentSensorData`.
- Exposes Air Quality as both a raw IAQ value (in logs/attributes) and HomeKit AirQuality levels.

## 0.2.0
- Adds a **stateful** Safety Light switch (reads `safetyLightOn` and only toggles when needed).

## 0.1.1
- Fix: switch accessory now calls the correct client (was incorrectly calling the Homebridge API object).

## 0.1.0
- Initial release.
