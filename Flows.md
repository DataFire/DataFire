# Flows

## Dataflow code
Below is an example of DataFlow code:

```js
let datafire = require('datafire');
let gmail = new datafire.Integration('gmail');
let github = new datafire.Integration('github');

let flow = module.exports = new datafire.Dataflow();
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
