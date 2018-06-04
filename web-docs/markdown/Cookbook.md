# Cookbook
Some common patterns

## Server Options
You can set the following options in DataFire.yml:

* `cors` - enable cross-origin requests
* `cache` - time to cache requests (in millisecons)

```yaml
options:
  cors: true
  cache: 5000
paths:
  /hello:
    get:
      action: ./hello.js
```

## HTTP Requests
You can use `context.request` to access the original request

```js
module.exports = new datafire.Action({
  handler: (input, context) => {
    if (context.type === 'http') {
      console.log(context.request.method, context.request.path);
      console.log(context.request.query.name);
      console.log(context.request.headers.authorization);
    }
  }
})
```

## NodeJS Express
DataFire uses [Express](https://github.com/expressjs/express) with
[Swagger Middleware](https://github.com/BigstickCarpet/swagger-express-middleware)
to handle and validate requests. You can incorporate DataFire into your current Express
server using `ProjectServer.getRouter()`:

```js
let datafire = require('datafire');
let project = datafire.Project.fromDirectory(__dirname); // Dir containing DataFire.yml
let projectServer = new datafire.ProjectServer(project);

let express = require('express');
let app = express();

app.get('/hello', (req, res) => {
  res.send('hello world');
})

projectServer.getRouter().then(router => {
  app.use('/api', router);
});
```

### Custom Routing and Other Frameworks
If you want to handle routing yourself or via another framework, you can still use DataFire actions.
You can skip creating a DataFire project (i.e. no need for DataFire.yml), and use actions for input
validation and promise-based integrations:

```js
let datafire = require('datafire');
let express = require('express');

let action = new datafire.Action({
  inputs: [{
    title: 'name',
    type: 'string',
    default: 'world',
    minLength: 3,
  }],
  handler: input => "Hello, " + input.name,
})

app.get('/hello', (req, res) => {
  action.run(req.query)
      .then(result => res.json(result));
})
```

## Open API
You can access an Open API specification for your API at `/openapi.json`. For example:

```bash
datafire serve --port 3000 &
curl "http://localhost:3000/openapi.json" > openapi.json
```

You can also use DataFire.yml to specify top-level fields in your Open API,
such as `host`, `schemes`, and `info`:

```yaml
openapi:
  host: api.example.com:3000
  schemes:
    -https
  info:
    version: 2.0
```

## Pagination
The GitHub action `repos.owner.repo.issues.get` returns an array of
issues for a particular repository, but it only returns 30 issues at
a time.

To iterate over all issues, we pass the `page` input, incrementing it
until GitHub returns an empty array.

```js
let datafire = require('datafire');
let github = require('@datafire/github').actions;

module.exports = new datafire.Action({
  handler: input => {
    let allIssues = [];
    let page = 1;

    function nextPage(issues) {
      // If we get back an empty array, we've gotten all the issues available.
      if (issues && !issues.length) return allIssues;

      // Otherwise, add the latest page of issues to allIssues,
      // and get the next page.
      allIssues = allIssues.concat(issues || []);
      return github.repos.owner.repo.issues.get({
        page: page++,
        owner: 'npm',
        repo: 'npm',
      }).then(nextPage);
    }

    return nextPage();
  }
});
```

## Multiple Accounts
You can create actions that use multiple accounts for the same integration.
For example, you could copy GitHub issues from one repository to another.

```js
var datafire = require('datafire');
var github = require('@datafire/github').actions;
var action = new datafire.Action({
  security: {
    from_account: {
      description: "Account to use when retrieving issues",
      integration: 'github',
    },
    to_account: {
      description: "Account to use when creating issues",
      integration: 'github',
    },
  },
  inputs: [{
    title: 'fromRepo',
    type: 'string',
    description: "Repo to copy issues from, in the form `username/repo`",
  }, {
    title: 'toRepo',
    type: 'string',
    description: "Repo to copy issues from, in the form `username/repo`",
  }],
  handler: (input, context) => {
    return datafire.flow(context)
      .then(_ => {
        context.accounts.github = context.accounts.from_account;
        [owner, repo] = input.fromRepo.split('/');
        return github.repos.owner.repo.issues.get({owner, repo}, context)
      })
      .then(issues => {
        context.accounts.github = context.accounts.to_account;
        [owner, repo] = input.toRepo.split('/');
        return Promise.all(issues.map(issue => {
          return github.repos.owner.repo.issues.post({
            owner,
            repo,
            title: issue.title,
            body: issue.body,
          }, context);
        }))
      })
  }
});
```

## Testing
When testing your actions, you can mock any integration by calling `mockAll()`.
DataFire will use [json-schema-faker](https://github.com/json-schema-faker/json-schema-faker)
to mock the response for all of that integration's actions.

For example, say the `createUser` action sends a welcome message via Gmail.
We want to test that `createUser` runs successfully, but don't want to send
the welcome message.

```js
let gmailIntegration = require('@datafire/gmail');
gmailIntegration.mockAll();

let createUser = require('../actions/createUser.js');

describe("createUser", () => {
  it('should succeed', () => {
    return createUser.run({
      email: 'foo@bar.com',
      password: '12345678',
    });
  })
})
```

