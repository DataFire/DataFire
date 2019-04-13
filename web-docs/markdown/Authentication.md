# Authentication
> If you want to try these examples, you can generate a GitHub
> access token [on the settings page](https://github.com/settings/tokens)

## Passing Credentials to Integrations
You can populate accounts programmatically, or using YAML configurations.

### YAML

#### Project-level credentials
You can specify the project-level credentials in DataFire.yml or DataFire-accounts.yml.
We suggest adding DataFire-accounts.yml to your .gitignore.

You can also use the `datafire authenticate` command to populate DataFire-accounts.yml.

```yml
accounts:
  github: # the default account
    access_token: "abcde"
  github_alice:
    access_token: "fghij"
  github_bob:
    access_token: "klmno"
```

These accounts will be available in `context.accounts` in all of this project's actions.

#### Trigger-level credentials
You can override or add accounts for any trigger:

```yml
paths:
  /github_profile:
    get:
      action: github/user.get
      accounts:
        github:
          access_token: "12345"
```

### Programmatically
When using an integration, you can `.create()` an instance that will always use the same credentials,
or change accounts on the fly using `.actions`;

#### .create()
When you use `.create()`, you create an instance of the integration using the given account.

```js
let datafire = require('datafire');
let project = datafire.Project.main();
let github = require('@datafire/github').create(project.accounts.github_alice);
// or
github = require('@datafire/github').create({
  access_token: "abcde",
});

(async () => {

  let user = await github.user.get();
  console.log('Logged in user is ' + user.login);

})();
```

#### .actions
When you use `.actions`, you can specify the context each time an action is run.

```js
let datafire = require('datafire');
let project = datafire.Project.main();
let github = require('@datafire/github').actions;

let aliceContext = new datafire.Context({
  accounts: {
    github: project.accounts.github_alice,
  }
});

let bobContext = new datafire.Context({
  accounts: {
    github: project.accounts.github_bob,
  }
});

(async () => {

  let alice = await github.user.get(null, aliceContext);
  let bob = await github.user.get(null, bobContext);
  console.log(alice, bob);

})();
```

## OAuth Clients
If you want to add an OAuth client to your project (e.g. to allow users
to log in with GitHub or Instagram), you can use the `oauthCallback`
action for that integration. For example:

```yaml
paths:
  /oauth_callback:
    get:
      action: ./github_callback.js
      accounts:
        github_oauth_provider:
          client_id: abcd
          client_secret: xyz
```

```js
let datafire = require('datafire');
let project = datafire.Project.main();
let github = require('@datafire/github').actions;
let mongodb = require('@datafire/mongodb').create(project.accounts.mongodb);

module.exports = new datafire.Action({
  inputSchema: github.oauthCallback.inputSchema,
  handler: async (input, context) => {
    context.accounts.github = project.accounts.github_oauth_provider;
    let authData = await github.oauthCallback.run({code: input.code}, context);

    context.accounts.github = authData;
    let githubProfile = await github.user.get({}, context);

    let update = await mongodb.update({
      table: 'users',
      query: {
        id: {$eq: context.user.id},
      },
      document: {
        github_access_token: authData.access_token,
        email: githubProfile.email,
      }
    });

    return "Success";
  }
});
```

## Authorizers
Path triggers can use authorizers to populate `context.accounts` with the results of an action.

For example:
```yaml
authorizers:
  user:
    action: ./getUserByAPIKey.js
```

#### ./getUserByAPIKey.js
```js
module.exports = new datafire.Action({
  handler: (input, context) => {
    let auth = context.request.headers.authorization;
    if (!auth) return new datafire.Response({statusCode: 401});
    return mongodb.findOne({
      query: {
        apiKey: {$eq: auth}
      }
    });
  }
});
```

Authorizers in the top level will be run for every request. You can also override
authorizers for individual paths, or disable them by setting them to `null`.
```yaml
authorizers:
  user:
    action: ./getUserByAPIKey.js
paths:
  /public/status:
    get:
      action: ./getStatus.js
      authorizers:
        user: null
```

## Require Credentials
You can declare a set of credentials that your Action or Integration expects using the
`security` field. Each security item should specify an integration, or
a set of expected fields.

```js
let scrape = new datafire.Action({
  security: {
    github_account: {
      description: "The github account to read from",
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

### Generating OAuth tokens

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

