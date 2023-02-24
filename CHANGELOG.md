# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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