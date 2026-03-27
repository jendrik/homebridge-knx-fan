# homebridge-knx-fan

Homebridge plugin for controlling KNX-based fans via Apple HomeKit.

## Features

- On/Off control via KNX group addresses
- Optional rotation speed control (0-100%)
- Bidirectional state sync — changes from KNX are reflected in HomeKit and vice versa
- History logging via [fakegato-history](https://github.com/simont77/fakegato-history) (compatible with the Eve app)
- Configurable via the Homebridge UI

## Requirements

- [Homebridge](https://homebridge.io) ^1.8.0 or ^2.0.0
- Node.js ^20.18.0 or ^22.10.0
- A KNX IP router or interface reachable on the network

## Installation

### Via Homebridge UI

Search for `homebridge-knx-fan` in the Homebridge UI plugin tab and install it.

### Via CLI

```sh
npm install -g @jendrik/homebridge-knx-fan
```

## Configuration

The plugin can be configured through the Homebridge UI or by editing `config.json` manually.

### Example `config.json`

```json
{
  "platforms": [
    {
      "platform": "knx-fan",
      "ip": "224.0.23.12",
      "port": 3671,
      "devices": [
        {
          "name": "Living Room Fan",
          "set_status": "1/2/1",
          "listen_status": "1/2/2",
          "set_rotation_speed": "1/2/3",
          "listen_rotation_speed": "1/2/4"
        }
      ]
    }
  ]
}
```

### Platform Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `platform` | Yes | — | Must be `knx-fan` |
| `ip` | No | `224.0.23.12` | IP address of the KNX router or interface |
| `port` | No | `3671` | KNX port |
| `devices` | Yes | — | Array of fan device configurations |

### Device Options

| Option | Required | Description |
|--------|----------|-------------|
| `name` | Yes | Display name for the fan in HomeKit |
| `set_status` | Yes | KNX group address for setting on/off state (DPT 1.001) |
| `listen_status` | Yes | KNX group address for reading on/off state (DPT 1.001) |
| `set_rotation_speed` | No | KNX group address for setting rotation speed (DPT 5.001) |
| `listen_rotation_speed` | No | KNX group address for reading rotation speed (DPT 5.001) |

Group addresses use the 3-level format `main/middle/sub` (e.g. `1/2/3`).

## Development

```sh
# Install dependencies
npm install

# Build
npm run build

# Lint
npm run lint

# Watch mode (builds, links, and starts Homebridge with debug logging)
npm run watch
```

## License

[Apache-2.0](LICENSE)
