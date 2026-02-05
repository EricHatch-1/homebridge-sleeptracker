/* eslint-disable no-console */

const axios = require('axios');

const PLATFORM_NAME = 'Sleeptracker';
const PLUGIN_NAME = 'homebridge-sleeptracker';

const AUTH_BASE_DEFAULT = 'https://auth.tsi.sleeptracker.com/v1/app';
const FPCSIOT_BASE_DEFAULT = 'https://app.tsi.sleeptracker.com/actrack-client/v2/fpcsiot';

class SleeptrackerClient {
  constructor(log, config) {
    this.log = log;
    this.email = config.email;
    this.password = config.password;
    this.namespace = (config.namespace || '').trim();
    this.processorIdOverride = config.processorId ?? null;

    this.authClientId = config.authClientId || 'E3MlC3qvwJbsWo';
    this.appClientVersion = config.appClientVersion || '3.2.5';

    this.authBase = (config.authBase || AUTH_BASE_DEFAULT).replace(/\/+$/, '');
    this.fpcsiotBase = (config.fpcsiotBase || FPCSIOT_BASE_DEFAULT).replace(/\/+$/, '');

    this.token = null;
    this.tokenExp = 0;
    this.processorId = this.processorIdOverride;

    this.http = axios.create({ timeout: 30000 });
  }

