# DataFire

Version 2.0 will be an open-source integration framework built on top of [Serverless](/serverless/serverless).
Users will be able to run Dataflows on their own AWS account, or on DataFire.

## Installation
You'll need to install DataFire both globally and as a project dependency.
```bash
npm install -g bobby-brennan/datafire
npm install --save bobby-brennan/datafire
```

## Quick Start
This quick tutorial will fetch issues from a repository on GitHub, and copy them to
a local file.

First, let's add the GitHub integration:
```bash
datafire integrate --name github
```

Now we need to create a Flow. Edit `./copyIssues.js`:
```js
const fs = require('fs');
const datafire = require('datafire');

let github = new datafire.Integration('github');

let flow = module.exports = new datafire.Flow('copyIssues', 'Copies issues from GitHub to a local file');

flow.setDefaults({
  username: 'bobby-brennan',
  repo: 'rss-parser',
});
flow.step('issues',
          github.get('/repos/{owner}/{repo}/issues'),
          {owner: flow.options.username, repo: flow.options.repo})
    .step('write_file',
          (data) => {
            fs.writeFileSync('./issues.json', JSON.stringify(data, null, 2));
          })

```

Now let's run it:
```bash
datafire run -f ./copyIssues.js
```

You should see `issues.json` in your current directory.

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
```bash
datafire integrate --name gmail
datafire integrate --url https://api.foobar.com/openapi.json
```
This will copy the API specification into the `./integrations` directory in your current folder.

To see a list of available integrations, run:
```bash
datafire list --all
```

To see the integrations you have installed, run:
```bash
datafire list
```

### Specification Formats
If your API is in a different specification format, such as
**RAML** or **API Blueprint**, you can use [lucybot/api-spec-converter](https://github.com/lucybot/api-spec-converter)
to convert it to Open API 2.0

## Deploy an integration
Using AWS, `datafire deploy` is an alias for `serverless deploy`.

Users can also set their DataFire API key to deploy to DataFire:
```bash
export DATAFIRE_API_KEY=asdf
datafire deploy -v
```

## Exploring Integrations
Once an integration is installed, you can use DataFire to view
the available operations and their parameters:
```bash
$ datafire integrate --name instagram
$ datafire describe --name instagram

GET     /media/search
Search for media in a given area. The default time span is set to 5 days. The time span must not exceed 7 days.
Defaults time stamps cover the last 5 days. Can return mix of `image` and `video` types.


GET     /media/shortcode/{shortcode}
This endpoint returns the same response as `GET /media/{media-id}`.

A media object's shortcode can be found in its shortlink URL. An example shortlink is
`http://instagram.com/p/D/`, its corresponding shortcode is `D`.


GET     /media/{media-id}
Get information about a media object. The returned type key will allow you to differentiate between image and
video media.

...


```


#### Running via DataFire
Deploying via DataFire allows you to monitor and control your Dataflows inside the
DataFire GUI.

Deploying will:
* Build your serverless artifact
* Upload artifact to DataFire
* DataFire will prefix your service name with your username
* DataFire will supplement `./credentials` with whatever is attached to your account
* DataFire will `serverless deploy` to the DataFire AWS account

## serverless.yml
serverless.yml follows the [standard format](https://serverless.com/framework/docs/providers/aws/guide/functions/),
and the `datafire.Dataflow` object exposes a serverless handler. In the example below `dataflows/gmailToGitHub.js` should
set `module.exports = new datafire.Dataflow()`
```yml
service: myService

provider:
  name: aws
  runtime: nodejs4.3

functions:
  gmailToGitHub:
    handler: dataflows/gmailToGitHub.handler
```

## Dataflow code
Below is an example of DataFlow code:

```js
let datafire = require('datafire');
let gmail = new datafire.Integration('gmail');
let github = new datafire.Integration('github');

let flow = module.exports = new datafire.Dataflow();
flow.addStep('messages', gmail.get('/messages'), {limit: 10})
    .addStep('add_issues', github.post('/issues'), (data) => {
      if (!data.messages.length) return flow.fail("No messages found");
      return data.messages.map(message => {
        title: message.subject,
        body: message.body,
        assignee: 'bobby-brennan',
      })
});
```

#### Custom data sources
```js
flow.addStep('widgets', (data) => {
  return JSON.parse(fs.readFileSync('./widgets.json', 'utf8'))
})
```

#### Async flow steps
```js
flow.addAsyncStep('widgets', (data, callback) => {
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
flow.addStep('messages', gmail.get('/messages'), {limit: 10})
    .catch((err, data) => {
       if (err.status === 401) data.messages = [];
       else flow.fail(err);
    })
    .addStep('add_issues', github.post('/issues'), (data) => {
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
```bash
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

```bash
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

```bash
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
flow.addStep('messages', gmail.as('bobby').get('/messages'))
    .addStep('copy_messages', gmail.as('andrew').post('/drafts'), (data) => {
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
