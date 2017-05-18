# DataFire

[![Travis][travis-image]][travis-link]
[![Code Climate][climate-image]][climate-link]
[![NPM version][npm-image]][npm-link]
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://www.npmjs.com/package/datafire)
<!--[![Dependency status][deps-image]][deps-link]
[![devDependency status][devdeps-image]][devdeps-link]-->
[![Share on Twitter][twitter-image]][twitter-link]
[![Chat on gitter][gitter-image]][gitter-link]

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

DataFire is an open source framework for building and integrating APIs. It
provides over [350 pre-built integrations](https://github.com/DataFire/Integrations), including:

MongoDB &bull; Slack &bull; GitHub &bull; Twilio &bull; Trello &bull; Spotify &bull;
Instagram &bull; Gmail &bull; Google Analytics &bull; YouTube

Each integration provides a set of composable actions. New actions can be built by
combining existing actions, NodeJS, and external libraries.

Actions are driven by JavaScript Promises,
and can be triggered by an HTTP endpoint, on a schedule, or manually.

## Installation
> Be sure to install DataFire both globally and as a project dependency.

```
npm install -g datafire
npm install --save datafire
```

## Sample Projects
* [Create an API backed by Google Sheets](https://github.com/DataFire-flows/sheets-api)
* [E-mail yourself news headlines](https://github.com/DataFire-flows/headlines)
* [Sync GitHub issues to a Trello board](https://github.com/DataFire-flows/github-issues-to-trello)
* [Create a Spotify playlist from r/listentothis](https://github.com/DataFire-flows/listen-to-this)

## Hello World
> View the [full example](docs/Hello%20World.md) to learn about input validation,
> custom HTTP responses, scheduled tasks, and more.

#### ./hello.js
```js
module.exports = {
  handler: function(input) {
    return "Hello, world!";
  }
};
```

#### ./DataFire.yml
```yaml
paths:
  /hello:
    get:
      action: ./hello.js
```

Now we can run:
```bash
datafire serve --port 3000 &
# DataFire listening on port 3000

curl http://localhost:3000/hello
# "Hello, world!"

kill $! # Stop the server
```

## Integrations
> See [Integrations.md](./docs/Integrations.md) for the full documentation

Integrations are available in the `@datafire` scope in npm. For example, to install `hacker_news`:
```bash
npm install @datafire/hacker_news
```

Each integration comes with a set of actions. For example, the `hacker_news` integration
contains the `getStories`, `getItem`, and `getUser` actions.

```bash
datafire run hacker_news/getUser -i.username norvig
```

You can create an API call that runs any of these actions
by adding a path in DataFire.yml:

```yaml
paths:
  /hn/profile:
    get:
      action: hacker_news/getUser
      input:
        username: 'norvig'
```

```bash
datafire serve --port 3000 &
curl http://localhost:3000/hn/profile
# {
#   "about": "http://norvig.com",
#   "created": 1190398535,
#   "id": "norvig",
#   "karma": 640
# }
```

You can also run actions in JavaScript - the action will return a Promise:
```js
var hackerNews = require('@datafire/hacker_news').actions;

hackerNews.getUser({
  username: 'norvig',
}).then(user => {
  console.log(user);
}).catch(e => {
  console.log('error', e);
})
```

## Flows
> [Read more about flows](docs/Flows.md)

Flows allow you to chain actions together to make a series of calls to different
APIs and services. Flows keep track of results at each step so you can reference them
at any step.

## Tasks
You can schedule tasks in DataFire.yml by specifying a
[rate or cron expression](http://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html#RateExpressions).
```yaml
tasks:
  send_database_report:
    action: ./send-db-report.js
    schedule: rate(1 day) // or cron(0 0 * * * *)
    accounts:
      google_gmail: lucy
      mongodb: mongo_read_only
```

Start running tasks with:
```
datafire serve --tasks
```

## Authentication
> [Read more about authentication](docs/Authentication.md)

You can use the `datafire authenticate` command to add credentials to your project.
You can also specify credentials in YAML, or programmatically (e.g. in environment variable).

For example, in DataFire.yml:
```yml
paths:
  /github_profile:
    get:
      action: github/user.get
      accounts:
        github:
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

datafire describe hacker_news           # Show info and actions
datafire describe hacker_news/getItem   # Show action details

datafire authenticate google_gmail      # Store credentials in DataFire-auth.yml

# Run an action
datafire run ./sendMessage.js

# Run integration actions with [integration]/[action]
datafire run github/repositories.get

# Pass parameters with --input
datafire run github/search.repositories.get --input.q java

# Use credentials with --accounts
datafire run github/user.get --accounts.github.access_token "abcde"
```

## Cookbook
Check out the [cookbook](docs/Cookbook.md) for common patterns, including
paginated responses and mocking/testing.
