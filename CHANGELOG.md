# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.6] - 2023-07-27

### Added

- New regions:

  - eu10-002 - Europe (Frankfurt) - Amazon Web Services
  - eu10-003 - Europe (Frankfurt) - Amazon Web Services
  - eu20-001 - Europe (Netherlands) - Microsoft Azure
  - us10-001 - US East (VA) - Amazon Web Services
  - us10-002 - US East (VA) - Amazon Web Services
  - in30 - India (Mumbai) - Google Cloud
  - ch20 - Switzerland (Zurich) - Microsoft Azure

- Script `prepare` for publish of npm package (to not forget typescript transpile)
- Additional key words

### Changed

- Switch to autocomplete setting for region selection
- Use predefined typescript configuration from @tsconfig/node14
- Update npm dependencies

### Fixed

- Error when password contains quotation marks

## [1.0.5] - 2022-07-13

### Added

- New regions:

  - eu10-004 - Europe (Frankfurt) - Amazon Web Services
  - eu30     - Europe (Frankfurt) - Google Cloud

- Changelog

### Changed

- Update npm dependencies

### Fixed

- Error handling in typescript
- Typos in documentation

## [1.0.4] - 2017-06-20

### Fixed

- Some regions where missing

## [1.0.3] - 2021-07-08

### Fixed

- Rename start script to local
- Documentation

## [1.0.2] - 2021-07-08

### Fixed

- Remove postinstall step from scripts
- Documentation

## [1.0.1] - 2021-07-08

### Added

- Publish to [npmjs.com](https://www.npmjs.com/package/btpcflogin)
- Documentation

## [1.0.0] - 2021-07-01

### Added

- Initial release
- Has been deleted from npm registry
