# DataFire.yml

Here's a sample DataFire.yml that shows all the available fields.

```yaml
options:
  cors: true        # enable cross-origin requests
  cache: 100        # number of millseconds to cache requests
  bodyLimit: 100kb  # maximum size of JSON body for HTTP requests

# Store credentials for different APIs and services.
# You can also put this (and other fields) in DataFire-accounts.yml, which can be added to your .gitignore
accounts:
  mongodb_readonly:
    url: https://readonly@database.example.com

# Authorizers will before each of your path triggers (unless disabled),
# and will populate context.accounts.AUTHORIZER_ID
authorizers:
  user:
    action: ./actions/get-user-from-auth-header.js

events:
  # This action will be called whenever one of your path triggers runs
  http:
    action: ./actions/log-http.js

  # This action will be called whenever one of your task triggers runs
  task:
    action: ./actions/log-task.js

  # This action will be called whenever one of your path or task triggers fails unexpectedly.
  error:
    action: ./actions/send-alert.js

  # This action will be called whenever one of your OAuth tokens is refreshed
  oauth_refresh:
    action: ./actions/update-refresh-token.js

# paths are the URLs served by your project
# E.g. the first path here will be served at GET http://localhost/hello
paths:
  # The minimum needed for a path trigger is an action
  /hello:
    get:
      action: ./actions/hello.js

  # You can also use actions from an installed integration
  /profile:
    get:
      action: github/users.username.get
      input:
        username: torvalds

# tasks will run on a regular schedule
tasks:
  send_database_report:
    action: ./actions/send_db_report.js
    schedule: rate(1 day)  # You can use 'rate' or 'cron'

# tests can be run manually on the command line
tests:
  generate_database_report:
    action: ./actions/send_db_report.js

# Use openapi to control fields in the openapi.json generated for your project
openapi:
  host: www.example.com
  schemes:
    - https
  info:
    description: An API built with DataFire
    version: 2.0.0-beta

```

## Triggers
`paths`, `tests`, and `tasks` all represent triggers for your actions. Triggers can have the following fields:

* `action` (required) - the action to call, either local (e.g. `./actions/do_something.js`) or from an integration (e.g. `xkcd/getLatestComic`)
* `accounts` - Accounts to use for this trigger, overriding project-level accounts
* `input` - Input to use for this trigger. If not set for a `path` trigger, the `path` will pass query parameters and JSON/form data as input.
* `errorHandler` - An action to run whenever an unknown error occurs.

`path` triggers also have these fields:

* `cache` - how long to cache the result of this action (server-side), overriding project-level cache
* `authorizers` - actions to run before this path is called, overriding project-level authorizers

`task` triggers also have these fields:

* `schedule` (required) - When to run the task, using `rate` or `cron`. Rate may be in minutes, hours, days, or months. Cron syntax [can be found here](https://en.wikipedia.org/wiki/Cron)
* `monitor` - Poll a resource for new data. Your action will only be run when new data appears.
* `monitor.action` - The action being polled
* `monitor.array` - The location of an array in the action's output to monitor, e.g. `feed.entries`
* `monitor.trackBy` - A field in each item of the array to use as an identifier, e.g. `link` or `info.title`
* `monitor.input` - input to `monitor.action`
* `monitor.accounts` - accounts for `monitor.action`
