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

## OAuth Clients
If you want to add an OAuth client to your project (e.g. to allow users
to log in with GitHub or Instagram), you can use the `oauth_callback`
action for that integration. For example:

```yaml
paths:
  /oauth_callback:
    get:
      action: ./github_callback.js
      accounts:
        github:
          client_id: abcd
          client_secret: xyz
```

```js
let datafire = require('datafire');
let github = require('@datafire/github');
module.exports = new datafire.Action({
  inputSchema: github.oauth_callback.inputSchema,
  handler: (input, context) => {
    return datafire.flow(context)
      .then(_ =>  github.oauth_callback.run({code}, context))
      .then(data => {
        return mongodb.update({
          table: 'users',
          query: {
            id: {$eq: context.user.id},
          },
          document: {
            github_access_token: data.access_token,
          }
        })
      })
  }
})
```

## Require Credentials
You can declare a set of credentials that your Action expects using the
`security` field. Each security item should specify an integration, or
a set of expected fields.

```js
let scrape = new datafire.Action({
  security: {
    github_account_to_scrape: {
      description: "The github account to scrape",
      integration: 'github'
    },
    database: {
      description: "Credentials for the database to write to"
      fields: {
        url: "The database URL",
        username: "Database user",
        password: "User's password"
      }
    }
  },
  handler: (input, context) => {
    // ...
  }
});

let context = new datafire.Context({
  accounts: {
    github_account_to_scrape: {
      api_key: 'abcde'
    },
    database: {
      url: '...',
      username: 'foo',
      password: 'bar',
    }
  }
})

scrape.run({}, context);
```

## Add Credentials using the CLI

To add a new account, run
```
datafire authenticate <integration>
```
DataFire will prompt you for your credentials, as well as an alias for the account.

###  OAuth 2.0
Many integrations, such as GitHub and Gmail, offer OAuth 2.0
authentication. OAuth tokens are more secure than using
API keys or passwords, but are a bit more complicated.

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
```
datafire authenticate <integration>
```

DataFire will prompt you for your `client_id` and `client_secret`,
then provide you with a URL to visit to log into your account.

Once you've logged in, you'll be redirected to localhost:3333, where
you should see your `access_token` and, if applicable, `refresh_token`.

