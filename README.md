# DataFire
> This is a **preview release**. The API may change.

[![Travis][travis-image]][travis-link]
[![Code Climate][climate-image]][climate-link]
[![NPM version][npm-image]][npm-link]
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://www.npmjs.com/package/datafire)
<!--[![Dependency status][deps-image]][deps-link]
[![devDependency status][devdeps-image]][devdeps-link]-->
[![Share on Twitter][twitter-image]][twitter-link]
[![Chat on gitter][gitter-image]][gitter-link]

DataFire is an open source integration framework - think Grunt for APIs, or Zapier for the command line.
It is built on top of open standards such as RSS and
[Open API](https://github.com/OAI/OpenAPI-Specification). Flows can be run locally, on
AWS Lambda, Google Cloud, or Azure via the [Serverless](https://github.com/serverless/serverless) framework, or on
[DataFire.io](https://datafire.io).

DataFire natively supports over
[250 public APIs](https://github.com/APIs-guru/openapi-directory) including:

&bull; Slack &bull; GitHub &bull; Twilio &bull; Trello &bull; Spotify &bull;
Instagram &bull; Gmail &bull; Google Analytics &bull; YouTube &bull;

as well as MongoDB, RSS feeds, and [custom integrations](docs/Integrations.md).

## Installation
> Be sure to install DataFire both globally and as a project dependency.

```
npm install -g datafire
npm install --save datafire
```

## Examples
> See [Datafire/headlines](https://github.com/DataFire/headlines) for a reference project.

* [Quickstart](examples/0.%20quickstart)
* [News Headlines](examples/headlines) - Send yourself a daily e-mail with headlines from NPR, CNN, and NYTimes
* [Listen to This](examples/listen_to_this) - Create a Spotify playlist from tracks posted to Reddit's r/listentothis
* [GitHub to Trello](examples/github_to_trello) - Create Trello cards for every issue in your repo
* [Heroku Crash Alerts](examples/crash_alerts) - Get a Slack message when a Heroku process crashes
* [Authentication](examples/1.%20authentication)
* [Error Handling](examples/2.%20error_handling)
* [Pagination](examples/3.%20pagination)
* [Data Diffing](examples/4.%20data_diffing)

## Exploring Integrations
You can use the command line tool to search for integrations. Once an integration
is installed, you can view the parameters and response schema for each operation,
as well as make test calls.
![Exploing Integrations](./docs/explore.gif)

## Writing Flows
> See [Flows.md](./docs/Flows.md) for the full documentation

Flows allow you to make a series of calls to different APIs and services.
You can synchronize, transfer, and react to data, no matter where it's stored.

### Quickstart
> You can view this flow in the [examples directory](./examples/0. quickstart).

This quick tutorial will fetch stories from Hacker News, get the details
for the top story, then store the results to a local file.

First, let's create a new folder and add the Hacker News integration:
```
mkdir hacker_news_flow && cd hacker_news_flow
npm install datafire
datafire integrate hacker_news
```

Now we can create a Flow. Edit `./getTopStory.js`:
```js
const datafire = require('datafire');
const fs = require('fs');
const hackerNews = datafire.Integration.new('hacker_news');

const flow = module.exports =
        new datafire.Flow('Top HN Story', 'Copies the top HN story to a local file');

flow
  .step('stories', {
    do: hackerNews.getStories(),
    params: {storyType: 'top'},
  })

  .step('story_details', {
    do: hackerNews.getItem(),
    params: data => {
      return {itemID: data.stories[0]}
    }
  })

  .step('write_file', {
    do: data => {
      fs.writeFileSync('./story.json', JSON.stringify(data.story_details, null, 2));
    }
  });
```

Now let's run it:
```
datafire run -f ./getTopStory.js
```
You should see `story.json` in your current directory.

## Commands
> Run `datafire --help` or `datafire <command> --help` for more info

```bash
datafire list -a          # View all available integrations
datafire list -a -q news  # Search for integrations by keyword
datafire list             # View installed integrations

datafire integrate gmail   # Add integrations by name (or a substring)

datafire describe gmail                                # Show info and operations
datafire describe gmail -o gmail.users.messages.list   # Show operation details
datafire describe gmail -o "GET /{userId}/messages"    # Alternative operation name

datafire authenticate gmail   # Store credentials for later use

# Make a test call to the API
datafire call github -o "GET /users"
# Use stored credentials with --as
datafire call github -o "GET /user" --as account_alias
# Pass parameters with --params.foo
datafire call github -o "GET /users/{username}" --params.username karpathy

# Run a flow
datafire run ./getMessages.js
```

## Integrations
> See [Integrations.md](./docs/Integrations.md) for the full documentation

You can add new integrations automatically from an OpenAPI specification or RSS feed.
There is also experimental support for writing custom integrations.

## Authentication
> See [Authentication.md](./docs/Authentication.md) for the full documentation

DataFire can store authentication details for each integration, and multiple accounts
can be created for a given integration.
Support for basic authentication (username/password), API keys, and OAuth 2.0 is built-in.

## Running Flows
> See [RunningFlows.md](./docs/RunningFlows.md) for the full documentation

Once you've written a flow, you have a number of options for running it:

* Manually on the command line
* On a schedule with cron
* On AWS Lambda
* Inside a Serverless project
* On [DataFire.io](https://datafire.io)

Lamdba, Serverless, and DataFire all offer ways to run your flow
either on a schedule or in response to HTTP requests (webhooks).

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
