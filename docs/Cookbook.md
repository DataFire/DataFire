# Cookbook
Some common patterns

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

