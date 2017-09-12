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
provides over [500 pre-built integrations](https://app.datafire.io/integrations), including:

AWS &bull; Azure &bull; MongoDB &bull; Slack &bull; GitHub &bull;
Twilio &bull; Trello &bull; Square &bull;
Google Sheets &bull; Gmail &bull; Heroku

Each integration provides a set of composable actions. New actions can be built by
combining existing actions, JavaScript, and external libraries.

Actions are driven by JavaScript Promises,
and can be triggered by a URL, on a schedule, or manually.

## Sample Projects
* [Create an API backed by Google Sheets](https://github.com/DataFire-flows/sheets-api)
* [E-mail yourself news headlines](https://github.com/DataFire-flows/headlines)
* [Sync GitHub issues to a Trello board](https://github.com/DataFire-flows/github-issues-to-trello)
* [Create a Spotify playlist from r/listentothis](https://github.com/DataFire-flows/listen-to-this)

## Installation
> Be sure to install DataFire both globally and as a project dependency.

```
npm install -g datafire
npm install --save datafire
```

## Hello World
> [See the full example](docs/Hello%20World.md) to learn about input validation,
> custom HTTP responses, and more.

Let's set up a simple DataFire project that has a single URL, `GET /hello`.

### Action
First we create a new action - the logic that will be run when the URL is loaded:
###### ./hello.js
```js
module.exports = {
  handler: function(input) {
    return "Hello, world!";
  }
};
```

### Trigger
Next we set up a trigger in DataFire.yml. There are three kinds of triggers:
* `paths` - URLs like `GET /hello` or `POST /pets/{id}`
* `tasks` - Jobs that run on a schedule, like "every hour", or "every tuesday at 3pm"
* `tests` - Jobs that can be run manually using the `datafire` command line tool

Here we create a `path` trigger:
###### ./DataFire.yml
```yaml
paths:
  /hello:
    get:
      action: ./hello.js
```

### Running
Now we can run:
```bash
datafire serve --port 3000 &
# DataFire listening on port 3000

curl http://localhost:3000/hello
# "Hello, world!"

kill $! # Stop the server
```

## Integrations
> [Learn more about integrations](./docs/Integrations.md)

Over 500 integrations are available on npm, under the `@datafire` scope.
For example, to install the `hacker_news` integration:
```bash
npm install @datafire/hacker_news
```

Each integration comes with a set of actions. For example, the `hacker_news` integration
contains the `getStories`, `getItem`, and `getUser` actions.

Check out the [usage](docs/Integrations.md) and [authentication](docs/Authentication.md) documentation to learn more.

### Authentication
> [Learn more about authentication](docs/Authentication.md)

Run `datafire authenticate <integration_id>` add credentials for a given integration.
You can also specify credentials in YAML, or programmatically (e.g. in environment variable).

## Actions
Actions come in two varieties:
* actions you build yourself in JavaScript, e.g. `./actions/hello.js`
* and actions that are part of an integration e.g. `hacker_news/getUser`

You can run actions on the command line:
```bash
datafire run hacker_news/getUser -i.username norvig
```

Or create triggers for them:
```yaml
paths:
  /hn/profile:
    get:
      action: hacker_news/getUser
      input:
        username: 'norvig'
```

Or run them in JavaScript:
```js
var hackerNews = require('@datafire/hacker_news').create();

// Using await (requires NodeJS >= v7.10):
var user = await hackerNews.getUser({username: 'norvig'});
console.log(user);

// Or with Promises:
hackerNews.getUser({
  username: 'norvig',
}).then(user => {
  console.log(user);
});
```

### Building Actions
> [Learn more about building actions](docs/Hello%20World.md) 

Every action has a `handler`, which must return a value or a Promise. Actions can also
specify their inputs and outputs (using JSON schema).
Input (but not output) will be validated each time the action is run.

## Triggers
In DataFire, actions are run by triggers. There are three different types of triggers:

* `paths` - URLs like `GET /hello` or `POST /pets/{id}`
* `tasks` - Jobs that run on a schedule, like "every hour", or "every tuesday at 3pm"
* `tests` - Jobs that can be run manually using the `datafire` command line tool

Each trigger must have an `action`, and can also specify the `input` and `accounts` to pass
to that action.

### Paths
Paths create URLs that trigger your actions. For example, you can create a URL that returns
your GitHub profile:
```
paths:
  /github_profile:
    get:
      action: github/users.username.get
      input:
        username: 'torvalds'
```

If you don't specify the `input` field, DataFire will automatically pass either query parameters
(for GET/DELETE/HEAD/OPTIONS) or the JSON body (for POST/PATCH/PUT) from the request to the
action.

Start serving your paths with:
```bash
datafire serve --port 3000
```

### Tasks
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

### Tests
Tests allow you to save a particular set of inputs and accounts for a given action, so that
the action can be run manually with the DataFire command-line tool.

```yaml
tests:
  get_torvalds:
    action: github/users.username.get
    input:
      username: torvalds
  get_norvig:
    action: github/users.username.get
    input:
      username: norvig
```

Run a test with:
```
datafire test <test_id>
```

## Flows
> [Learn more about flows](docs/Flows.md)

Flows allow you to chain actions together to make a series of calls to different
APIs and services. Flows keep track of results at each step so you can reference them
at any step.

## Cookbook
Check out the [cookbook](docs/Cookbook.md) for common patterns, including
paginated responses and mocking/testing.

## Commands
> Run `datafire --help` or `datafire <command> --help` for more info

```bash
datafire serve --port 3000  # Start API server
datafire serve --tasks      # Start API server and start running tasks

datafire list             # View installed integrations
datafire list -a          # View all available integrations
datafire list -a -q news  # Search for integrations by keyword

datafire integrate --name petstore --openapi http://petstore.swagger.io/v2/swagger.json
datafire integrate --name reddit --rss http://www.reddit.com/.rss

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

## Contributing
Contributions are welcome!

### Getting Started
```bash
git clone https://github.com/DataFire/DataFire && cd DataFire
npm install
```

### Running tests
Tests are run with `npm test` and require ports 3333-3336 to be open.

If you make changes that alter a project's Open API spec, run:
```
WRITE_GOLDEN=true npm test
```
