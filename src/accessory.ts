import { AccessoryPlugin, CharacteristicValue, Service } from 'homebridge';

import { createRequire } from 'node:module';

import { Datapoint } from 'knx';

import { PLUGIN_NAME, PLUGIN_DISPLAY_NAME } from './settings.js';

import { FanPlatform } from './platform.js';
import { FanDeviceConfig, normalizeRotationSpeed } from './config.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

export class FanAccessory implements AccessoryPlugin {
  private readonly uuid_base: string;
  private readonly name: string;
  private readonly displayName: string;
  private readonly listen_status: string;
  private readonly set_status: string;
  private readonly listen_rotation_speed?: string;
  private readonly set_rotation_speed?: string;

  private readonly fanService: Service;
  private readonly loggingService: InstanceType<FanPlatform['fakeGatoHistoryService']>;
  private readonly informationService: Service;

  constructor(
    private readonly platform: FanPlatform,
    private readonly config: FanDeviceConfig,
  ) {
    this.name = config.name;
    this.listen_status = config.listen_status;
    this.set_status = config.set_status;
    this.listen_rotation_speed = config.listen_rotation_speed;
    this.set_rotation_speed = config.set_rotation_speed;
    this.uuid_base = platform.uuid.generate(PLUGIN_NAME + '-' + this.name + '-' + this.listen_status);
    this.displayName = this.uuid_base;

    this.informationService = new platform.Service.AccessoryInformation()
      .setCharacteristic(platform.Characteristic.Name, this.name)
      .setCharacteristic(platform.Characteristic.Identify, this.name)
      .setCharacteristic(platform.Characteristic.Manufacturer, '@jendrik')
      .setCharacteristic(platform.Characteristic.Model, PLUGIN_DISPLAY_NAME)
      .setCharacteristic(platform.Characteristic.SerialNumber, this.displayName)
      .setCharacteristic(platform.Characteristic.FirmwareRevision, packageJson.version);

    this.fanService = new platform.Service.Fanv2(this.name);

    this.loggingService = new platform.fakeGatoHistoryService('switch', this, { storage: 'fs', log: platform.log });

    const dp_listen_status = new Datapoint({
      ga: this.listen_status,
      dpt: 'DPT1.001',
      autoread: true,
    }, platform.connection);

    const dp_set_status = new Datapoint({
      ga: this.set_status,
      dpt: 'DPT1.001',
    }, platform.connection);

    dp_listen_status.on('change', (oldValue: number, newValue: number) => {
      platform.log.info(`[${this.name}] Fan status: ${Boolean(newValue)}`);
      this.fanService.getCharacteristic(platform.Characteristic.Active).updateValue(
        newValue ? platform.Characteristic.Active.ACTIVE : platform.Characteristic.Active.INACTIVE,
      );
      this.loggingService._addEntry({ time: Math.round(new Date().valueOf() / 1000), status: newValue ? 1 : 0 });
    });

    this.fanService.getCharacteristic(platform.Characteristic.Active)
      .onSet(async (value: CharacteristicValue) => {
        const enabled = value === platform.Characteristic.Active.ACTIVE;
        platform.log.info(`[${this.name}] Set status: ${enabled}`);
        dp_set_status.write(enabled);
      });

    // Rotation Speed
    if (this.listen_rotation_speed !== undefined || this.set_rotation_speed !== undefined) {
      this.fanService.addCharacteristic(platform.Characteristic.RotationSpeed);

      if (this.listen_rotation_speed !== undefined) {
        const dp_listen_rotation_speed = new Datapoint({
          ga: this.listen_rotation_speed,
          dpt: 'DPT5.001',
          autoread: true,
        }, platform.connection);

        dp_listen_rotation_speed.on('change', (oldValue: number, newValue: number) => {
          platform.log.info(`[${this.name}] Fan rotation speed: ${newValue}`);
          this.fanService.getCharacteristic(platform.Characteristic.RotationSpeed).updateValue(newValue);
          // TODO: update on/off state here as well?
        });
      }

      if (this.set_rotation_speed !== undefined) {
        const dp_set_rotation_speed = new Datapoint({
          ga: this.set_rotation_speed,
          dpt: 'DPT5.001',
        }, platform.connection);

        this.fanService.getCharacteristic(platform.Characteristic.RotationSpeed)
          .onSet(async (value: CharacteristicValue) => {
            const speed = normalizeRotationSpeed(value);
            platform.log.info(`[${this.name}] Set rotation speed: ${speed}`);
            dp_set_rotation_speed.write(speed);
          });
      }
    }
  }

  getServices(): Service[] {
    return [
      this.informationService,
      this.fanService,
      this.loggingService,
    ];
  }
}
