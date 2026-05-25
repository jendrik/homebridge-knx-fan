# Homebridge 2 Static Plugin Modernization Design

## Goal

Update `@jendrik/homebridge-knx-fan` so it is ready for Homebridge 2.0 and current supported Node runtimes, while keeping the existing static platform architecture and HomeKit-only behavior.

Backward compatibility with Homebridge 1 is not required. The plugin must continue using `StaticPlatformPlugin` for now and must keep `fakegato-history` support for Eve-compatible on/off history.

## Non-Goals

- Do not migrate to `DynamicPlatformPlugin`.
- Do not add Matter exposure.
- Do not remove `fakegato-history`.
- Do not require a live KNX router for linting or building.
- Do not introduce unrelated feature work beyond the Homebridge 2 modernization.

## Current State

The plugin is already TypeScript and ESM-based, but it still has several pre-modernization traits:

- `package.json` still allows Homebridge 1 and Homebridge 2 beta.
- Node engine support includes Node 20, while current Homebridge 2 requires Node 22 or 24.
- Runtime code uses a static platform with plain `AccessoryPlugin` instances.
- Fan accessories use `Service.Fan`.
- Config parsing relies on loose values and `any`.
- Plugin metadata includes hardcoded version constants in source.
- The Homebridge UI schema treats `port` as a string.
- KNX datapoint setup and HomeKit service setup are interleaved inside the accessory constructor.

## Architecture

Keep the public plugin shape:

- `src/index.ts` registers the platform alias `knx-fan`.
- `FanPlatform` implements `StaticPlatformPlugin`.
- `FanPlatform.accessories()` returns statically constructed fan accessories.
- `FanAccessory` implements `AccessoryPlugin`.

The internal responsibilities should be tightened:

- `FanPlatform` owns Homebridge API references, KNX connection creation, platform config parsing, and accessory construction.
- `FanAccessory` owns one configured fan, its HomeKit services, its KNX datapoints, and its fakegato logging.
- Config types and validation helpers should live in source rather than being represented by ad hoc `any` checks.

This preserves the existing installation and HomeKit accessory model while making the implementation clearer and safer for Homebridge 2.

## Runtime Requirements

`package.json` should declare:

- `engines.homebridge`: `^2.0.0`
- `engines.node`: `^22 || ^24`

Homebridge should be updated to the current stable 2.x release for development. Other libraries should be updated within stable, low-risk ranges:

- `knx` to the latest compatible `2.5.x`.
- `fakegato-history` to the current `0.6.x`.
- TypeScript, ESLint, and supporting dev dependencies to current stable versions that do not force unrelated major migrations.

Avoid jumping to toolchain majors that create unrelated migration work unless the existing project already supports them cleanly.

## HomeKit Services

Use the Homebridge 2/HAP service surface directly through `api.hap`.

Each fan accessory should expose:

- `AccessoryInformation`
- `Fanv2`
- fakegato history service

The `Fanv2` service should include:

- `On`, always.
- `RotationSpeed`, only when at least one rotation-speed group address is configured.

The older `Service.Fan` service should be replaced by `Service.Fanv2`.

## KNX Behavior

The existing KNX semantics should remain:

- `set_status` writes DPT `1.001`.
- `listen_status` reads DPT `1.001` with autoread.
- `set_rotation_speed` writes DPT `5.001` when configured.
- `listen_rotation_speed` reads DPT `5.001` with autoread when configured.

Setter values should be normalized before writing:

- `On` should write a boolean.
- `RotationSpeed` should write a number constrained to the HomeKit percentage range.

Listener updates should update HomeKit characteristics and log useful device-scoped messages.

On/off listener changes should continue writing fakegato history entries with the current timestamp and status.

## Config Validation

Introduce explicit config interfaces for:

- platform config
- fan device config

Validation should:

- Apply defaults for KNX IP and port.
- Treat `port` as a number.
- Require `devices` to be an array.
- Require each device to have `name`, `set_status`, and `listen_status`.
- Allow optional `set_rotation_speed` and `listen_rotation_speed`.
- Validate group-address shape before creating datapoints.
- Log and skip invalid devices instead of constructing partially broken accessories.

The UI schema should match runtime validation:

- `port` should be numeric.
- Required fields should be represented through JSON schema `required` arrays.
- Existing group-address patterns should remain.

## Package Metadata

Remove hardcoded plugin version drift where practical.

The source should not need a manual edit every time `package.json` changes version. The accessory information firmware revision should either read from package metadata in a Node ESM-safe way or use a single source of truth generated/loaded from package metadata.

Plugin identity constants should continue to match package and Homebridge expectations:

- package name: `@jendrik/homebridge-knx-fan`
- platform alias: `knx-fan`
- display name: `KNX Fan`

## Error Handling

KNX connection events should log clear messages:

- successful connection
- connection errors/status changes

Device setup errors should identify the fan name or device index. Optional rotation-speed configuration issues should not hide which device failed.

HomeKit setters should catch and log KNX write failures if the KNX library exposes them synchronously or through promise-like behavior. If KNX writes are fire-and-forget, the code should still keep setter normalization and logging explicit.

## Verification

The implementation is complete when these pass:

- `npm install`
- `npm run lint`
- `npm run build`

If a practical unit-test harness is added during implementation, it should cover config validation and value normalization. A live KNX router is not required for the modernization verification.

## Implementation Boundaries

Keep the change focused on Homebridge 2 readiness:

- Update dependency and engine declarations.
- Refactor static platform and accessory code for typed config and Homebridge 2 service usage.
- Update schema and documentation to match Homebridge 2-only support.
- Preserve existing user-visible behavior for configured fans and fakegato history.

Do not migrate platform type, add Matter, redesign configuration names, or remove history support in this pass.
