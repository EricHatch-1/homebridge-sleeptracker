# Changelog

## 0.3.2
- Fixes Homebridge UI config rendering and improves field guidance.

## 0.3.1
- Expands default command list to include common positions and incremental controls.
- Notes Safety Light toggle vs stateful behavior in README.

## 0.3.0
- Adds environmental sensors (temperature, humidity, CO2, VOC, IAQ) via `/processor/latestEnvironmentSensorData`.
- Exposes Air Quality as both a raw IAQ value (in logs/attributes) and HomeKit AirQuality levels.

## 0.2.0
- Adds a **stateful** Safety Light switch (reads `safetyLightOn` and only toggles when needed).

## 0.1.1
- Fix: switch accessory now calls the correct client (was incorrectly calling the Homebridge API object).

## 0.1.0
- Initial release.
