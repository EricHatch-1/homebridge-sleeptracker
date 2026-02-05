# homebridge-sleeptracker-bed

![Sleeptracker icon](https://raw.githubusercontent.com/EricHatch-1/homebridge-sleeptracker/main/assets/icon-100.png)

Homebridge plugin that exposes Sleeptracker adjustable base commands to Apple Home.

## Requirements
- Homebridge >= 1.8
- Node.js >= 20

## Features
- Commands are exposed as HomeKit switches.
- Most commands are **momentary switches** (turn ON → send command → reset OFF).
- **Safety Light** (command `230`) is a **true stateful switch**: it reads `safetyLightOn` from controller status and only toggles when needed.
- **Environment sensors** (optional, enabled by default): Temperature, Humidity, CO2, VOC, Air Quality.
- Uses the same cloud API flow as the official app (Basic auth → short-lived bearer token).

Notes:
- HomeKit temperature characteristics are **Celsius** internally; Apple Home will display °F if your Home app/device is set to Fahrenheit.

## Install

### Homebridge UI (recommended)
1. Homebridge UI → **Plugins** → search `homebridge-sleeptracker-bed` → Install
2. Configure it (see below)

### CLI
```bash
npm i -g homebridge-sleeptracker-bed
```

### Docker note
If you run Homebridge in Docker, install through the **Homebridge UI** so it persists inside the container.

## Configuration

In Homebridge UI → Plugins → Homebridge Sleeptracker → Settings (or edit `config.json`):

```json
{
  "platform": "Sleeptracker",
  "name": "Sleeptracker",
  "email": "you@example.com",
  "password": "your_password",
  "namespace": "",
  "processorId": null,
  "authClientId": "E3MlC3qvwJbsWo",
  "appClientVersion": "3.2.5",
  "exposeEnvironment": true,
  "commands": [
    {"name": "Flat", "command": 2},
    {"name": "Favorite 1", "command": 6},
    {"name": "Favorite 2", "command": 9},
    {"name": "Toggle Bed Light", "command": 230},
    {"name": "Massage On", "command": 200},
    {"name": "Massage Off", "command": 201}
  ]
}
```

Notes:
- `processorId` is optional. If omitted, the plugin calls `getActiveSleeptracker` to resolve it.
- `exposeEnvironment` (default true) exposes Temperature/Humidity/CO2/VOC/Air Quality as HomeKit sensors.
- `statusPollIntervalSeconds` (default 15) controls how often the Bed Light state is refreshed.
- Credentials live in your Homebridge config; **don’t share** `config.json` publicly.
- If you change the `commands` list, Homebridge may keep old cached accessories. In that case, remove the stale accessories in the Home app, or delete the cached accessories in Homebridge and restart.
- The Bed Light uses the same command (`230`) for both a momentary **Toggle Bed Light** switch and the **stateful Bed Light** behavior. Keep whichever behavior matches your preference.

## Command reference (common)
- Flat: 2
- Fav 1: 6
- Fav 2: 9
- Toggle bed light: 230
- Massage on/off: 200 / 201

## Troubleshooting
- If you change the `commands` list, Homebridge may keep old cached accessories. Remove the stale accessories in the Home app or delete cached accessories in Homebridge and restart.
- If you see auth errors, confirm your Sleeptracker credentials and, if needed, set the correct `namespace`.

## Support
Please open an issue on GitHub for bugs and feature requests:
https://github.com/EricHatch-1/homebridge-sleeptracker/issues

## Privacy
This plugin uses your Sleeptracker credentials to obtain a short‑lived bearer token and sends commands to Sleeptracker cloud endpoints. It does not store data outside of Homebridge.

## License
MIT
