# Changelog

## [1.13.4](https://github.com/bitfocus/companion-module-base/compare/v1.13.3...v1.13.4) (2025-10-18)


### Bug Fixes

* missing files in package ([528e743](https://github.com/bitfocus/companion-module-base/commit/528e7431c41c81e3d1c9bddd2ae9743e181df4c9))

## [1.13.3](https://github.com/bitfocus/companion-module-base/compare/v1.13.2...v1.13.3) (2025-10-18)


### Bug Fixes

* make `newSecrets` parameter to `saveConfig` optional, if secrets config is not being used [#152](https://github.com/bitfocus/companion-module-base/issues/152) ([ce8397b](https://github.com/bitfocus/companion-module-base/commit/ce8397b6cce4f3e43dc23070e03d27d87d936d93))
* make CompanionButtonPresetDefinition presetStyle a partial ([#156](https://github.com/bitfocus/companion-module-base/issues/156)) ([c4c8b49](https://github.com/bitfocus/companion-module-base/commit/c4c8b49a3cc6e18ec110661fdf880a8ab2d38063))

## [1.13.2](https://github.com/bitfocus/companion-module-base/compare/v1.13.1...v1.13.2) (2025-09-07)


### Bug Fixes

* expose `multiline` option on textinput field ([213347c](https://github.com/bitfocus/companion-module-base/commit/213347ca98dc2c87e34bd09f875ff896d8b812ec))
* exposes `showMinAsNegativeInfinity` and `showMaxAsPositiveInfinity` properties on number input field ([d290a74](https://github.com/bitfocus/companion-module-base/commit/d290a744251d0913a57380d93990c6b3b5bc799e))

## [1.13.1](https://github.com/bitfocus/companion-module-base/compare/v1.13.0...v1.13.1) (2025-09-04)


### Bug Fixes

* add regex to secret-text field ([51822ca](https://github.com/bitfocus/companion-module-base/commit/51822ca609718ac202eb7618a69a09b73155889a))

## [1.13.0](https://github.com/bitfocus/companion-module-base/compare/v1.12.1...v1.13.0) (2025-09-04)


### Features

* add desciption line below input fields ([d86300c](https://github.com/bitfocus/companion-module-base/commit/d86300ca0e777ef55fe869e2d7b24926172e46b8))
* add option to actions to skip unsubscribe being called when options change. ([3c4430d](https://github.com/bitfocus/companion-module-base/commit/3c4430d08c33311b9fae54f503518273704eb9f2))
* add value feedback type ([2e48256](https://github.com/bitfocus/companion-module-base/commit/2e482565bdd1545a74150695e94dfeaad6eaf8ee))
* allow actions to mark options to not treat reactively for subscription callbacks ([d959218](https://github.com/bitfocus/companion-module-base/commit/d95921803d342640a84cf638db286ebbb2e00515))
* connection secrets config ([d030871](https://github.com/bitfocus/companion-module-base/commit/d0308713fecf9b7307facdbf32c8c3c60a10bd92))
* split host api methods to separate out upgrade-script calls ([#118](https://github.com/bitfocus/companion-module-base/issues/118)) ([cfa561c](https://github.com/bitfocus/companion-module-base/commit/cfa561c05ebabbc058e1e83dfbffd65e44de5706))


### Bug Fixes

* make context.parseVariablesInString a no-op in subscribe/unsubscribe callbacks ([fbbb8a2](https://github.com/bitfocus/companion-module-base/commit/fbbb8a2b0af04453dd639c7fe1db858be0366684))
* only call feedback subscribe/unsubscribe when the feedback is added/removed, not for every update. ([56ba76a](https://github.com/bitfocus/companion-module-base/commit/56ba76a24c3b48dce9e42d64b93a9f53cc823848))
* upgrade index tracking in new flow ([27f71f5](https://github.com/bitfocus/companion-module-base/commit/27f71f5ffc65a79d711907e1e31ae1bd16d57809))

## [1.12.1](https://github.com/bitfocus/companion-module-base/compare/v1.12.0...v1.12.1) (2025-05-31)


### Bug Fixes

* add port to bonjour query ([#133](https://github.com/bitfocus/companion-module-base/issues/133)) ([d7e0344](https://github.com/bitfocus/companion-module-base/commit/d7e0344149e920965e527cd7f56fe4e2db11663b))
* Incorrect type check for callback parameter in SharedUdpSocketImpl.send ([#134](https://github.com/bitfocus/companion-module-base/issues/134)) ([de854eb](https://github.com/bitfocus/companion-module-base/commit/de854eb2998d6857d2a2259572b4d8cf7c62c2e4))

## [1.12.0](https://github.com/bitfocus/companion-module-base/compare/v1.11.3...v1.12.0) (2025-05-06)


### Features

* Add parseEscapeCharacters, substituteEscapeCharacters utility functions ([#117](https://github.com/bitfocus/companion-module-base/issues/117)) ([a5eb609](https://github.com/bitfocus/companion-module-base/commit/a5eb609fc15d892754c833817f8e1efe1eab1594))
* add permissions to manifest ([e13be3e](https://github.com/bitfocus/companion-module-base/commit/e13be3e903bae7a2d714de028698ad8d96658b1a))
* add prerelease field to manifest ([29fdd86](https://github.com/bitfocus/companion-module-base/commit/29fdd8633bc95901bc40843ca64f71dfb9bf50a1))
* allow defining `isVisible` on options as expressions ([b491303](https://github.com/bitfocus/companion-module-base/commit/b491303d11c7a3528c2ccba715d3fbd9bb029ff5))
* expose `hasLifecycleFunctions` property about actions to Companion ([0744101](https://github.com/bitfocus/companion-module-base/commit/07441017d2c27921c318135e85743066d28752a9))


### Bug Fixes

* adjust additionalProperties of manifest schema ([b1bd70e](https://github.com/bitfocus/companion-module-base/commit/b1bd70ea28c1a6aa66b8ffdd6f3b16ad17594b80))
* cleanup some deprecations ([ea2ec8d](https://github.com/bitfocus/companion-module-base/commit/ea2ec8d4358de68aacd26db8a5e90d45f7608533))

## [1.11.3](https://github.com/bitfocus/companion-module-base/compare/v1.11.2...v1.11.3) (2024-12-23)


### Bug Fixes

* validate that the upgrade-scripts look correct (like an array of functions) ([1416357](https://github.com/bitfocus/companion-module-base/commit/141635715b37ceb7d21a65345476dec76742dd9b))

## [1.11.2](https://github.com/bitfocus/companion-module-base/compare/v1.11.1...v1.11.2) (2024-11-18)


### Bug Fixes

* add rinfo to UDPHelper message event ([#103](https://github.com/bitfocus/companion-module-base/issues/103)) ([d7162c3](https://github.com/bitfocus/companion-module-base/commit/d7162c327183fb8ea9ad2e03facf700319b11b5b))

## [1.11.1](https://github.com/bitfocus/companion-module-base/compare/v1.11.0...v1.11.1) (2024-11-07)


### Bug Fixes

* Resolving broadcast option within UDP Helper ([#101](https://github.com/bitfocus/companion-module-base/issues/101)) ([3ea9614](https://github.com/bitfocus/companion-module-base/commit/3ea9614788c135f053f8bb43ff74b7466694039e))

## [1.11.0](https://github.com/bitfocus/companion-module-base/compare/v1.10.0...v1.11.0) (2024-09-23)


### Features

* allow using with nodejs 22 ([#94](https://github.com/bitfocus/companion-module-base/issues/94)) ([9d78a2e](https://github.com/bitfocus/companion-module-base/commit/9d78a2ee3c1e43c372ffa8a52f037d0bb1644b4c))

## [1.10.0](https://github.com/bitfocus/companion-module-base/compare/v1.9.0...v1.10.0) (2024-08-24)


### Features

* add `AuthenticationFailure` status [#86](https://github.com/bitfocus/companion-module-base/issues/86) ([5e71bf9](https://github.com/bitfocus/companion-module-base/commit/5e71bf92471d4671dc98f95de9492f06f0f9b59c))
* support additional imageBuffer properties ([2c96af2](https://github.com/bitfocus/companion-module-base/commit/2c96af223e424f184b424fd8daa3acce30f3dbb0))
* support multiple bonjourQueries per query input field [#87](https://github.com/bitfocus/companion-module-base/issues/87) ([64772ae](https://github.com/bitfocus/companion-module-base/commit/64772aea51779430e5ffac2785b69480ac822b26))

## [1.9.0](https://github.com/bitfocus/companion-module-base/compare/v1.8.1...v1.9.0) (2024-07-28)


### Features

* add delay property to `CompanionRecordedAction` with warning about lack of predictability ([82d964c](https://github.com/bitfocus/companion-module-base/commit/82d964cb80845e8551fd3c859520737b9e4ca98c))
* allow presets to define action/feedback headlines ([b717953](https://github.com/bitfocus/companion-module-base/commit/b717953f421f068b6f1deb47bbcbcd2b5c1bfee0))
* allow presets to define step names ([6732a7a](https://github.com/bitfocus/companion-module-base/commit/6732a7a0acf201be9ef6be1cefd08a8278ae5287))
* propogate recorded action delay ([d067603](https://github.com/bitfocus/companion-module-base/commit/d0676037de2a4e5923f04525a3881f6cb91f23e0))


### Bug Fixes

* add missing `textExpression` style property ([799fb67](https://github.com/bitfocus/companion-module-base/commit/799fb67b3ef64670c76192accb6e7957528000cb))

## [1.8.1](https://github.com/bitfocus/companion-module-base/compare/v1.8.0...v1.8.1) (2024-07-03)


### Bug Fixes

* require at least one product to be defined in manifest.schema.json ([#82](https://github.com/bitfocus/companion-module-base/issues/82)) ([7816348](https://github.com/bitfocus/companion-module-base/commit/78163482b172dddac703bea44a98f72dd43b4ca4))

## [1.8.0](https://github.com/bitfocus/companion-module-base/compare/v1.7.0...v1.8.0) (2024-04-26)


### Features

* indicate support for location based variables ([4473e9b](https://github.com/bitfocus/companion-module-base/commit/4473e9bc125292c00dfeb72c53080161e85b4739))
* shared udp listener https://github.com/bitfocus/companion/issues/2399 ([#72](https://github.com/bitfocus/companion-module-base/issues/72)) ([75774b0](https://github.com/bitfocus/companion-module-base/commit/75774b05a1df4d4c2dff0245bbf2d23df0c9c0da))
* Text preset type ([#80](https://github.com/bitfocus/companion-module-base/issues/80)) ([34c03db](https://github.com/bitfocus/companion-module-base/commit/34c03db5f69dca96e00effd15e2e0aa812f00647))


### Bug Fixes

* ipc-wrapper failed when receiving a non-error failure ([fe87955](https://github.com/bitfocus/companion-module-base/commit/fe879555c2ff7be04c178bece151e05301e1180f))
* Record the missing-error-handler timers and clear them on helper destroy() ([#79](https://github.com/bitfocus/companion-module-base/issues/79)) ([5142a62](https://github.com/bitfocus/companion-module-base/commit/5142a62d532838459c1965336b2a59af26204be0))
* rename 'locationBased' to 'local' variables ([71e5b33](https://github.com/bitfocus/companion-module-base/commit/71e5b3325a5386e49ef84644479ca229f999a84a))

## [1.7.0](https://github.com/bitfocus/companion-module-base/compare/v1.6.0...v1.7.0) (2024-01-06)


### Features

* Add a MAC Address regex ([#54](https://github.com/bitfocus/companion-module-base/issues/54)) ([27ea96c](https://github.com/bitfocus/companion-module-base/commit/27ea96cf2c478d759af793090a1e32ad2304c292))
* allow specifying 'learn' function timeout ([d6b2f72](https://github.com/bitfocus/companion-module-base/commit/d6b2f72b379a4ce54f12d7720c7ad8113b2ccd8b))
* remove some deprecated fields ([aabc536](https://github.com/bitfocus/companion-module-base/commit/aabc536d1073d5fb014980f80bc0da1fd6bae0b3))


### Bug Fixes

* clear variable values when variable is removed https://github.com/bitfocus/companion/issues/2638 ([9e33afd](https://github.com/bitfocus/companion-module-base/commit/9e33afdbe91b7a5ff594a603412f16df6f307e20))
* ensure module manifest doesn't reference template module name ([af517e4](https://github.com/bitfocus/companion-module-base/commit/af517e453f89c9faf95707c996a181a58db97458))
* Validate more manifest fields which might be duplicated from the template ([#67](https://github.com/bitfocus/companion-module-base/issues/67)) ([11e4f00](https://github.com/bitfocus/companion-module-base/commit/11e4f00ddc829611b9d01d44e56b86a9149bdb5d))

## [1.6.0](https://github.com/bitfocus/companion-module-base/compare/v1.5.1...v1.6.0) (2023-10-14)

Requires Companion 3.2 or later

### Features

* bonjour discovery config fields ([#57](https://github.com/bitfocus/companion-module-base/issues/57)) ([37d3cd9](https://github.com/bitfocus/companion-module-base/commit/37d3cd91aea400eb2685954ba6b792fd58559973))
* support css colors and alpha colorpicker ([1660c3b](https://github.com/bitfocus/companion-module-base/commit/1660c3b37395c5fd240579b3ae4ed864c3f337a1))


### Bug Fixes

* expose ipc type ([c66d6f2](https://github.com/bitfocus/companion-module-base/commit/c66d6f2344ee5f4f239256765a9ec0fe559dc556))

## [1.5.1](https://github.com/bitfocus/companion-module-base/compare/v1.5.0...v1.5.1) (2023-10-02)


### Bug Fixes

* use sequential ids in ipcWrapper, to ensure nanoid doesn't drain the system entropy pool ([5b5c32c](https://github.com/bitfocus/companion-module-base/commit/5b5c32cf3b9a1fe5b9b900c90d02a1970fd0a7c1))

## [1.5.0](https://github.com/bitfocus/companion-module-base/compare/v1.4.3...v1.5.0)  (2023-08-27)

Requires Companion 3.1 or later

### Features

* boolean feedback invert ([#59](https://github.com/bitfocus/companion-module-base/issues/59)) ([aa28207](https://github.com/bitfocus/companion-module-base/commit/aa28207ee5f71f280a5c61d78424f9f6a03e12f9))

## [1.4.3](https://github.com/bitfocus/companion-module-base/compare/v1.4.2...v1.4.3) (2023-08-13)


### Bug Fixes

* inline modified debounce-fn into this package ([a068123](https://github.com/bitfocus/companion-module-base/commit/a06812312b2582361d4e0e5e75795c4451a83ae9))
* simplify inlined debounce-fn ([cdc1f2b](https://github.com/bitfocus/companion-module-base/commit/cdc1f2b34913f6fd2008ab74b2dbdd7561d316ec))
* simplify inlined debounce-fn ([9b2f437](https://github.com/bitfocus/companion-module-base/commit/9b2f437bc1e1170d97db488126fe8d7c40363013))

## [1.4.2](https://github.com/bitfocus/companion-module-base/compare/v1.4.1...v1.4.2) (2023-08-13)


### Bug Fixes

* add `isVisibleData` parameter to `isVisible` functions ([ddb1b42](https://github.com/bitfocus/companion-module-base/commit/ddb1b427de4606e4417f79d83cf25d277480c427))
* Don't crash if action/feedback options are missing [#53](https://github.com/bitfocus/companion-module-base/issues/53) ([d4e271d](https://github.com/bitfocus/companion-module-base/commit/d4e271ded4b70d69641fc1655f2c14555c8865b0))

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
