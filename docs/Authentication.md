# Authentication
> If you want to try these examples, you can generate a GitHub
> access token [on the settings page](https://github.com/settings/tokens)

## Passing Credentials

If a particular integration needs auth, it will look in `context.accounts.integration_name`.
You can populate accounts programmatically, or using YAML configurations.

### YAML
Use the `accounts` field to specify credentials:

```yml
paths:
  /github_profile:
    get:
      action: github/user.get
      accounts:
        github:
          access_token: "abcde"
```


### Programmatically

You can add your credentials at runtime:

```js
var github = require('@datafire/github');
var action = new datafire.Action({
  handler: (input, context) => {
    context.accounts.github = {
      access_token: process.env.GITHUB_OAUTH_TOKEN,
    }
    return github.user.get.run({}, context);
  },
});
```

### Aliases
The `datafire authenticate` command will store each account in
DataFire-accounts.yml, along with an alias you can reference elsewhere.

> Be sure to add DataFire-accounts.yml to your .gitignore

For example, if we've added an account with alias `lucy`, we can
reference it in YAML:

```yml
paths:
  /github_profile:
    get:
      action: github/user.get
      accounts:
        github: lucy
```

or in NodeJS:
```js
var github = require('@datafire/github');
var action = new datafire.Action({
  handler: (input, context) => {
    context.accounts.github = context.accounts.lucy;
    return github.user.get.run({}, context);
  },
});
```

## Multiple Accounts
You can create actions that use multiple accounts for the same integration.
For example, you could copy GitHub issues from one repository to another.

```js
var datafire = require('datafire');
var github = require('@datafire/github').actions;
var getIssues = github.repos.owner.repo.issues.get;
var createIssue = github.repos.owner.repo.issues.post;
var action = new datafire.Action({
  accounts: {
    from_account: "GitHub account to use when retrieving issues",
    to_account: "GitHub account to use when creating issues",
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
        return getIssues({owner, repo}, context)
      })
      .then(issues => {
        context.accounts.github = context.accounts.to_account;
        [owner, repo] = input.toRepo.split('/');
        return Promise.all(issues.map(issue => {
          createIssue(issue, context);
        }))
      })
  }
});
```

## Command-line Usage

To add a new account, run
```
datafire authenticate <integration>
```
DataFire will prompt you for your credentials, as well as an alias for the account.

###  OAuth 2.0
Many integrations, such as GitHub and Gmail, offer OAuth 2.0
authentication. OAuth tokens are more secure than using
API keys or passwords, but are a bit more complicated.

If you've already generated an `access_token` manually, you can simply
enter it by running:
```
datafire authenticate <integration>
```

### Genrating OAuth tokens

The easiest way to generate an OAuth token is on [datafire.io](https://datafire.io).
However, you can also register your own OAuth client with the API provider
in order to generate tokens yourself.

First create a new OAuth
client on the integration's website, for example,
[github.com/settings/developers](https://github.com/settings/developers)
or
[console.developers.google.com](https://console.developers.google.com).

In your application's settings, set `redirect_uri`
to `http://localhost:3333`.

Finally, run
````
datafire authenticate <integration> --generate_token
```

DataFire will prompt you for your `client_id` and `client_secret`,
then provide you with a URL to visit to log into your account.

Once you've logged in, you'll be redirected to localhost:3333, where
you should see your `access_token` and, if applicable, `refresh_token`.

If the integration uses an `implict` flow, you'll need to copy these
credentials into the DataFire prompt. Otherwise DataFire will save them
automatically.

