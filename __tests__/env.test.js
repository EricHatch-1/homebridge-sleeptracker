const plugin = require('..');

const { mapIaqToHomeKitAirQuality, SleeptrackerEnvironmentAccessory } = plugin;

describe('IAQ mapping', () => {
  test('maps thresholds', () => {
    expect(mapIaqToHomeKitAirQuality(10)).toBe(1);
    expect(mapIaqToHomeKitAirQuality(60)).toBe(2);
    expect(mapIaqToHomeKitAirQuality(120)).toBe(3);
    expect(mapIaqToHomeKitAirQuality(180)).toBe(4);
    expect(mapIaqToHomeKitAirQuality(300)).toBe(5);
  });
});

describe('Environment accessory updates characteristics', () => {
  test('updateFromEnv pushes values', () => {
    const updateCharacteristic = jest.fn();

    const makeService = () => ({
      updateCharacteristic,
      getCharacteristic: jest.fn(() => ({ onGet: jest.fn().mockReturnThis() })),
      setCharacteristic: jest.fn(),
    });

    const accessory = {
      getService: jest.fn(() => null),
      addService: jest.fn(() => makeService()),
    };

    const platform = {
      log: { warn: jest.fn(), info: jest.fn(), debug: jest.fn(), error: jest.fn() },
      client: {},
      _processorId: 123,
      Service: {
        AccessoryInformation: 'AccessoryInformation',
        TemperatureSensor: 'TemperatureSensor',
        HumiditySensor: 'HumiditySensor',
        CarbonDioxideSensor: 'CarbonDioxideSensor',
        AirQualitySensor: 'AirQualitySensor',
      },
      Characteristic: {
        Manufacturer: 'Manufacturer',
        Model: 'Model',
        SerialNumber: 'SerialNumber',
        CurrentTemperature: 'CurrentTemperature',
        CurrentRelativeHumidity: 'CurrentRelativeHumidity',
        CarbonDioxideLevel: 'CarbonDioxideLevel',
        CarbonDioxideDetected: { CO2_LEVELS_ABNORMAL: 1, CO2_LEVELS_NORMAL: 0 },
        AirQuality: 'AirQuality',
        VOCDensity: 'VOCDensity',
      },
    };

    // AccessoryInformation service
    accessory.getService.mockImplementationOnce(() => ({
      setCharacteristic: jest.fn().mockReturnThis(),
    }));

    const envAcc = new SleeptrackerEnvironmentAccessory(platform, accessory);

    envAcc.updateFromEnv({
      degreesCelsius: { value: 20.5 },
      humidityPercentage: { value: 45.1 },
      co2Ppm: { value: 900 },
      vocPpb: { value: 200 },
      iaq: { value: 80 },
    });

    expect(updateCharacteristic).toHaveBeenCalled();
  });
});
