# auditing common types 

[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/auditing-bc.svg?style=flat)](https://github.com/mojaloop/auditing-bc/commits/master)
[![Git Releases](https://img.shields.io/github/release/mojaloop/auditing-bc.svg?style=flat)](https://github.com/mojaloop/auditing-bc/releases)
[![Npm Version](https://img.shields.io/npm/v/@mojaloop-poc/auditing-bc.svg?style=flat)](https://www.npmjs.com/package/@mojaloop-poc/auditing-bc)
[![NPM Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/npm/@mojaloop/auditing-bc.svg?style=flat)](https://www.npmjs.com/package/@mojaloop-poc/auditing-bc)
[![CircleCI](https://circleci.com/gh/mojaloop/auditing-bc.svg?style=svg)](https://circleci.com/gh/mojaloop/auditing-bc)

Mojaloop Auditing Platform Shared Library

## Usage

### Install Node version

More information on how to install NVM: https://github.com/nvm-sh/nvm

```bash
nvm install
nvm use
```

### Install Yarn

```bash
npm -g yarn
```

### Install Dependencies

```bash
yarn
```

## Build

```bash
yarn build
```

## Run

```bash
yarn start
```

## Unit Tests

```bash
yarn test:unit
```

## Known Issues

- added `typescript` to [.ncurc.json](./.ncurc.json) as the `dep:update` script will install a non-supported version of typescript
