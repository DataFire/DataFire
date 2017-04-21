# DataFire
> This is a preview of the upcoming v2 release. See [v2.md](v2.md) for usage and gotchas

[![Travis][travis-image]][travis-link]
[![Code Climate][climate-image]][climate-link]
[![NPM version][npm-image]][npm-link]
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://www.npmjs.com/package/datafire)
<!--[![Dependency status][deps-image]][deps-link]
[![devDependency status][devdeps-image]][devdeps-link]-->
[![Share on Twitter][twitter-image]][twitter-link]
[![Chat on gitter][gitter-image]][gitter-link]

DataFire is an open source framework for building APIs and integrations.
It is built on top of open standards such as RSS and
[Open API](https://github.com/OAI/OpenAPI-Specification). Projects can be run locally, on a
cloud provider (AWS/Google/Azure), or on
[DataFire.io](https://datafire.io).

DataFire provides over 7,000 pre-built actions for over 250 APIs, Databases, and RSS feeds, including:

&bull; Slack &bull; GitHub &bull; Twilio &bull; Trello &bull; Spotify &bull;
Instagram &bull; Gmail &bull; Google Analytics &bull; YouTube &bull;

Actions are composable, so you can create your own actions by combining pre-built actions
and custom code. They can be triggered by an HTTP endpoint, on a schedule, or manually.

## Installation
> Be sure to install DataFire both globally and as a project dependency.

```
npm install -g datafire
npm install --save datafire
```

## Hello World
Here's a quick Hello World to get you started. You can view the [full example here](docs/Hello%20World.md),
which includes input validation, custom HTTP responses, and more.

#### ./hello.js
```js
var datafire = require('datafire');
module.exports = new datafire.Action({
  handler: function(input) {
    return "Hello, world!";
  },
});
```

#### ./DataFire.yml
```yaml
paths:
  /hello:
    get:
      action: ./hello.js
tasks:
  say_hi:
    action: ./hello.js
    schedule:
      rate: rate(2 hours)
```

Now we can run:
```bash
datafire serve --port 3000 &
# DataFire listening on port 3000

curl http://localhost:3000/hello
# "Hello, world!"
```

## Integrations
> See [Integrations.md](./docs/Integrations.md) for the full documentation

Integrations are available in the `@datafire` scope in npm. For example, to install `hacker_news`:
```bash
npm install @datafire/hacker_news
```

You can see a list of available integrations with `datafire list -a`.

Each integration comes with a set of actions. For example, the `hacker_news` integration
contains the `getStories`, `getItem`, and `getUser` actions. You can use these actions
directly, or wrap them with your own actions.

For example, you can create an API endpoint that returns your Hacker News profile
just by adding a path in DataFire.yml:

```js
paths:
  /hacker_news:
    get:
      action: hacker_news/getUser
      input:
        userID: 'norvig'
```

You can also run actions in JavaScript - the `run()` method will return a Promise:
```js
var hackerNews = require('@datafire/hacker-news').actions;

hackerNews.getUser.run({
  userID: 'norvig',
}).then(user => {
  console.log(user);
}).catch(e => {
  console.log('error', e);
})
```

## Flows
> [Read more about flows](docs/Flows.md)

Flows allow you to create complex actions that make a series of calls to different
APIs and services. They keep track of results at each step so you can reference them
at any step in the flow.


## Authentication
> [Read more about authentication](docs/Authentication.md)

You can use the `datafire authenticate` command to add credentials to your project.
You can also specify credentials in YAML, or programmatically (e.g. in environment variable).

For example, in DataFire.yml:
```yml
paths:
  /github_profile:
    get:
      action: github/me
      account:
        access_token: "abcde"
```

## Commands
> Run `datafire --help` or `datafire <command> --help` for more info

```bash
datafire serve --port 3000  # Start API server
datafire serve --tasks      # Start API server and start running tasks

datafire list             # View installed integrations
datafire list -a          # View all available integrations
datafire list -a -q news  # Search for integrations by keyword

datafire integrate --openapi http://petstore.swagger.io/v2/swagger.json
datafire integrate --rss http://www.reddit.com/.rss

datafire describe hacker-news           # Show info and actions
datafire describe hacker-news/getItem   # Show action details

datafire authenticate google-gmail      # Store credentials in DataFire-auth.yml

# Run an action
datafire run ./sendMessage.js

# Run integration actions with [integration]/[action]
datafire run hacker-news/getStories

# Pass parameters with --input
datafire run hacker-news/getStories --input.storyType top

# Use stored credentials with --as
datafire run github/me --as account_alias
```

[twitter-image]: https://img.shields.io/twitter/url/http/github.com/DataFire/DataFire.svg?style=social
[twitter-link]: https://twitter.com/intent/tweet?text=DataFire%20-%20open+source+integration+framework:&url=http%3A%2F%2Fgithub.com%2FDataFire%2FDataFire
[gitter-image]: https://badges.gitter.im/DataFire/DataFire.png
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
