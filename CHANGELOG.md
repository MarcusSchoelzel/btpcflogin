# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-08-03

### Added

- Support for macOS by using [KeePassXC](https://keepassxc.org/) (`keepassxc-cli`) as credential manager
  - Credentials are read from the entry fields `Username`/`Password` and the optional additional attribute `origin`
  - Path to the database is stored in the config store and can be overridden with env var `BTPCFLOGIN_KDBX`
  - If `keepassxc-cli` is not on the PATH, the executable bundled with the KeePassXC app is detected automatically and stored in the config store after confirmation
  - The database password can optionally be remembered in the macOS Keychain (opt-in via confirmation prompt, outdated entries are updated automatically)
- New regions:
  - ae01     - UAE (Dubai)                          - SAP Cloud Infrastructure
  - ap01     - Australia (Sydney)                   - SAP Cloud Infrastructure
  - eu01     - Europe (Frankfurt) - EU Access Only  - SAP Cloud Infrastructure
  - eu02     - Europe (Rot) - SAP EU Access         - SAP Cloud Infrastructure
  - eu13     - Europe (Milan)                       - Amazon Web Services
  - eu20-002 - Europe (Netherlands)                 - Microsoft Azure
  - eu22     - Europe (Frankfurt)                   - Microsoft Azure
  - jp01     - Japan (Tokyo)                        - SAP Cloud Infrastructure
  - uk20     - UK South (London)                    - Microsoft Azure
  - us01     - US (Sterling)                        - SAP Cloud Infrastructure
  - us02     - US West (Colorado)                   - SAP Cloud Infrastructure
- Unit test suite (`npm test`) based on the Node.js built-in test runner - no additional dependencies
- Github action that runs the unit tests on Linux, macOS and Windows for every push and pull request

### Changed

- **BREAKING**: Node.js 22.12 or higher is required (dependency updates)
- Update npm dependencies (major bumps: chalk 6, commander 15, configstore 8, ora 9, which 7, zod 4, typescript 7)
- Region names aligned with SAP Help documentation (cn20, sa30, sa31)
- Replace unmaintained prompt library `enquirer` with the actively maintained `@inquirer/prompts`
  - Reordering in `sort-logins`/`sort-favs` now works with `<space>` to grab/release and `↑`/`↓` to move an entry
- Replace unmaintained package `clear` with Node's built-in `console.clear()`
- npm releases are published via [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC)
  with provenance attestation, instead of a long-lived automation token

### Fixed

- The cf CLI is now invoked without an intermediate shell: passwords, SSO passcodes, org and space
  names are passed verbatim, so all special characters work reliably and shell injection is impossible.
  This also resolves the Node.js deprecation warning DEP0190.
- Github publish workflow limits the permissions of its access token
- Local tool settings and github workflows are no longer packed into the published npm package

## [1.5.2] - 2025-04-01

### Added

- New regions:
  - br30 - Brazil (São Paulo)       - Google Cloud
  - ca20 - Canada Central (Toronto) - Microsoft Azure
  - cn20 - China North 3 (Hebei)    - Microsoft Azure
  - jp30 - Japan (Osaka)            - Google Cloud
  - jp31 - Japan (Tokyo)            - Google Cloud
  - sa31 - KSA (Dammam)             - Google Cloud

## [1.5.1] - 2025-03-03

### Added

- New regions:
  - ap30     - Australia (Sydney) - Google Cloud
  - br20     - Brazil (São Paulo) - Microsoft Azure
  - eu10-005 - Europe (Frankfurt) - Amazon Web Services
  - il30     - Israel (Tel Aviv)  - Google Cloud
  - sa30     - KSA (Dammam)       - Google Cloud
  - us11     - US West (Oregon)   - Amazon Web Services

- Github action for automatic publish to npm registry on creation of an github release

### Changed

- Update npm dependencies

## [1.5.0] - 2024-11-23

### Added

- Existing favorites can now be overwritten when login command is executed with `-s`
- Favorites can be renamed with new command `rename-fav`

### Fixed

- Removing a favorite added enquirer properties in the `favoriteTargits` array of `btpcflogin`'s config store file

## [1.4.1] - 2024-07-02

### Fixed

- Adjustments of ui texts
- Escaping for Org name, Space name and SSO passcode

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
  - eu10-002 - Europe (Frankfurt)   - Amazon Web Services
  - eu10-003 - Europe (Frankfurt)   - Amazon Web Services
  - eu20-001 - Europe (Netherlands) - Microsoft Azure
  - us10-001 - US East (VA)         - Amazon Web Services
  - us10-002 - US East (VA)         - Amazon Web Services
  - in30     - India (Mumbai)       - Google Cloud
  - ch20     - Switzerland (Zurich) - Microsoft Azure

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
