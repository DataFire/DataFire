# DataFire

Version 2.0 will be an open-source integration framework built on top of [Serverless](/serverless/serverless).
Users will be able to run Dataflows on their own AWS account, or on DataFire.

## Project Structure
```
./serverless.yml

./dataflows/
    gmailToGitHub.js
    mailchimpCleanup.js

./integrations/
    gmail.openapi.yml
    github.openapi.yml
    mailchimp.openapi.yml

./credentials/
    gmail.json
    github.json
    mailchimp.json
```

## Add an integration
Integrations can be added by name (using APIs.guru) or by Open API URL:
```bash
datafire integrate gmail
datafire integrate https://api.foobar.com/openapi.json
```

## Deploy an integration
Using AWS, `datafire deploy` is an alias for `serverless deploy`.

Users can also set their DataFire API key to deploy to DataFire:
```bash
export DATAFIRE_API_KEY=asdf
datafire deploy -v
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
