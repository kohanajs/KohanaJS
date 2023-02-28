# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 1.0.1 (2023-02-28)


### Features

* first commit ([c2970f9](https://github.com/kohanajs/KohanaJS/commit/c2970f992e75364dad1391b34e9307b9d78d565f))
* update KohanaJS to ESM ([f82b223](https://github.com/kohanajs/KohanaJS/commit/f82b2236d37ce4478aeaea518cd7ffe867d5acd2))

## [1.0.0] - 2023-02-25
### Added

* ORM write retry to prevent id collision
* ORM.countBy and countWith 
* remove system path folder, remove version
* add defer script and scripts default layout data
* tests and default layout data
* remove system path folder, remove version
* ORM field with Boolean type will become string after save.
- defaultViewData not assign to default layout.
- test files
- fix config loading error when config file not exist but provided fallback object.
- Default Database Driver
- KohanaJS init.js loading sequence, load require first, then system, then module
- update KohanaJS version number
- Move ControllerMixinMultipartForm to @kohanajs/mod-form
- Fix error when ORM eagerLoad not provide "with" Array.
- create CHANGELOG.md