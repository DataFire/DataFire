# DataFire

DataFire is an open source integration framework. It is built on top of
[Open API](https://github.com/OAI/OpenAPI-Specification) and integrates with the
[Serverless framework](https://github.com/serverless/serverless) for running flows
on AWS Lambda.

DataFire natively supports over
[250 public APIs](https://github.com/APIs-guru/openapi-directory) including:

&bull; Slack &bull; GitHub &bull; Twilio &bull; Trello &bull; Spotify &bull;
Instagram &bull; Gmail &bull; Google Analytics &bull; YouTube &bull;

## Installation
> Be sure to install DataFire both globally and as a project dependency.

```
npm install -g bobby-brennan/datafire
npm install --save bobby-brennan/datafire
```

## Exploring Integrations
![Exploing Integrations](./docs/explore.gif)

## Commands
> Run `datafire --help` or `datafire <command> --help` for more info

```bash
datafire list -a   # View all available integrations
datafire list      # View installed integrations

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
datafire call github -i "GET /users/{username}" --params.username karpathy

# Run a dataflow script (see below)
datafire run ./getMessages.js  
```

## Writing Flows
> See [Flows.md](./docs/Flows.md) for the full documentation

### Quickstart
> You can view this flow in the [examples directory](./examples/quickstart).

This quick tutorial will fetch stories from Hacker News, get the details
for the top story, then store the results to a local file.

First, let's create a new folder and add the Hacker News integration:
```
mkdir hacker_news_flow
cd hacker_news_flow
datafire integrate hacker_news
```

Now we can create a Flow. Edit `./getTopStory.js`:
```js
const datafire = require('datafire');
const fs = require('fs');
const hn = datafire.Integration.new('hacker_news');

const flow = module.exports =
      new datafire.Flow('copyStory', 'Copies the top HN story to a local file');

flow
  .step('stories', {
    do: hn.get('/{storyType}stories.json'),
    params: {storyType: 'top'}
  })
  .step('story_details', {
    do: hn.get('/item/{itemID}.json'),
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
## Add a Custom Integration
Integrations can be added by the URL of an Open API (Swagger) specification:
```
datafire integrate --url https://api.foobar.com/openapi.json --as foobar
```
This will copy the API specification into the `./integrations` directory in your current folder.

### Specification Formats
If your API is in a different specification format, such as
**RAML** or **API Blueprint**, you can use [lucybot/api-spec-converter](https://github.com/lucybot/api-spec-converter)
to convert it to Open API 2.0

## Serverless Execution
To run a flow on a regular schedule, you can use [crontab](https://en.wikipedia.org/wiki/Cron),
but DataFire also offers native support for execution on AWS Lambda,
via the [Serverless](https://github.com/serverless/serverless) framework. You can then
run your flow on a schedule or in response to a webhook.

Just set your handler in `serverless.yml` to `yourFlow.handler`:

```yml
service: copyIssues

provider:
  name: aws
  runtime: nodejs4.3

functions:
  copyIssues:
    handler: copyIssues.handler
    events:
      - schedule: rate(1 hour)
      - http: POST /copyIssues
```
