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
      return github.repos.owner.repo.issues.get.run({
        page: page++,
        owner: 'npm',
        repo: 'npm',
      }).then(nextPage);
    }

    return nextPage();
  }
});
```
