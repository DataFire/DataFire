# DataFire

[![Travis][travis-image]][travis-link]
[![Downloads][downloads-image]][npm-link]
[![NPM version][npm-image]][npm-link]
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://www.npmjs.com/package/datafire)
<!--[![Dependency status][deps-image]][deps-link]
[![devDependency status][devdeps-image]][devdeps-link]-->
<!--[![Code Climate][climate-image]][climate-link]-->

[downloads-image]: https://img.shields.io/npm/dm/datafire.svg
[twitter-image]: https://img.shields.io/badge/Share-on%20Twitter-blue.svg
[twitter-link]: https://twitter.com/intent/tweet?text=DataFire%20-%20open+source+integration+framework:&url=http%3A%2F%2Fgithub.com%2FDataFire%2FDataFire
[gitter-image]: https://img.shields.io/badge/Chat-on%20Gitter-blue.svg
[gitter-link]: https://gitter.im/DataFire/Lobby
[npm-image]: https://img.shields.io/npm/v/datafire.svg
[npm-link]: https://npmjs.org/package/datafire
[travis-image]: https://travis-ci.org/DataFire/DataFire.svg?branch=master
[travis-link]: https://travis-ci.org/DataFire/DataFire
[climate-image]: https://codeclimate.com/github/DataFire/DataFire.png
[climate-link]: https://codeclimate.com/github/DataFire/DataFire
[deps-image]: https://img.shields.io/david/DataFire/DataFire.svg
[deps-link]: https://david-dm.org/DataFire/DataFire
[devdeps-image]: https://img.shields.io/david/dev/DataFire/DataFire.svg
[devdeps-link]: https://david-dm.org/DataFire/DataFire#info=devDependencies
[blog-image]: https://img.shields.io/badge/Read-on%20Medium-blue.svg
[blog-link]: https://medium.com/datafire-io
[mail-image]: https://img.shields.io/badge/Subscribe-on%20MailChimp-blue.svg
[mail-link]: https://eepurl.com/c3t10T

DataFire is an [open source](https://github.com/DataFire/DataFire/blob/master/LICENSE) framework for building and integrating APIs. It
provides over [1000 integrations](https://github.com/DataFire/Integrations), including:

AWS &bull; Azure &bull; MongoDB &bull; Slack &bull; GitHub &bull;
Twilio &bull; Trello &bull; Square &bull;
Google Sheets &bull; Gmail &bull; Heroku

Each integration provides a set of [composable actions](https://docs.datafire.io/Actions). New actions [can be built](https://docs.datafire.io/Introduction/Hello_World) by
combining existing actions, JavaScript, and external libraries. They are driven by [JavaScript Promises](https://developers.google.com/web/fundamentals/primers/promises),
and can be triggered by a URL, on a schedule, or manually.

Want more? [DataFire.io](https://datafire.io) provides a simple interface for building,
managing, and hosting DataFire projects.

[![Share on Twitter][twitter-image]][twitter-link]
[![Read on Medium][blog-image]][blog-link]
[![Chat on Gitter][gitter-image]][gitter-link]
[![Subscribe on MailChimp][mail-image]][mail-link]

## Installation
> Be sure to install DataFire both globally and as a project dependency.

```
npm install -g datafire
npm install --save datafire
```

## Documentation

The full documentation is available at [docs.datafire.io](https://docs.datafire.io)

## Sample Projects
|  |  |  |
|--|--|--|
| Create an API backed by Google Sheets | [Repo](https://github.com/DataFire-repos/spreadsheet-base) | [Run on DataFire.io](https://app.datafire.io/projects?baseRepo=https:%2F%2Fgithub.com%2FDataFire-repos%2Fspreadsheet-base) |
| E-mail yourself news headlines | [Repo](https://github.com/DataFire-flows/headlines) | [Run on DataFire.io](https://app.datafire.io/projects?baseRepo=https:%2F%2Fgithub.com%2FDataFire-flows%2Fheadlines)|
| Backend for a "Contact Us" form | [Repo](https://github.com/DataFire-repos/contact-us-base) | [Run on DataFire.io](https://app.datafire.io/projects?baseRepo=https:%2F%2Fgithub.com%2FDataFire-repos%2Fcontact-us-base) |
| Sync GitHub issues to a Trello board | [Repo](https://github.com/DataFire-flows/github-issues-to-trello) | [Run on DataFire.io](https://app.datafire.io/projects?baseRepo=https:%2F%2Fgithub.com%2FDataFire-flows%2Fgithub-issues-to-trello) |
| Create a Spotify playlist from r/listentothis | [Repo](https://github.com/DataFire-flows/listen-to-this) | [Run on DataFire.io](https://app.datafire.io/projects?baseRepo=https:%2F%2Fgithub.com%2FDataFire-flows%2Flisten-to-this) |

## Contributing
Contributions are welcome!

### Getting Started
```bash
git clone https://github.com/DataFire/DataFire && cd DataFire
npm install
```

Tests are run with `npm test` and require ports 3333-3336 to be open.

