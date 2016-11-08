# DataFire

DataFire is an open-source integration framework. It is built on top of
[Open API](https://github.com/OAI/OpenAPI-Specification) and integrates with the
[Serverless framework](https://github.com/serverless/serverless) for running flows
on AWS.

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

Now we need to create a Flow. Edit `./copyIssues.js`:
```js
const datafire = require('datafire');
const fs = require('fs');
const hn = new datafire.Integration('hacker_news');

const flow = module.exports =
      new datafire.Flow('copyStory', 'Copies the top HN story to a local file');

flow.step('stories',
          hn.get('/{storyType}stories.json'),
          {storyType: 'top'})
    .step('story',
          hn.get('/item/{itemID}.json'),
          (data) => ({itemID: data.stories[0]}))
    .step('write_file',
          (data) => {
            fs.writeFileSync('./story.json', JSON.stringify(data.story, null, 2));
          })

```

Now let's run it:
```
datafire run -f ./copyIssues.js
```
You should see `issues.json` in your current directory.

## Writing Flows
Flows are a series of asynchronous steps. Each step will generally make one or more calls
to a given API endpoint, and store the resulting data in the `data` object. However,
you can add steps that execute any asynchronous function.

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

Once an integration is installed, you can use DataFire to view
the available operations and their parameters:
```
$ datafire integrate -n googleapis.com:youtube --as youtube
$ datafire describe --i youtube

GET     /activities
youtube.activities.list
Returns a list of channel activity events that match the request criteria. For example, you can retrieve events associated with a particular channel, events associated with the user's subscriptions and Google+ friends, or the YouTube home page feed, which is customized for each user.

POST    /activities
youtube.activities.insert
Posts a bulletin for a specific channel. (The user submitting the request must be authorized to act on the channel's behalf.)

...
```

To learn more about an operation, you can either specify its id or method and path:
```
$ datafire describe --i youtube -o youtube.activities.list

GET     /activities
youtube.activities.list
Returns a list of channel activity events that match the request criteria. For example, you can retrieve events associated with a particular channel, events associated with the user's subscriptions and Google+ friends, or the YouTube home page feed, which is customized for each user.

PARAMETER       TYPE    REQUIRED DEFAULT DESCRIPTION                                                                     
part            string  yes              The part parameter specifies a comma-separated list of one or more activity     
                                         resource properties that the API response will include.  If the parameter       
                                         identifies a property that contains child properties, the child properties will 
                                         be included in the response. For example, in an activity resource, the snippet  
                                         property contains other properties that identify the type of activity, a display
                                         title for the activity, and so forth. If you set part=snippet, the API response 
                                         will also contain all of those nested properties.                               
channelId       string                   The channelId parameter specifies a unique YouTube channel ID. The API will then
                                         return a list of that channel's activities.                                     
home            boolean                  Set this parameter's value to true to retrieve the activity feed that displays  
                                         on the YouTube home page for the currently authenticated user.
```

## Add an Integration
Integrations can be added by name (using [APIs.guru](http://apis.guru)) or by
the URL of an Open API (Swagger) specification:
```
datafire integrate --name gmail
datafire integrate --url https://api.foobar.com/openapi.json
```
This will copy the API specification into the `./integrations` directory in your current folder.

To see a list of available integrations, run:
```
datafire list --all
```

To see the integrations you have installed, run:
```
datafire list
```

### Specification Formats
If your API is in a different specification format, such as
**RAML** or **API Blueprint**, you can use [lucybot/api-spec-converter](https://github.com/lucybot/api-spec-converter)
to convert it to Open API 2.0
