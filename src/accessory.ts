import { AccessoryConfig, AccessoryPlugin, CharacteristicValue, Service } from 'homebridge';

import { Datapoint } from 'knx';
import fakegato from 'fakegato-history';

import { PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_DISPLAY_NAME } from './settings';

import { FanPlatform } from './platform';


export class FanAccessory implements AccessoryPlugin {
  private readonly uuid_base: string;
  private readonly name: string;
  private readonly displayName: string;
  private readonly listen_status: string;
  private readonly set_status: string;
  private readonly listen_rotation_speed: string;
  private readonly set_rotation_speed: string;

  private readonly fanService: Service;
  private readonly loggingService: fakegato;
  private readonly informationService: Service;

  constructor(
    private readonly platform: FanPlatform,
    private readonly config: AccessoryConfig,
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
      .setCharacteristic(platform.Characteristic.FirmwareRevision, PLUGIN_VERSION);

    this.fanService = new platform.Service.Fan(this.name);

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
      platform.log.info(`Fan Status: ${newValue}`);
      this.fanService.getCharacteristic(platform.Characteristic.On).updateValue(newValue);
      this.loggingService._addEntry({ time: Math.round(new Date().valueOf() / 1000), status: newValue ? 1 : 0 });
    });

    this.fanService.getCharacteristic(platform.Characteristic.On)
      .onSet(async (value: CharacteristicValue) => {
        platform.log.info(`Set Status: ${value} - ${Boolean(value)}`);
        dp_set_status.write(Boolean(value));
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
          platform.log.info(`Fan Rotation Speed: ${newValue}`);
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
            platform.log.info(`Set Roation Speed: ${value} - ${Number(value)}`);
            dp_set_rotation_speed.write(Number(value));
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
