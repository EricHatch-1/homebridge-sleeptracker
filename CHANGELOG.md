# Changelog

## 0.3.6
- Adds polite auth backoff and disables API calls after repeated auth failures.
- Populates accessory info from device metadata (model/serial/firmware).
- Expands default commands and documents advanced commands.

## 0.3.5
- Fixes config schema required fields to satisfy verification checks.

## 0.3.4
- Adds state polling to keep the Bed Light switch state in sync.
- Adds `statusPollIntervalSeconds` to control the polling interval.

## 0.3.3
- Removes massage adjustment from the Homebridge UI config.

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
