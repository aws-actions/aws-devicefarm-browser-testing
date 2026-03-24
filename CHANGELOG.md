# Changelog

All notable changes to this project will be documented in this file.

## 3.0 (2026-03-24)

> **_BREAKING CHANGES_**
>
> Action runtime upgraded from `node20` to `node24`. This requires GitHub Actions runners with Node.js 24 support.

### Features

* Upgraded action runtime from `node20` to `node24`

### Maintenance

* Modernized codebase to ES modules (internal change)
* Upgraded all dependencies to latest versions
  * `@actions/core` to v3.0.0
  * `@aws-sdk/client-device-farm` to v3.1015.0
  * `axios` to v1.13.6
* Removed `fast-xml-parser` security override (resolved in dependency updates)
* Switched build toolchain from `@vercel/ncc` to `rollup` (following GitHub's official documentation)
* Migrated test framework from Jest to Vitest for native ES modules support
* Updated ESLint to v10 with new flat config format

## 2.2 (2024-08-14)

> Fixed dependabot security finding [#7](https://github.com/aws-actions/aws-devicefarm-browser-testing/security/dependabot/7).

## 2.1 (2024-07-30)

> Fixed dependabot security finding [#6](https://github.com/aws-actions/aws-devicefarm-browser-testing/security/dependabot/6).

## 2.0 (2023-11-01)

### Features

* Added new mode of `gridurl` to provide ability to generate a Grid URL for a project.
* Added output `console-url`.
