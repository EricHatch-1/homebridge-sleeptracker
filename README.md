# homebridge-sleeptracker-bed

[![verified-by-homebridge](https://img.shields.io/badge/homebridge-verified-blueviolet?color=%23491F59&style=for-the-badge&logoColor=%23FFFFFF&logo=homebridge)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)


![Sleeptracker icon](https://raw.githubusercontent.com/EricHatch-1/homebridge-sleeptracker/main/assets/icon-100.png)

Homebridge plugin that exposes Sleeptracker adjustable base commands to Apple Home.

## Requirements
- Homebridge >= 1.8
- Node.js >= 20

## Features
- Commands are exposed as HomeKit switches.
- Most commands are **momentary switches** (turn ON → send command → reset OFF).
- **Bed Light** (command `230`) is a **true stateful switch**: it reads `safetyLightOn` from controller status and only toggles when needed.
- **Environment sensors** (optional, enabled by default): Temperature, Humidity, CO2, VOC, Air Quality.
- Configurable Bed Light polling interval to keep HomeKit in sync.
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
  "statusPollIntervalSeconds": 15,
  "commands": [
    {"name": "Flat", "command": 2},
    {"name": "Zero-G", "command": 0},
    {"name": "TV Position", "command": 3},
    {"name": "Anti-Snore", "command": 4},
    {"name": "Favorite 1", "command": 6},
    {"name": "Favorite 2", "command": 9},
    {"name": "Toggle Bed Light", "command": 230},
    {"name": "Massage On", "command": 200},
    {"name": "Massage Off", "command": 201},
    {"name": "Massage Head", "command": 210},
    {"name": "Massage Foot", "command": 211},
    {"name": "Toggle Massage", "command": 225},
    {"name": "Massage Pattern Step", "command": 226},
    {"name": "Head Up (Increment)", "command": 110},
    {"name": "Head Down (Increment)", "command": 111},
    {"name": "Head Tilt Up (Increment)", "command": 123},
    {"name": "Head Tilt Down (Increment)", "command": 124},
    {"name": "Head Tilt Stop", "command": 122},
    {"name": "Foot Up (Increment)", "command": 112},
    {"name": "Foot Down (Increment)", "command": 113},
    {"name": "Lumbar Up (Increment)", "command": 114},
    {"name": "Lumbar Down (Increment)", "command": 115},
    {"name": "Stop All", "command": 1},
    {"name": "Stop Everything", "command": 31},
    {"name": "Head Stop", "command": 107},
    {"name": "Foot Stop", "command": 108},
    {"name": "Lumbar Stop", "command": 106}
  ]
}
```

Notes:
- `processorId` is optional. If omitted, the plugin calls `getActiveSleeptracker` to resolve it.
- `exposeEnvironment` (default true) exposes Temperature/Humidity/CO2/VOC/Air Quality as HomeKit sensors.
- `statusPollIntervalSeconds` (default 15) controls how often the Bed Light state is refreshed.
- `authFailureCooldownSeconds` (default 300) backs off login attempts after a failed auth.
- `authMaxFailures` (default 5) disables API calls after repeated auth failures until restart/config change.
- Credentials live in your Homebridge config; **don’t share** `config.json` publicly.
- If you edit `config.json` manually and omit `commands`, no command accessories will be created. Use the Homebridge UI (recommended) or copy the default list above.
- If you change the `commands` list, Homebridge may keep old cached accessories. In that case, remove the stale accessories in the Home app, or delete the cached accessories in Homebridge and restart.
- The Bed Light uses the same command (`230`) for both a momentary **Toggle Bed Light** switch and the **stateful Bed Light** behavior. Keep whichever behavior matches your preference.

## Command reference (common)
This plugin sends commands via the Sleeptracker adjustable base control API. Each command is an integer ID.

### Default commands (as shipped)
| Name | Command |
| --- | --- |
| Flat | 2 |
| Zero-G | 0 |
| TV Position | 3 |
| Anti-Snore | 4 |
| Favorite 1 | 6 |
| Favorite 2 | 9 |
| Toggle Bed Light | 230 |
| Massage On | 200 |
| Massage Off | 201 |
| Massage Head | 210 |
| Massage Foot | 211 |
| Toggle Massage | 225 |
| Massage Pattern Step | 226 |
| Stop Massagers | 30 |
| Head Up | 100 |
| Head Down | 101 |
| Foot Up | 102 |
| Foot Down | 103 |
| Lumbar Up | 104 |
| Lumbar Down | 105 |
| Head Up (Increment) | 110 |
| Head Down (Increment) | 111 |
| Head Tilt Up (Increment) | 123 |
| Head Tilt Down (Increment) | 124 |
| Head Tilt Stop | 122 |
| Foot Up (Increment) | 112 |
| Foot Down (Increment) | 113 |
| Lumbar Up (Increment) | 114 |
| Lumbar Down (Increment) | 115 |
| Stop All | 1 |
| Stop Everything | 31 |
| Head Stop | 107 |
| Foot Stop | 108 |
| Lumbar Stop | 106 |

### Advanced commands (optional)
These are **not** included by default. Use only if your base supports them.

| Name | Command |
| --- | --- |
| Start Wind Down 1 | 21 |
| Start Wind Down 2 | 22 |
| Head Tilt Up | 120 |
| Head Tilt Down | 121 |
| Toggle Timer | 231 |
| Start Speaker Sync | 240 |
| Stop Speaker Sync | 241 |
| Toggle Speaker Sync | 242 |
| Program TV Position | 300 |
| Program Anti-Snore | 302 |
| Program Zero-G | 303 |
| Program Favorite | 304 |
| Program Favorite 2 | 305 |



### Command fields
- `name`: Display name shown in HomeKit.
- `command`: Integer command ID (see table above or add your own).
- `requestStatus` (optional): If true, asks the controller to return a status snapshot for this command.

### Bed Light behavior
- Command `230` toggles the bed light.
- The **stateful Bed Light** switch reads `safetyLightOn` from the status snapshot and only toggles when needed.

## API reference (observed)
These are the endpoints used by the plugin (matching the official app flow).

- Auth: `POST https://auth.tsi.sleeptracker.com/v1/app/user/session`
  - Basic auth with your email/password.
  - Returns a short‑lived bearer token.
- Controller API base: `https://app.tsi.sleeptracker.com/actrack-client/v2/fpcsiot`
  - `POST /processor/getActiveSleeptracker` (resolve `sleeptrackerProcessorID`)
  - `POST /processor/getSleeptracker` (device details for accessory info)
  - `POST /processor/adjustableBaseControls` (send commands)
  - `POST /processor/latestEnvironmentSensorData` (environment sensors)
  - `POST /processor/getState` (controller state)

Notes:
- A status snapshot can also be requested by sending command `500` with `requestStatus=true`.
- Some accounts require a `namespace` in the auth URL; the plugin supports this in config.
- This README intentionally documents only the endpoints used by the plugin.

## Known Limitations

- Repeated auth failures trigger a cooldown and eventually disable API calls until restart.
- Not all commands are supported by every base model; remove any commands that do not work with your hardware.
- `getState` does not include environmental readings; those come from `latestEnvironmentSensorData`.
- The plugin intentionally avoids administrative or destructive API endpoints.

## Troubleshooting
- If you change the `commands` list, Homebridge may keep old cached accessories. Remove the stale accessories in the Home app or delete cached accessories in Homebridge and restart.
- If you see auth errors, confirm your Sleeptracker credentials and, if needed, set the correct `namespace`.

## Support
Please open an issue on GitHub for bugs and feature requests:
https://github.com/EricHatch-1/homebridge-sleeptracker/issues

## Privacy
This plugin uses your Sleeptracker credentials to obtain a short‑lived bearer token and sends commands to Sleeptracker cloud endpoints. Tokens are held in memory only and are not persisted. The plugin does not store data outside of Homebridge.

## License
MIT