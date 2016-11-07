# DataFire

Version 2.0 will be an open-source integration framework built on top of [Serverless](/serverless/serverless).
Users will be able to run Dataflows on their own AWS account, or on DataFire.

## Installation
You'll need to install DataFire both globally and as a project dependency.
```
npm install -g bobby-brennan/datafire
npm install --save bobby-brennan/datafire
```

## Quick Start
This quick tutorial will fetch issues from a repository on GitHub, and copy them to
a local file.

First, let's add the GitHub integration:
```
datafire integrate --name github
```

Now we need to create a Flow. Edit `./copyIssues.js`:
```js
const fs = require('fs');
const datafire = require('datafire');

const github = new datafire.Integration('github');

const flow = module.exports =
      new datafire.Flow('copyIssues', 'Copies issues from GitHub to a local file');

flow.step('issues',
          github.get('/repos/{owner}/{repo}/issues'),
          {owner: 'torvalds', repo: 'linux'});
    .step('write_file',
          (data) => {
            fs.writeFileSync('./issues.json', JSON.stringify(data.issues, null, 2));
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

## Exploring Integrations
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

## Dataflow code
Below is an example of DataFlow code:

```js
const datafire = require('datafire');
const gmail = new datafire.Integration('gmail');
const github = new datafire.Integration('github');

const flow = module.exports = new datafire.Dataflow();
flow.step('messages', gmail.get('/messages'), {limit: 10})
    .step('add_issues', github.post('/issues'), (data) => {
      if (!data.messages.length) return flow.fail("No messages found");
      return data.messages.map(message => {
        title: message.subject,
        body: message.body,
        assignee: 'bobby-brennan',
      })
});
```

### Using options
You pass options to your flow via the command line:
```js
flow.setDefaults({
  username: 'torvalds',
  repo: 'linux',
})
flow.step('issues',
          github.get('/repos/{owner}/{repo}/issues'),
          () => ({repo: flow.options.repo, username: flow.options.username}))
```

```
datafire run -f ./copyIssues.js --options.username="expressjs" --options.repo="express"
```

#### Custom data sources
```js
flow.step('widgets', (data) => {
  return JSON.parse(fs.readFileSync('./widgets.json', 'utf8'))
})
```

#### Async flow steps
```js
flow.asyncStep('widgets', (data, callback) => {
  fs.readFile('./widgets.json', 'utf8', (err, content) => {
    if (err) return flow.fail(err);
    callback(content);
  })
})
```

#### Repeatable steps
e.g. to retrieve every page of results before continuing. In this example,
DataFire repeatedly populates data.issues_page, which the client appends to 
`data.issues` until no results are returned.

```js
flow.repeatStep('issues_page', github.get('/issues'), (data) => {
  data.page = data.page || 0;
  data.issues = data.issues || [];
  data.issues = data.issues.concat(data.issues_page || []);
  if (data.issues_page && !data.issues_page.length) {
    return flow.continue();
  } else {
    return {page: data.page++}
  }
})
```

#### Handle errors explicitly

```js
flow.step('messages', gmail.get('/messages'), {limit: 10})
    .catch((err, data) => {
       if (err.status === 401) data.messages = [];
       else flow.fail(err);
    })
    .step('add_issues', github.post('/issues'), (data) => {
      if (!messages.length) return flow.succeed();
      return data.messages.map(message => {
        title: message.subject,
        body: message.body,
        assignee: 'bobby-brennan',
      })
    });
```
## Events - Schedules and Webhooks
Use standard serverless.yml syntax for creating trigger events. On datafire, webhooks
will be deployed as datafire.io/username/*
```yml
functions:
  gmailToGitHub:
    handler: node_modules.datafire.handler
    events:
      - http: POST /runGmailToGitHub
      - schedule: rate(1 hour)
```

## Exploring Integrations
```
$ datafire list
gmail
github
mailchimp

$ datafire list -a
gmail
google-calendar
github
slack
facebook
twitter
...

$ datafire describe twitter
GET    /tweets/{id}      Gets a tweet by ID
POST   /tweets           Send a new tweet
GET    /users/{id}       Gets a user by ID
...

$ datafire describe twitter GET /tweets/{id}
Gets a tweet by ID
Parameters:
  id    string    The ID of the tweet
Response:
  id: integer,
  text: string,
  user:
    username: string
    age: integer
```

## Adding an integration
DataFire will expose an interactive process for adding a new integration, building an Open API spec as you go:
```
$ datafire integrate
Name
> foobar
URL base
> https://api.foobar.com/v1
Add a path (leave empty if you're done)
> /widgets
Add a method for /widgets (leave empty if you're done)
> GET
Add a paremeter for GET /widgets (leave empty if you're done)
> query
Type:
[x] string
[ ] integer
[ ] boolean
In:
[x] query
[ ] path
[ ] header
[ ] formData
Add a paremeter for GET /widgets (leave empty if you're done)
>
Add a method for /widgets (leave empty if you're done)
>
Add a path (leave empty if you're done)
>

Created ./integrations/foobar.openapi.yml
```

## Authentication
### API Keys and Basic Auth
Credentials will be expected to live in `./credentials/{integration}.json`.
`datafire authenticate` will populate this file:

```
$ datafire authenticate mailchip
Enter your API key:
> ac6db9ae
Enter your secret key:
> AJSJKZ_SJF2421
Saved to ./credentials/mailchimp.json
```

### OAuth 2
For running on AWS, `./credentials/{integration}.json` should contain
* access_token
* refresh_token
* client_id
* client_secret

```
$ datafire authenticate github
Enter your client_id:
> asdfasfds
Enter your client_secret:
> jojifasfd
Enter a valid access_token:
> fjksdjfaf
Enter a refresh_token (optional):
> aaersfdsafa

```

For running on DataFire, you can either specify credentials as above or
utilize DataFire's client:

```
$ datafire authenticate github --remote
Which scopes (separate with commas)?
user:email
repo
public_repo

> repo

Please visit https://github.com/authorize?scope=repo
```

This will attach access/refresh tokens to your account, which DataFire will
utilize when running your Dataflow.

### Multiple Accounts
You can keep multiple accounts inside `./credentials/{service}.json`:
```json
{
  "bobby": {"api_key": "ASDF"},
  "andrew": {"api_key": "HJKL"}
}
```

```js
flow.step('messages', gmail.as('bobby').get('/messages'))
    .step('copy_messages', gmail.as('andrew').post('/drafts'), (data) => {
      return data.messages.map(message => {
        to: message.to,
        subject: message.subject,
        body: message.body,
      })
    })
```

## DataFire API
DataFlows can run without interacting with the DataFire API, but the API will offer
some extra value on top of the open source framework:
* GUI for task management
* Credential management
* Logging
* Notifications
* Abstraction on top of AWS

### GET /integrations
Lists all integrations

### GET /integrations/{name}
Returns Open API for a given integration

### GET /integrations/{name}/credentials
Returns a list of authenticated accts
```
[{
  "name": "bobby",
  "api_key": "asdf"
}]
```

### POST /integrations/{name}/credentials
Adds a new acct

### GET /dataflows
Returns all known dataflows for the authenticated user

### GET /dataflows/{id}
Returns details for a given dataflow
