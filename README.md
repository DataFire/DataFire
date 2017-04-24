# DataFire
> The DataFire API is changing! Check out [the latest preview](https://github.com/DataFire/DataFire/tree/v2)

[![Travis][travis-image]][travis-link]
[![Code Climate][climate-image]][climate-link]
[![NPM version][npm-image]][npm-link]
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://www.npmjs.com/package/datafire)
<!--[![Dependency status][deps-image]][deps-link]
[![devDependency status][devdeps-image]][devdeps-link]-->
[![Share on Twitter][twitter-image]][twitter-link]
[![Chat on gitter][gitter-image]][gitter-link]

DataFire is an open source framework for building APIs and integrations. Projects can be run locally, on a
cloud provider (AWS/Google/Azure), or on
[DataFire.io](https://datafire.io).

DataFire is built on top of open standards such as RSS and
[Open API](https://github.com/OAI/OpenAPI-Specification),
making it easy to add new integrations. DataFire currently provides over 7,000 actions for over 250 services including:

&bull; Slack &bull; GitHub &bull; Twilio &bull; Trello &bull; Spotify &bull;
Instagram &bull; Gmail &bull; Google Analytics &bull; YouTube &bull; MongoDB &bull;

Actions are composable, so you can create new actions by combining existing actions
with code and external libraries. They can be triggered by an HTTP endpoint, on a schedule, or manually.

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
    schedule: rate(2 hours)
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

First, let's create a new folder and add the Hacker News integration:
```
mkdir hacker_news_flow && cd hacker_news_flow
npm install datafire
datafire integrate hacker-news
```

You can also run actions in JavaScript - the `run()` method will return a Promise:
```js
const datafire = require('datafire');
const fs = require('fs');
const hackerNews = datafire.Integration.new('hacker-news');

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
datafire run ./getTopStory.js
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
datafire run hacker_news/getStories

# Pass parameters with --input
datafire run hacker_news/getStories --input.storyType top

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
