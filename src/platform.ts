import { API, StaticPlatformPlugin, Logger, PlatformConfig, AccessoryPlugin, Service, Characteristic, uuid } from 'homebridge';

import fakegato from 'fakegato-history';

import { Connection } from 'knx';

import { FanAccessory } from './accessory.js';
import { ParsedPlatformConfig, parsePlatformConfig } from './config.js';


export class FanPlatform implements StaticPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly uuid: typeof uuid;

  public readonly fakeGatoHistoryService;

  public readonly connection: Connection;
  public readonly parsedConfig: ParsedPlatformConfig;

  private readonly devices: FanAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;
    this.uuid = this.api.hap.uuid;

    this.fakeGatoHistoryService = fakegato(this.api);
    this.parsedConfig = parsePlatformConfig(config, log);

    // connect
    this.connection = new Connection({
      ipAddr: this.parsedConfig.ip,
      ipPort: this.parsedConfig.port,
      handlers: {
        connected: function () {
          log.info('KNX connected');
        },
        error: function (connstatus: unknown) {
          log.error(`KNX status: ${connstatus}`);
        },
      },
    });

    // read devices
    for (const device of this.parsedConfig.devices) {
      this.devices.push(new FanAccessory(this, device));
    }

    log.info('finished initializing!');
  }

  accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
    callback(this.devices);
  }
}
