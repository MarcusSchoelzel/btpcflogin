# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2024-05-25

### Added

- New options `-s` and `-f` for default command, to store or use cf targets as favorites
- New Command `sort-favs` to reorder the stored favorites
- New Command `rm-fav` to remove a stored favorite from the config store
- Org and space are now automatically chosen if only a single one exists in the region/org

### Changed

- `prepare` was renamed to `prepack` as `prepare` is also executed during `npm i`

## [1.3.0] - 2023-12-28

### Added

- Adds support for Windows by using [GoPass](https://www.gopass.pw/) as password manager

## [1.2.1] - 2023-12-01

### Fixed

- Escapes `$` characters in passwords during logon

## [1.2.0] - 2023-09-01

### Added

- New Command `sort-logins` to reorder the logins in the config store
- New Command `rm-login` to delete pass login from the config store

### Changed

- First pass login is marked per default during login process
- Command `add-login` only shows pass logins that are missing from the config store
- Improved error handling

## [1.1.0] - 2023-08-25

### Added

- New Command `add-login` to add pass entry to config store
- New Command `t` to switch current cf target (org,space)
- New Option to allow for single sign on
- Possibility to login with custom IDP
- Origin of custom IDP can be added to pass login entry

### Changed

- Replaced spinner lib `clui` with `ora`
- `spawnSync` is used for all shell interactions
- Code refactoring

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