  _makeId(prefix='HB') {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  async _refreshToken() {
    let base = this.authBase;
    if (this.namespace) {
      if (base.endsWith('/app')) {
        base = base.slice(0, base.lastIndexOf('/app'));
      }
      base = `${base.replace(/\/+$/, '')}/namespace/${this.namespace}/app`;
    }

    const url = `${base}/user/session`;
    const basic = Buffer.from(`${this.email}:${this.password}`, 'utf8').toString('base64');

    const body = {
      clientID: this.authClientId,
      clientVersion: this.appClientVersion,
      id: 'Android: getNewSession',
    };

    const resp = await this.http.post(url, body, {
      headers: {
        Authorization: `Basic ${basic}`,
      },
    });

    const data = resp.data;
    if (!data || !data.token) {
      throw new Error('Auth succeeded but no token returned');
    }

    this.token = data.token;
    this.tokenExp = Number(data.expirationTimeSecs || 0);

    // Don’t log secrets.
    this.log.debug(`Got token exp=${this.tokenExp}`);
  }

  async _ensureToken() {
    const now = Math.floor(Date.now() / 1000);
    if (!this.token || (this.tokenExp - now) < 60) {
      await this._refreshToken();
    }
    return this.token;
  }

  async _call(path, payload) {
    const token = await this._ensureToken();
    const url = `${this.fpcsiotBase}${path}`;
    const body = Object.assign({}, payload);
    body.clientID = body.clientID || 'sleeptracker-android-tsi';
    body.clientVersion = body.clientVersion || this.appClientVersion;
    body.id = body.id || this._makeId('HB');

    try {
      const resp = await this.http.post(url, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return resp.data;
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        this.token = null;
        const token2 = await this._ensureToken();
        const resp2 = await this.http.post(url, body, {
          headers: { Authorization: `Bearer ${token2}` },
        });
        return resp2.data;
      }
      throw err;
    }
  }

  async resolveProcessorId() {
    if (this.processorIdOverride != null) {
      this.processorId = this.processorIdOverride;
      return this.processorId;
    }
    if (this.processorId != null) {
      return this.processorId;
    }
    const data = await this._call('/processor/getActiveSleeptracker', {});
    const pid = data.sleeptrackerProcessorID ?? data.processorID;
    if (pid == null) {
      throw new Error('Could not determine sleeptrackerProcessorID');
    }
    this.processorId = Number(pid);
    return this.processorId;
  }

  async sendCommand({ command, massageAdjustment = null, requestStatus = null }) {
    const body = { bedControlCommand: Number(command) };
    if (massageAdjustment != null) body.massageAdjustment = Number(massageAdjustment);
    if (requestStatus != null) body.requestStatus = Boolean(requestStatus);
    return await this._call('/processor/adjustableBaseControls', body);
  }

  async requestStatusSnapshot() {
    const resp = await this.sendCommand({ command: 500, requestStatus: true });
    const body = resp?.body;
    const snaps = body?.snapshots;
    if (Array.isArray(snaps) && snaps.length > 0) {
      const side0 = snaps.find(s => s && typeof s === 'object' && s.side === 0);
      return side0 || snaps[0];
    }
    return null;
  }

  async getSafetyLightOn() {
    const snap = await this.requestStatusSnapshot();
    if (!snap) return null;
    return !!snap.safetyLightOn;
  }

  async setSafetyLight(desiredOn) {
    const current = await this.getSafetyLightOn();
    if (current === null) {
      // Best-effort toggle
      await this.sendCommand({ command: 230 });
      return;
    }
    if (!!current === !!desiredOn) return;
    await this.sendCommand({ command: 230 });
  }

  async getLatestEnvironment() {
    const pid = await this.resolveProcessorId();
    return await this._call('/processor/latestEnvironmentSensorData', {
      sleeptrackerProcessorID: pid,
    });
  }
}

function mapIaqToHomeKitAirQuality(iaqValue) {
  // Heuristic mapping (lower is better):
  // 1 = EXCELLENT, 2 = GOOD, 3 = FAIR, 4 = INFERIOR, 5 = POOR
  const v = Number(iaqValue);
  if (!Number.isFinite(v)) return 0; // unknown
  if (v <= 50) return 1;
  if (v <= 100) return 2;
  if (v <= 150) return 3;
  if (v <= 200) return 4;
  return 5;
}

class SleeptrackerEnvironmentAccessory {
  constructor(platform, accessory) {
    this.platform = platform;
    this.log = platform.log;
    this.client = platform.client;
    this.accessory = accessory;

    this.state = {
      degreesCelsius: null,
      humidityPercentage: null,
      co2Ppm: null,
      vocPpb: null,
      iaq: null,
      updated: 0,
    };

    accessory.getService(platform.Service.AccessoryInformation)
      .setCharacteristic(platform.Characteristic.Manufacturer, 'Sleeptracker')
      .setCharacteristic(platform.Characteristic.Model, 'Adjustable Base')
      .setCharacteristic(platform.Characteristic.SerialNumber, String(platform._processorId || 'unknown'));

    this.tempService = accessory.getService(platform.Service.TemperatureSensor)
      || accessory.addService(platform.Service.TemperatureSensor, 'Bed Temperature');

    this.humidityService = accessory.getService(platform.Service.HumiditySensor)
      || accessory.addService(platform.Service.HumiditySensor, 'Bed Humidity');

    this.co2Service = accessory.getService(platform.Service.CarbonDioxideSensor)
      || accessory.addService(platform.Service.CarbonDioxideSensor, 'Bed CO2');

    this.airService = accessory.getService(platform.Service.AirQualitySensor)
      || accessory.addService(platform.Service.AirQualitySensor, 'Bed Air Quality');

    this.tempService.getCharacteristic(platform.Characteristic.CurrentTemperature)
      .onGet(() => this.state.degreesCelsius ?? 0);

    this.humidityService.getCharacteristic(platform.Characteristic.CurrentRelativeHumidity)
      .onGet(() => this.state.humidityPercentage ?? 0);

    this.co2Service.getCharacteristic(platform.Characteristic.CarbonDioxideLevel)
      .onGet(() => this.state.co2Ppm ?? 0);

    // Some clients use CarbonDioxideDetected; set a simple threshold.
    if (platform.Characteristic.CarbonDioxideDetected) {
      this.co2Service.getCharacteristic(platform.Characteristic.CarbonDioxideDetected)
        .onGet(() => ((this.state.co2Ppm ?? 0) >= 1200
          ? platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL
          : platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL));
    }

    this.airService.getCharacteristic(platform.Characteristic.AirQuality)
      .onGet(() => mapIaqToHomeKitAirQuality(this.state.iaq));

    // VOCDensity is optional depending on platform/homebridge version.
    if (platform.Characteristic.VOCDensity) {
      this.airService.getCharacteristic(platform.Characteristic.VOCDensity)
        .onGet(() => this.state.vocPpb ?? 0);
    }
  }

