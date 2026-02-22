# Changelog

## 0.2.0 (2026-02-22)


### ⚠ BREAKING CHANGES

* split out `checkAllFeedbacks` to trigger all feedbacks to be checked
* allow better typings for variables
* allow better typings for actions & feedbacks
* support expression for isInverted value
* remove subscribe callbacks for feedbacks
* swap action optionsToIgnoreForSubscribe for optionsToMonitorForSubscribe
* replace `InputValue` with `JsonValue`
* add generic constraint to TConfig and TSecrets
* remove parseVariablesInString off class, it should no longer be necessary
* remove parseVariablesInString methods from callback context, as they are no longer appropriate

### Features

* add generic constraint to TConfig and TSecrets ([a836ece](https://github.com/bitfocus/companion-module-base/commit/a836eceea95d00f7ebe865e2cc0bc86502b78dab))
* add scoped logging api ([752f85b](https://github.com/bitfocus/companion-module-base/commit/752f85bb62f9c79e884d33f0516b6444026d6692))
* add sortName property to actions and feedbacks ([a5da8ed](https://github.com/bitfocus/companion-module-base/commit/a5da8ed24387d54309e2135bea998bdfb4cbab58))
* allow better typings for actions & feedbacks ([6929e96](https://github.com/bitfocus/companion-module-base/commit/6929e9636abb2a16add296a988fa15b5abdce0be))
* allow better typings for variables ([59350ed](https://github.com/bitfocus/companion-module-base/commit/59350edf642dfe569969e39cb9c60f3ba91e9278))
* allow variables to produce any json ([b97e028](https://github.com/bitfocus/companion-module-base/commit/b97e028a80d4a899eb4c326617874e154ffede59))
* overhaul preset definitions ([#182](https://github.com/bitfocus/companion-module-base/issues/182)) ([440847a](https://github.com/bitfocus/companion-module-base/commit/440847a8dadfdb808911eb9676a8fa083a1e25a1))
* provide previous options to feedback callbacks ([227acd4](https://github.com/bitfocus/companion-module-base/commit/227acd426fc8f28a875c67d16bc1471b510f454f))
* rearrange into monorepo ([4fb57ce](https://github.com/bitfocus/companion-module-base/commit/4fb57cee8dc81dc6aa17bc7e5a5fc1d55e5c2c69))
* remove parseVariablesInString methods from callback context, as they are no longer appropriate ([4a85b3e](https://github.com/bitfocus/companion-module-base/commit/4a85b3e0f16f99688ebe1bb467ab3a7e8bd6148f))
* remove parseVariablesInString off class, it should no longer be necessary ([cd65d67](https://github.com/bitfocus/companion-module-base/commit/cd65d67213b602f426f949b9368e295023eb7330))
* remove subscribe callbacks for feedbacks ([0c17af0](https://github.com/bitfocus/companion-module-base/commit/0c17af09cab3a324daab75073fdce178a5ecc8ca))
* replace 'required' properties on input fields ([63855dc](https://github.com/bitfocus/companion-module-base/commit/63855dc8cf98c952c575fc746c88faf5eaf2a238))
* replace `InputValue` with `JsonValue` ([58aa5f5](https://github.com/bitfocus/companion-module-base/commit/58aa5f539ce6c7903b35210c0f962a744b451a81))
* rework module-api into split package structure ([cde0a91](https://github.com/bitfocus/companion-module-base/commit/cde0a910f5c38a24da3af286c0cb0bf7c272b4aa))
* split out `checkAllFeedbacks` to trigger all feedbacks to be checked ([5a95f6d](https://github.com/bitfocus/companion-module-base/commit/5a95f6d04dc28f3ce29c6ddf11f89214107d6209))
* support expression for isInverted value ([88e0911](https://github.com/bitfocus/companion-module-base/commit/88e0911375163a4a1f588690f1bc6c08addc098c))
* swap action optionsToIgnoreForSubscribe for optionsToMonitorForSubscribe ([4a7f428](https://github.com/bitfocus/companion-module-base/commit/4a7f428f8f5566f028d505e716df5113d0cc98ab))
* warn about usage of removed properties ([fc030ef](https://github.com/bitfocus/companion-module-base/commit/fc030ef3b20e8c41d12f138a3d5e0ce8528ce8e6))


### Bug Fixes

* add some validation of preset definitions ([84348d2](https://github.com/bitfocus/companion-module-base/commit/84348d20c32c494c1465ef156a2f1f879e830ce0))
* improve message for `checkFeedbacks` ([48cce9c](https://github.com/bitfocus/companion-module-base/commit/48cce9c7ec4d018a67efafc77766a5e4c8ae3670))
* remove unnecessary 'disabled' properties ([b85164a](https://github.com/bitfocus/companion-module-base/commit/b85164ab6ae0a61a4c2a8d5a10c9270ffa63e1b1))
* remove unnecessary 'upgradeIndex' properties ([8e947be](https://github.com/bitfocus/companion-module-base/commit/8e947befde93df46cf56c28fc0bcb8169d59f20e))
* warn if feedback descriptions mention 'change style' ([7f813e7](https://github.com/bitfocus/companion-module-base/commit/7f813e749859eb05777886eea34aa8c1bb86f8df))


### Miscellaneous Chores

* **companion-module-host:** trigger release ([d0774a4](https://github.com/bitfocus/companion-module-base/commit/d0774a49198f8dee58932b404f9d513dc76bdbf0))
