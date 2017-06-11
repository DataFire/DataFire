# Cookbook
Some common patterns

## CORS
To allow cross-origin requests, add the `cors` option to `DataFire.yml`:

```yaml
options:
  cors: true
paths:
  /hello:
    get:
      action: ./hello.js
```

## Open API

If you want to add documentation to your DataFire API, or add it to
[DataFire/Integrations](https://github.com/DataFire/Integrations),
you can access an Open API specification for your API at `/openapi.json`.

For example:

```bash
datafire serve --port 3000 &
curl "http://localhost:3000/openapi.json" > openapi.json
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

