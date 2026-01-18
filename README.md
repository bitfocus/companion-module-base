# Companion Module API

Monorepo for Companion module plugin libraries.

## Packages

- **[@companion-module/base](packages/companion-module-base/)** - Plugin API for writing module integrations. Small, stable, versioned conservatively.
- **[@companion-module/host](packages/companion-module-host/)** - Host-side wrapper that runs plugins in-process. Handles API version compatibility and provides the interface to Companion.

## Development

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Run in watch mode
yarn dev

# Lint
yarn lint

# Run tests
yarn unit
```

## Creating a Module Plugin

Use the [TypeScript template](https://github.com/bitfocus/companion-module-template-ts) or [Javascript template](https://github.com/bitfocus/companion-module-template-js) to get started.

Your plugin only needs to depend on `@companion-module/base`. The host package is used by Companion itself.

## Architecture

Plugins implement the base API (`@companion-module/base`). The host package wraps these plugins with additional logic, manages lifecycle, and bridges to Companion's core. This separation keeps the plugin API minimal and stable while allowing the host side to evolve more freely.
