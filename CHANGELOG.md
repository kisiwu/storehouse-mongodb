# Changelog

## [3.0.0] - 2026-02-07

### Added
- Health check functionality from `@storehouse/core`
  - `healthCheck()` method returns detailed connection status, ping response, database name, and latency
  - `isConnected()` method to check connection status without requiring admin privileges
- Comprehensive JSDoc documentation for all exported functions, classes, interfaces, and methods
- Specific error classes from `@storehouse/core`:
  - `ModelNotFoundError` thrown when model (collection) is not found
  - `ManagerNotFoundError` thrown when manager is not found
  - `InvalidManagerConfigError` thrown when manager type is invalid or configuration is missing
- TypeScript generic type support for `getModel()` helper function with overload signatures

### Changed
- **BREAKING:** Renamed `MongoDBManager` to `MongoDbManager` (casing change)
- **BREAKING:** Renamed `MongoDBManagerArg` to `MongoDbManagerArg` (casing change)
- Updated `@storehouse/core` dependency to latest version => `2.1.0`
- Updated `mongodb` driver dependency to latest version => `7.1.0`
- Enhanced health check to work with restricted database access (non-admin users)
- Health check now includes database name in the details
- Improved error handling with specific error types instead of generic `ReferenceError` and `TypeError`


[Unreleased]: https://github.com/kisiwu/storehouse-mongodb/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/kisiwu/storehouse-mongodb/releases/tag/v3.0.0