  updateFromEnv(env) {
    const getVal = (k) => {
      const blob = env?.[k];
      const v = blob?.value;
      return (v === null || v === undefined) ? null : Number(v);
    };

    this.state.degreesCelsius = getVal('degreesCelsius');
    this.state.humidityPercentage = getVal('humidityPercentage');
    this.state.co2Ppm = getVal('co2Ppm');
    this.state.vocPpb = getVal('vocPpb');
    this.state.iaq = getVal('iaq');
    this.state.updated = Date.now();

    if (this.state.degreesCelsius != null) {
      this.tempService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.state.degreesCelsius);
    }
    if (this.state.humidityPercentage != null) {
      this.humidityService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, this.state.humidityPercentage);
    }
    if (this.state.co2Ppm != null) {
      this.co2Service.updateCharacteristic(this.platform.Characteristic.CarbonDioxideLevel, this.state.co2Ppm);
      if (this.platform.Characteristic.CarbonDioxideDetected) {
        this.co2Service.updateCharacteristic(
          this.platform.Characteristic.CarbonDioxideDetected,
          (this.state.co2Ppm >= 1200
            ? this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL
            : this.platform.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL)
        );
      }
    }

    if (this.state.iaq != null) {
      this.airService.updateCharacteristic(this.platform.Characteristic.AirQuality, mapIaqToHomeKitAirQuality(this.state.iaq));
    }
    if (this.platform.Characteristic.VOCDensity && this.state.vocPpb != null) {
      this.airService.updateCharacteristic(this.platform.Characteristic.VOCDensity, this.state.vocPpb);
    }
  }
}

class SleeptrackerMomentarySwitch {
  constructor(platform, accessory, cmd) {
    this.platform = platform;
    this.log = platform.log;
    this.api = platform.api;
    this.client = platform.client;
    this.accessory = accessory;
    this.cmd = cmd;

    this.service = this.accessory.getService(this.platform.Service.Switch)
      || this.accessory.addService(this.platform.Service.Switch);

    this.service.setCharacteristic(this.platform.Characteristic.Name, cmd.name);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handleGet.bind(this))
      .onSet(this.handleSet.bind(this));

    this._isOn = false;
  }

  async handleGet() {
    // Only the Safety Light (toggle command 230) is stateful.
    if (Number(this.cmd.command) === 230) {
      try {
        const v = await this.client.getSafetyLightOn();
        if (v === null) {
          return this._isOn;
        }
        this._isOn = !!v;
        return this._isOn;
      } catch (e) {
        this.log.warn(`Safety Light status failed: ${e?.message || e}`);
        return this._isOn;
      }
    }

    return this._isOn;
  }

  async handleSet(value) {
    const on = !!value;

    // Safety Light: make it a true on/off.
    if (Number(this.cmd.command) === 230) {
      this._isOn = on;
      try {
        await this.client.setSafetyLight(on);
        // refresh cached state
        const v = await this.client.getSafetyLightOn();
        if (v !== null) {
          this._isOn = !!v;
        }
      } catch (e) {
        this.log.error(`Safety Light failed: ${e?.message || e}`);
      }
      this.service.updateCharacteristic(this.platform.Characteristic.On, this._isOn);
      return;
    }

    // Other commands are momentary triggers.
    if (!on) {
      this._isOn = false;
      return;
    }

    this._isOn = true;

    try {
      await this.client.sendCommand({
        command: this.cmd.command,
        massageAdjustment: this.cmd.massageAdjustment ?? null,
        requestStatus: this.cmd.requestStatus ?? null,
      });
      this.log.info(`Sent command ${this.cmd.command} (${this.cmd.name})`);
    } catch (e) {
      this.log.error(`Command failed (${this.cmd.command} ${this.cmd.name}): ${e?.message || e}`);
    }

    setTimeout(() => {
      this._isOn = false;
      this.service.updateCharacteristic(this.platform.Characteristic.On, false);
    }, 300);
  }
}

class SleeptrackerPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config || {};
    this.api = api;

    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;

    this.isConfigured = Boolean(this.config.email && this.config.password);
    this.accessories = [];

    if (!this.config.email || !this.config.password) {
      this.log.warn('Missing email/password; plugin will not create accessories');
      return;
    }

    this.client = new SleeptrackerClient(this.log, this.config);

    this.api.on('didFinishLaunching', async () => {
      await this.discoverDevices();
    });

    this.api.on('shutdown', () => {
      if (this._envInterval) {
        clearInterval(this._envInterval);
      }
    });
  }

  configureAccessory(accessory) {
    // Called when Homebridge restores cached accessories.
    if (!this.isConfigured) {
      this.log.debug(`Ignoring cached accessory ${accessory?.displayName || accessory?.UUID || 'unknown'} (plugin not configured)`);
      return;
    }
    this.accessories.push(accessory);
  }

  async discoverDevices() {
    try {
      const pid = await this.client.resolveProcessorId();
      this._processorId = pid;
      this.log.info(`Using processorId=${pid}`);

      // Optional: expose environment sensors as a separate accessory.
      if (this.config.exposeEnvironment !== false) {
        const envUuid = this.api.hap.uuid.generate(`sleeptracker:${pid}:environment`);
        let envAcc = this.accessories.find(a => a.UUID === envUuid);
        if (!envAcc) {
          envAcc = new this.api.platformAccessory(`${this.config.name || 'Sleeptracker'} Environment`, envUuid);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [envAcc]);
          this.accessories.push(envAcc);
        }
        this._envAccessory = new SleeptrackerEnvironmentAccessory(this, envAcc);

        // Poll every 60s
        const poll = async () => {
          try {
            const env = await this.client.getLatestEnvironment();
            this._envAccessory.updateFromEnv(env);
          } catch (e) {
            this.log.warn(`Env poll failed: ${e?.message || e}`);
          }
        };
        await poll();
        this._envInterval = setInterval(poll, 60 * 1000);
        this._envInterval.unref?.();
      }

      const commands = Array.isArray(this.config.commands) ? this.config.commands : [];
      for (const cmd of commands) {
        const name = cmd.name || `Command ${cmd.command}`;
        const uuid = this.api.hap.uuid.generate(`sleeptracker:${pid}:${name}:${cmd.command}`);

        let accessory = this.accessories.find(a => a.UUID === uuid);
        if (!accessory) {
          accessory = new this.api.platformAccessory(name, uuid);
          accessory.context.cmd = cmd;
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          this.accessories.push(accessory);
        }

        accessory.getService(this.Service.AccessoryInformation)
          .setCharacteristic(this.Characteristic.Manufacturer, 'Sleeptracker')
          .setCharacteristic(this.Characteristic.Model, 'Adjustable Base')
          .setCharacteristic(this.Characteristic.SerialNumber, String(pid));

        new SleeptrackerMomentarySwitch(this, accessory, cmd);
      }
    } catch (e) {
      this.log.error(`Failed to initialize Sleeptracker platform: ${e?.message || e}`);
    }
  }
}

function sleeptrackerPlugin(api) {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, SleeptrackerPlatform);
}

// Export internals for unit tests.
sleeptrackerPlugin.SleeptrackerClient = SleeptrackerClient;
sleeptrackerPlugin.SleeptrackerMomentarySwitch = SleeptrackerMomentarySwitch;
sleeptrackerPlugin.SleeptrackerEnvironmentAccessory = SleeptrackerEnvironmentAccessory;
sleeptrackerPlugin.mapIaqToHomeKitAirQuality = mapIaqToHomeKitAirQuality;
sleeptrackerPlugin.SleeptrackerPlatform = SleeptrackerPlatform;

module.exports = sleeptrackerPlugin;
