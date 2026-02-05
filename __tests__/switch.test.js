const plugin = require('..');

const { SleeptrackerMomentarySwitch } = plugin;

function makePlatformStubs() {
  const updateCharacteristic = jest.fn();

  const service = {
    setCharacteristic: jest.fn(),
    getCharacteristic: jest.fn(() => ({
      onGet: jest.fn().mockReturnThis(),
      onSet: jest.fn().mockReturnThis(),
    })),
    updateCharacteristic,
  };

  const accessory = {
    getService: jest.fn(() => service),
    addService: jest.fn(() => service),
  };

  const platform = {
    log: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
    api: {},
    client: {
      sendCommand: jest.fn(async () => ({})),
      getSafetyLightOn: jest.fn(async () => false),
      setSafetyLight: jest.fn(async () => {}),
    },
    Service: { Switch: 'Switch' },
    Characteristic: { Name: 'Name', On: 'On' },
  };

  return { platform, accessory, service, updateCharacteristic };
}

describe('SleeptrackerMomentarySwitch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('momentary command resets to OFF after 300ms', async () => {
    const { platform, accessory, updateCharacteristic } = makePlatformStubs();
    const cmd = { name: 'Flat', command: 2 };
    const sw = new SleeptrackerMomentarySwitch(platform, accessory, cmd);

    await sw.handleSet(true);
    expect(platform.client.sendCommand).toHaveBeenCalled();

    jest.advanceTimersByTime(350);
    expect(updateCharacteristic).toHaveBeenCalledWith('On', false);
  });

  test('safety light set calls setSafetyLight and updates characteristic', async () => {
    const { platform, accessory, updateCharacteristic } = makePlatformStubs();
    platform.client.getSafetyLightOn = jest.fn()
      .mockResolvedValueOnce(true);

    const cmd = { name: 'Safety Light', command: 230 };
    const sw = new SleeptrackerMomentarySwitch(platform, accessory, cmd);

    await sw.handleSet(true);
    expect(platform.client.setSafetyLight).toHaveBeenCalledWith(true);
    expect(updateCharacteristic).toHaveBeenCalledWith('On', true);
  });
});
