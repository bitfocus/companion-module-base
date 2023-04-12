# Changelog

## [1.4.1](https://github.com/bitfocus/companion-module-base/compare/v1.4.0...v1.4.1) (2023-04-12)


### Bug Fixes

* Add undefined checks to upgrade for missing options ([#48](https://github.com/bitfocus/companion-module-base/issues/48)) ([6690929](https://github.com/bitfocus/companion-module-base/commit/6690929aa19ff5104e55d235974fbc1610faca5e))

## [1.4.0](https://github.com/bitfocus/companion-module-base/compare/v1.3.0...v1.4.0) (2023-03-27)


### Features

* add support for previewStyle parameter of CompanionButtonPresetDefinition class ([e63bfd8](https://github.com/bitfocus/companion-module-base/commit/e63bfd895367eecedfc05633231364a9a984bb34))

## [1.3.0](https://github.com/bitfocus/companion-module-base/compare/v1.2.1...v1.3.0) (2023-03-06)


### Features

* support specifying `runWhileHeld` from presets ([27663ae](https://github.com/bitfocus/companion-module-base/commit/27663ae9a43dcadb219713c90ebe3496b13b9be7))

## [1.2.1](https://github.com/bitfocus/companion-module-base/compare/v1.2.0...v1.2.1) (2023-02-22)


### Bug Fixes

* imported actions/feedbacks upgraded from -1 instead when not no scripts are needed ([32fa9b5](https://github.com/bitfocus/companion-module-base/commit/32fa9b564092664a2627f57f0309a7fb08d8f755))

## [1.2.0](https://github.com/bitfocus/companion-module-base/compare/v1.1.1...v1.2.0) (2023-02-21)


### Features

* add surfaceId property to action callback ([37b7673](https://github.com/bitfocus/companion-module-base/commit/37b76735b4487d64516dcbaf6614298f486edc85))
* provide `currentConfig` to upgrade scripts ([39e8bc3](https://github.com/bitfocus/companion-module-base/commit/39e8bc30cbf73d7f82848adc9c6dbb8a37df98e8))
* provide module with instance label ([766d934](https://github.com/bitfocus/companion-module-base/commit/766d9348b8247e0d93f57894087aed6d61e0f359))


### Bug Fixes

* ipc-wrapper memory leak ([2b7b2b9](https://github.com/bitfocus/companion-module-base/commit/2b7b2b9e0c77b113ccbe34fc5beb072833af8c1e))
* some testing of upgrade scripts ([d61b405](https://github.com/bitfocus/companion-module-base/commit/d61b40532d2a99a01d70fefca6c056333dc28ef1))
* upgrade script tests ([2b74f33](https://github.com/bitfocus/companion-module-base/commit/2b74f33d00009c987540ff6bac8ca3b305bfc4fb))

## [1.1.1](https://github.com/bitfocus/companion-module-base/compare/v1.1.0...v1.1.1) (2023-01-31)


### Bug Fixes

* race condition when async feedbacks are being checked ([a2ab3d9](https://github.com/bitfocus/companion-module-base/commit/a2ab3d9b72bb38f2fa29fb69de01a19deab05a9b))
* typings ([410ed15](https://github.com/bitfocus/companion-module-base/commit/410ed159164f160199d4b8840592077fe52b4fc6))

## [1.1.0](https://github.com/bitfocus/companion-module-base/compare/v1.0.2...v1.1.0) (2023-01-11)


### Features

* allow feedbacks to return a promise ([#32](https://github.com/bitfocus/companion-module-base/issues/32)) ([8923a5e](https://github.com/bitfocus/companion-module-base/commit/8923a5ecd2dfeb520880b049374fabad6e1f7260))


### Bug Fixes

* udp socket not reporting as listening ([51d5bbf](https://github.com/bitfocus/companion-module-base/commit/51d5bbfc93506924b2ea4769f48e41f48e0c20a5))

## [1.0.2](https://github.com/bitfocus/companion-module-base/compare/v1.0.1...v1.0.2) (2023-01-08)


### Bug Fixes

* don't subscribe actions/feedbacks that are disabled during init ([23ff218](https://github.com/bitfocus/companion-module-base/commit/23ff218ef24e347da36854269b649031508dd0b5))
* upgrade scripts not reporting results back to companion ([75ab637](https://github.com/bitfocus/companion-module-base/commit/75ab637f3672c064bd5ba9f651d876e259e09217))

## [1.0.1](https://github.com/bitfocus/companion-module-base/compare/v1.0.0...v1.0.1) (2022-12-20)


### Bug Fixes

* module init function should know if it is the first init ([3374ac1](https://github.com/bitfocus/companion-module-base/commit/3374ac16f28fc1c72420c99579a7544dd501882b))
* unhandled error in ipc-wrapper ([07c9472](https://github.com/bitfocus/companion-module-base/commit/07c94728f31164d214421b41e406e9da0c32ccad))

## [1.0.0](https://github.com/bitfocus/companion-module-base/compare/v0.6.1...v1.0.0) (2022-12-01)


### Features

* allow disabling requirement for variables to have a definition ([2018e8e](https://github.com/bitfocus/companion-module-base/commit/2018e8eb44d4eb49cd1f659871e607ce9782afa3))
* imageBuffer from advanced feedback improvements ([0a92773](https://github.com/bitfocus/companion-module-base/commit/0a927738fb9008616f1d555499ffc78fde8e59cf))


### Bug Fixes

* log error if feedback returned a promise ([fe9fe27](https://github.com/bitfocus/companion-module-base/commit/fe9fe27db79ad3303a18f3dbd09920f6ffa1a395))
* subscribe not being called when adding actions & feedbacks ([6701a43](https://github.com/bitfocus/companion-module-base/commit/6701a43be29f480e052659d3528340e7e4b24f12))


### Miscellaneous Chores

* release 1.0.0 ([9dce09c](https://github.com/bitfocus/companion-module-base/commit/9dce09c2c186d268a1d5da7c5b647f1b046c334d))

## [0.6.1](https://github.com/bitfocus/companion-module-base/compare/v0.6.0...v0.6.1) (2022-11-26)


### Bug Fixes

* missing exports ([5dbd28c](https://github.com/bitfocus/companion-module-base/commit/5dbd28cf35711eab037c63fbd00d2c5342f69121))

## [0.6.0](https://github.com/bitfocus/companion-module-base/compare/v0.5.1...v0.6.0) (2022-11-26)


### Features

* require node 18 ([7b42e3d](https://github.com/bitfocus/companion-module-base/commit/7b42e3d3b1d4877f6cce3298dd7a746dec48cfe1))


### Bug Fixes

* add missing properties ([6bb321c](https://github.com/bitfocus/companion-module-base/commit/6bb321c4c44ea44bd6a2a47c22c8c61bcf447dcd))

## [0.5.1](https://github.com/bitfocus/companion-module-base/compare/v0.5.0...v0.5.1) (2022-11-22)


### Bug Fixes

* enable CompanionInputFieldTextInput.useVariables ([4f77b3e](https://github.com/bitfocus/companion-module-base/commit/4f77b3ec644ab0802ce2f82e7799637f777ec495))

## [0.5.0](https://github.com/bitfocus/companion-module-base/compare/v0.4.8...v0.5.0) (2022-11-22)


### Features

* combine stepped and press button types ([#25](https://github.com/bitfocus/companion-module-base/issues/25)) ([e666bef](https://github.com/bitfocus/companion-module-base/commit/e666bef727fd5b0123921c8c81814ed116328066))

## [0.4.8](https://github.com/bitfocus/companion-module-base/compare/v0.4.7...v0.4.8) (2022-11-22)


### Bug Fixes

* typo in InstanceStatus enum ([91d8938](https://github.com/bitfocus/companion-module-base/commit/91d8938ff06d90eef5bc07ad28ae9102ceca07a2))
* upgrade scripts running unnecesarily ([6413e90](https://github.com/bitfocus/companion-module-base/commit/6413e90957c6a27f850bc72b785dfa63b7fd93e4))

## [0.4.7](https://github.com/bitfocus/companion-module-base/compare/v0.4.6...v0.4.7) (2022-10-16)


### Bug Fixes

* make multidropdown option naming consistent ([b322f6d](https://github.com/bitfocus/companion-module-base/commit/b322f6d534da98e0bcaffc373a080f1e9af70a2e))

## [0.4.6](https://github.com/bitfocus/companion-module-base/compare/v0.4.5...v0.4.6) (2022-10-04)


### Bug Fixes

* 'init' being received before module is ready ([d571d9c](https://github.com/bitfocus/companion-module-base/commit/d571d9c61f693f7387a8e517bbcaf7d794e20e3f))
* error propagation in ipc responses ([68c7c6e](https://github.com/bitfocus/companion-module-base/commit/68c7c6e8c9044be2f5aa3500103a3c70972dda2a))
* populate default module config at first start ([38da676](https://github.com/bitfocus/companion-module-base/commit/38da67618cc0b6502797003992a0e7610a06dedb))

## [0.4.5](https://github.com/bitfocus/companion-module-base/compare/v0.4.4...v0.4.5) (2022-10-02)


### Bug Fixes

* ejson.parse doesn't accept undefined ([3e079bb](https://github.com/bitfocus/companion-module-base/commit/3e079bb5223fbcabce461a406b2ecfbea1991c33))

## [0.4.4](https://github.com/bitfocus/companion-module-base/compare/v0.4.3...v0.4.4) (2022-10-02)


### Bug Fixes

* missing ejson conversion ([b5f881d](https://github.com/bitfocus/companion-module-base/commit/b5f881dfb0f98ce7383034b79273ff6177f75c10))
* update manifest schema ([2c7932b](https://github.com/bitfocus/companion-module-base/commit/2c7932bd3994ac8ff4a85dabcdb98061160f1318))

## [0.4.3](https://github.com/bitfocus/companion-module-base/compare/v0.4.2...v0.4.3) (2022-10-02)


### Bug Fixes

* manifest type reexports ([5ffff52](https://github.com/bitfocus/companion-module-base/commit/5ffff525ae7ee352f9369417e9da04cec1e807c3))

## [0.4.2](https://github.com/bitfocus/companion-module-base/compare/v0.4.1...v0.4.2) (2022-10-02)


### Bug Fixes

* module manifest validation issues ([4d6cc02](https://github.com/bitfocus/companion-module-base/commit/4d6cc028223786dd4101f19250d35ade37c35ea3))

## [0.4.1](https://github.com/bitfocus/companion-module-base/compare/v0.4.0...v0.4.1) (2022-10-01)


### Bug Fixes

* manifest validation failing once webpacked ([afa2970](https://github.com/bitfocus/companion-module-base/commit/afa2970ca99047c7b1648005a70c82f6d3401867))

## [0.4.0](https://github.com/bitfocus/companion-module-base/compare/v0.3.0...v0.4.0) (2022-10-01)


### Features

* encode ipc payloads with ejson, to make transfer less lossey ([fe1d388](https://github.com/bitfocus/companion-module-base/commit/fe1d3884769801fd1dadf5e62960cba0b98a753b))
* switch to using child-process ipc instead of socket.io for modules ([c38026f](https://github.com/bitfocus/companion-module-base/commit/c38026f40dbd551d90059ce24260e353df359756))
* switch to using child-process ipc instead of socket.io for modules ([0256d09](https://github.com/bitfocus/companion-module-base/commit/0256d09e1b0870bb1e825442a1be8e31c2a53eb5))

## [0.3.0](https://github.com/bitfocus/companion-module-base/compare/v0.2.0...v0.3.0) (2022-09-29)


### Features

* add json schema for companion/manifest.json files ([dd69090](https://github.com/bitfocus/companion-module-base/commit/dd69090fb9002c15b8624495b9b615753ff86270))
* api for recording actions ([#11](https://github.com/bitfocus/companion-module-base/issues/11)) ([ad27dcc](https://github.com/bitfocus/companion-module-base/commit/ad27dccab04af86e4367dcececd2bef00ede7c80))
* implement validation of manifest json, using the json schema ([1b5714d](https://github.com/bitfocus/companion-module-base/commit/1b5714d41eb1cc6dc842b9fcd16bd8cd284fc38a))
* modules set custom variables ([#12](https://github.com/bitfocus/companion-module-base/issues/12)) ([9d54fda](https://github.com/bitfocus/companion-module-base/commit/9d54fda81dcdf404779aba0aa81cae1e36bbc4ca))

## [0.2.0](https://github.com/bitfocus/companion-module-base/compare/v0.1.2...v0.2.0) (2022-09-04)


### Features

* convert InstanceStatus into proper enum ([73213ab](https://github.com/bitfocus/companion-module-base/commit/73213ab4976168c5e7241ef0c8ea906464cef297))
* initial refactored socket helpers ([603b806](https://github.com/bitfocus/companion-module-base/commit/603b80655cf85a5577b28ae06c32e109f23b8755))

## [0.1.2](https://github.com/bitfocus/companion-module-base/compare/v0.1.1...v0.1.2) (2022-07-21)


### Bug Fixes

* re-add method needed by legacy wrapper ([f0e3327](https://github.com/bitfocus/companion-module-base/commit/f0e332713f14ab1b6be0333b3204073a51e56f44))

## [0.1.1](https://github.com/bitfocus/companion-module-base/compare/v0.1.0...v0.1.1) (2022-07-12)


### Bug Fixes

* allow subscribeActions and related methods ([70803d0](https://github.com/bitfocus/companion-module-base/commit/70803d0cdeb3b973ea3e12d3bb43412bfe9a797e))
* use apiVersion from manifest instead of package.json of @companion-module/base ([2ad58c1](https://github.com/bitfocus/companion-module-base/commit/2ad58c1938a1b95a4a99bde1ef50868bfff65133))

## [0.1.0](https://github.com/bitfocus/companion-module-base/compare/v0.0.4...v0.1.0) (2022-07-12)


### Features

* add apiVersion to manifest ([896f151](https://github.com/bitfocus/companion-module-base/commit/896f151ab63d652f600aec7869e9456fa0199b47))

## [0.0.4](https://github.com/bitfocus/companion-module-base/compare/v0.0.3...v0.0.4) (2022-07-12)


### Bug Fixes

* make non-async socket.io methods not pass a callback to companion. make less methods async ([7205498](https://github.com/bitfocus/companion-module-base/commit/7205498fba4aafab6c800a62c412751c23e3f412))
* make some 'setter' methods non-async ([cbbb3a0](https://github.com/bitfocus/companion-module-base/commit/cbbb3a04ed75f8b4d4f0f7369bef926702dca03a))
* module startup ([6c061af](https://github.com/bitfocus/companion-module-base/commit/6c061af4df2a0260715f269c3ad6ef8e9882ff76))

## [0.0.3](https://github.com/bitfocus/companion-module-base/compare/v0.0.2...v0.0.3) (2022-07-10)


### Bug Fixes

* another attempt at npm ([3d7738b](https://github.com/bitfocus/companion-module-base/commit/3d7738b77bdf6ced282cd043428e3ccde66851ef))

## [0.0.2](https://github.com/bitfocus/companion-module-base/compare/v0.0.1...v0.0.2) (2022-07-10)


### Bug Fixes

* npm-publish workflow ([0147cd2](https://github.com/bitfocus/companion-module-base/commit/0147cd2f8c30b22edf287dba2f3038f88b522c34))

## 0.0.1 (2022-07-10)


### Bug Fixes

* test ([8319a36](https://github.com/bitfocus/companion-module-base/commit/8319a362248d93c42e027c7ca431ddf10b1ca931))


### Miscellaneous Chores

* add warning to readme ([dd30e25](https://github.com/bitfocus/companion-module-base/commit/dd30e25ffa4c9a5c63c5be8184cf7e1efad63932))
