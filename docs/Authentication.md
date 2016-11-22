# Authentication
Datafire will store credentials for each integration in
`./credentials/{integration}.json`. The credential file
may contain one or more accounts.

> Be sure to add `credentials/` to your .gitignore

To add a new account, run
```
datafire authenticate <integration>
```
DataFire will prompt you for your credentials, as well as an `alias` for the account.

To use an account in your flow:
```js
let gmail = datafire.Integration.new('gmail').as('your_account_alias');
```

## OAuth 2.0
Many integrations, such as GitHub and GMail, offer OAuth 2.0
authentication. OAuth tokens are more secure than using
API keys or passwords, but are a bit more complicated.

If you've already generated an `access_token` manually, you can simply
enter it by running:
```
datafire authenticate <integration>
```

To generate a new OAuth token, you'll need to create a new OAuth
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


## Set a Default Account
To make flows easier to transfer between people and organizations, you tell an integration
to use the `default` account:

```js
let gmail = datafire.Integration.new('gmail').as('default');
```

This will use the default account for that integration, or choose
the first account if no default is set.

To set a default account, run
```
datafire authenticate <integration> --set_default alias_name
```
