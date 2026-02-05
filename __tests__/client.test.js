const plugin = require('..');

const { SleeptrackerClient } = plugin;

function makeClient({ sendCommandImpl, requestStatusImpl } = {}) {
  const log = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const c = new SleeptrackerClient(log, {
    email: 'x@example.com',
    password: 'pw',
    namespace: '',
  });

  if (sendCommandImpl) c.sendCommand = jest.fn(sendCommandImpl);
  if (requestStatusImpl) c.requestStatusSnapshot = jest.fn(requestStatusImpl);

  return { c, log };
}

describe('SleeptrackerClient safety light helpers', () => {
  test('requestStatusSnapshot prefers side 0 when present', async () => {
    const { c } = makeClient();
    c.sendCommand = jest.fn(async () => ({
      body: {
        snapshots: [
          { side: 1, safetyLightOn: true },
          { side: 0, safetyLightOn: false },
        ],
      },
    }));

    const snap = await c.requestStatusSnapshot();
    expect(snap).toEqual({ side: 0, safetyLightOn: false });
  });

  test('getSafetyLightOn returns null when snapshot unavailable', async () => {
    const { c } = makeClient();
    c.requestStatusSnapshot = jest.fn(async () => null);
    await expect(c.getSafetyLightOn()).resolves.toBeNull();
  });

  test('setSafetyLight toggles once when current is unknown', async () => {
    const { c } = makeClient();
    c.getSafetyLightOn = jest.fn(async () => null);
    c.sendCommand = jest.fn(async () => ({}));

    await c.setSafetyLight(true);
    expect(c.sendCommand).toHaveBeenCalledWith({ command: 230 });
  });

  test('setSafetyLight does not toggle when already desired state', async () => {
    const { c } = makeClient();
    c.getSafetyLightOn = jest.fn(async () => true);
    c.sendCommand = jest.fn(async () => ({}));

    await c.setSafetyLight(true);
    expect(c.sendCommand).not.toHaveBeenCalled();
  });

  test('setSafetyLight toggles when changing state', async () => {
    const { c } = makeClient();
    c.getSafetyLightOn = jest.fn(async () => false);
    c.sendCommand = jest.fn(async () => ({}));

    await c.setSafetyLight(true);
    expect(c.sendCommand).toHaveBeenCalledWith({ command: 230 });
  });
});
