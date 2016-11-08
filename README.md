# DataFire

DataFire is an open-source integration framework. It is built on top of
[Open API](https://github.com/OAI/OpenAPI-Specification) and integrates with the
[Serverless framework](https://github.com/serverless/serverless) for running flows
on AWS Lambda.

DataFire natively supports over
[250 public APIs](https://github.com/APIs-guru/openapi-directory) including:
* Slack
* GitHub
* Twilio
* Trello
* Spotify
* Instagram
* Gmail
* Google Analytics
* YouTube

## Installation
You'll need to install DataFire both globally and as a project dependency.
```
npm install -g bobby-brennan/datafire
npm install --save bobby-brennan/datafire
```

## Quickstart
This quick tutorial will fetch stories from Hacker News, get the details
for the top story, then store the results to a local file.

First, let's add the Hacker News integration:
```
datafire integrate hacker_news
```

Now we need to create a Flow. Edit `./getTopStory.js`:
```js
const datafire = require('datafire');
const fs = require('fs');
const hn = new datafire.Integration('hacker_news');

const flow = module.exports =
      new datafire.Flow('copyStory', 'Copies the top HN story to a local file');

flow.step('stories',
          hn.get('/{storyType}stories.json'),
          {storyType: 'top'})

    .step('story_details',
          hn.get('/item/{itemID}.json'),
          (data) => ({itemID: data.stories[0]}))

    .step('write_file',
          (data) => {
            fs.writeFileSync('./story.json', JSON.stringify(data.story_details, null, 2));
          })

```

Now let's run it:
```
datafire run -f ./getTopStory.js
```
You should see `story.json` in your current directory.

## Writing Flows
Flows are a series of asynchronous steps. Each step will generally make one or more calls
to a given API endpoint, and store the resulting data in the `data` object. However,
you can add steps that execute any arbitrary code.

Flows use a waterfall design pattern - each step has access to the data returned in all
previous steps, and can use this data to construct its request.

See [Flows.md](./Flows.md) for the full documentation on building flow steps, handling errors, etc.

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

## Exploring Integrations
![Exploing Integrations](./docs/flow.gif)

You can view a list of all available integrations by running
```
datafire list -a
```

Add any integration by specifying its name (or a substring):
```
datafire integrate gmail
```

To see the integrations you have installed, run:
```
datafire list
```

Once an integration is installed, you can use DataFire to view
the available operations and their parameters:
```
datafire integrate gmail
datafire describe gmail
```

To learn more about an operation, you can either specify its id or its method and path:
```
$ datafire describe gmail --operation gmail.users.messages.list
```

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
