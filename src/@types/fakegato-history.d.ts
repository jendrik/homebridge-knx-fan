declare module 'fakegato-history' {
  import { API, Logger, Service } from 'homebridge';

  interface SwitchHistoryEntry {
    readonly time: number;
    readonly status: 0 | 1;
  }

  interface FakeGatoHistoryOptions {
    readonly storage?: 'fs' | 'googleDrive';
    readonly log?: Logger;
  }

  interface FakeGatoHistory extends Service {
    _addEntry(entry: SwitchHistoryEntry): void;
  }

  type FakeGatoHistoryConstructor = new (
    accessoryType: 'switch',
    accessory: object,
    optionalParams?: FakeGatoHistoryOptions,
  ) => FakeGatoHistory;

  const fakegato: (api: API) => FakeGatoHistoryConstructor;

  export default fakegato;
}
