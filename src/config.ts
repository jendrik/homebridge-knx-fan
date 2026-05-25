import { Logger, PlatformConfig } from 'homebridge';

export const DEFAULT_KNX_IP = '224.0.23.12';
export const DEFAULT_KNX_PORT = 3671;

const GROUP_ADDRESS_PATTERN = /^[0-9]{1,4}\/[0-9]{1,4}\/[0-9]{1,4}$/;

export interface FanDeviceConfig {
  readonly name: string;
  readonly set_status: string;
  readonly listen_status: string;
  readonly set_rotation_speed?: string;
  readonly listen_rotation_speed?: string;
}

export interface ParsedPlatformConfig {
  readonly ip: string;
  readonly port: number;
  readonly devices: FanDeviceConfig[];
}

function isGroupAddress(value: string): boolean {
  return GROUP_ADDRESS_PATTERN.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readRequiredString(value: Record<string, unknown>, key: string): string | undefined {
  const rawValue = value[key];

  return typeof rawValue === 'string' && rawValue.trim().length > 0
    ? rawValue.trim()
    : undefined;
}

function readOptionalGroupAddress(
  value: Record<string, unknown>,
  key: 'set_rotation_speed' | 'listen_rotation_speed',
  name: string,
  log: Logger,
): string | undefined {
  const rawValue = value[key];

  if (rawValue === undefined || rawValue === '') {
    return undefined;
  }

  if (typeof rawValue !== 'string' || !isGroupAddress(rawValue.trim())) {
    log.warn(`Ignoring invalid ${key} for fan device "${name}".`);
    return undefined;
  }

  return rawValue.trim();
}

function parsePort(value: unknown, log: Logger): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);

    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  if (value !== undefined) {
    log.warn(`Invalid KNX port "${String(value)}"; using ${DEFAULT_KNX_PORT}.`);
  }

  return DEFAULT_KNX_PORT;
}

function parseDeviceConfig(value: unknown, index: number, log: Logger): FanDeviceConfig | undefined {
  if (!isRecord(value)) {
    log.error(`Skipping fan device at index ${index}: expected an object.`);
    return undefined;
  }

  const name = readRequiredString(value, 'name');
  const setStatus = readRequiredString(value, 'set_status');
  const listenStatus = readRequiredString(value, 'listen_status');

  if (!name || !setStatus || !listenStatus) {
    log.error(`Skipping fan device at index ${index}: name, set_status, and listen_status are required.`);
    return undefined;
  }

  if (!isGroupAddress(setStatus) || !isGroupAddress(listenStatus)) {
    log.error(`Skipping fan device "${name}": set_status and listen_status must be KNX group addresses.`);
    return undefined;
  }

  const setRotationSpeed = readOptionalGroupAddress(value, 'set_rotation_speed', name, log);
  const listenRotationSpeed = readOptionalGroupAddress(value, 'listen_rotation_speed', name, log);

  return {
    name,
    set_status: setStatus,
    listen_status: listenStatus,
    ...(setRotationSpeed ? { set_rotation_speed: setRotationSpeed } : {}),
    ...(listenRotationSpeed ? { listen_rotation_speed: listenRotationSpeed } : {}),
  };
}

export function parsePlatformConfig(config: PlatformConfig, log: Logger): ParsedPlatformConfig {
  const ip = typeof config.ip === 'string' && config.ip.trim().length > 0
    ? config.ip.trim()
    : DEFAULT_KNX_IP;

  const port = parsePort(config.port, log);
  const rawDevices = Array.isArray(config.devices) ? config.devices : [];

  if (!Array.isArray(config.devices)) {
    log.error('KNX Fan config is missing a devices array; no fan accessories will be created.');
  }

  const devices = rawDevices
    .map((device, index) => parseDeviceConfig(device, index, log))
    .filter((device): device is FanDeviceConfig => device !== undefined);

  return { ip, port, devices };
}

export function normalizeRotationSpeed(value: unknown): number {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.min(100, Math.max(0, numberValue));
}
