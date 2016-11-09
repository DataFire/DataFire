# Flows
Flows are a series of asynchronous steps. Each step will generally make one or more calls
to a given API endpoint, and store the resulting data in the `data` object. However,
you can add steps that execute any arbitrary code.

Flows use a waterfall design pattern - each step has access to the data returned in all
previous steps, and can use this data to construct its request.

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

# API

## Flow
### `Flow.constructor(name, description)`
Creates a new flow

Example:
```js
let flow = new datafire.Flow('copyStuff', "Copies stuff from here to there");
```

### `Flow.step(name, operation, request)`
Adds a new step to the flow.
* `name` - a name for this step. If `operation` is from a DataFire integration,
the response will be available in `data[name]`.
* `operation` - either a function or a datafire `Operation`
* `request` - either a literal object with the parameters to pass to `operation`, or
a function that returns that literal object

The following two flows are equivalent. The first uses an object literal for `request`,
while the second wraps it inside a function.
```js
let github = new datafire.Integration('github');
let flow = new datafire.Flow('copyStuff', "Copies stuff from here to there");
flow.step('user',
          github.get('/users/{username}'),
          {username: 'torvalds'})
```

```js
let github = new datafire.Integration('github');
let flow = new datafire.Flow('copyStuff', "Copies stuff from here to there");
flow.step('user',
          github.get('/users/{username}'),
          function(data) {
            return {username: 'torvalds'}
          })
```

You can also chain calls to `step()`. Each step has access to the responses
from all the previous steps.

```
flow.step('user',
          github.get('/users/{username}'),
          {username: 'torvalds'})
    .step('repos',
          github.get('/repos/{owner}/{repo}'),
          function(data) {
            return {owner: data.user.login, repo: 'foobar'}
          });
```

### `Flow.stepAsync(name, operation, request)`

### `Flow.stepRepeat(name, operation, request)`

### `Flow.catch(callback)`
Catches all HTTP errors (e.g. 404 or 500), as well as calls to `flow.fail()`.
Use this to react to errors e.g. by sending an e-mail.

```js
flow.step('messages', gmail.get('/messages'), {limit: 10})
    .catch((err, data) => {
       if (err.statusCode === 401) data.messages = [];
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


### `Flow.fail(message)`
Can be called inside of a step to exit early. No subsequent steps will be called.

### `Flow.succeed(message)`
Can be called inside of a step to exit early. No subsequent steps will be called.

# Exposing options
You can parameterize your flow with options:
```js
flow.setDefaults({
  username: 'torvalds',
  repo: 'linux',
})
flow.step('issues',
          github.get('/repos/{owner}/{repo}/issues'),
          () => ({repo: flow.options.repo, username: flow.options.username}))
```

You can then pass options via the command line:
```
datafire run -f ./copyIssues.js --options.username="expressjs" --options.repo="express"
```

Or via an HTTP request (if you're using Serverless):
```
curl http://something.execute-api.us-east-1.amazonaws.com/dev/copyIssues?username="expresjs"&repo="expres"
```

# Miscellaneous

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
