## Basic Concepts

There are three basic concepts in DataFire: **Integrations**, **Actions**, and **Triggers**

### Integrations

Integrations are third-party apps you can connect to your project. Often integrations involve a REST API,
such as the GitHub or Slack integrations. However, nearly any type of service can be wrapped with a
DataFire integration; for example, we have integrations for making HTTP requests, connecting to MongoDB,
and serving websites.

Most integrations will ask for some form of credentials or configuration. Use the `datafire authenticate`
command to add credentials to your project, or visit the *Integrations* tab in your project on DataFire.io

Each integration comes with a set of actions (see below). For instance, the Slack integration has one action
for listing all available channels, and another action for posting a new message.

[Read more about integrations](/Integrations)

### Actions

Actions contain the logic that runs your DataFire project. Each integration provides a set of actions,
and you can build new actions using NodeJS.

Each action needs, at minimum, a `handler`. This contains the logic that runs when the action is called.
Additionally, each action can specify an `inputSchema` and `outputSchema` to tell the caller exactly what
to expect. Any input will be validated against the schema before the handler is called.

[Read more about actions](/Actions)

### Triggers

Triggers tell DataFire when and how to run your actions. There are three types of triggers:

* **tasks** run your actions on a schedule, like *every ten minutes* or *every sunday at 11AM*
* **paths** put your actions behind a URL, so it can be triggered over the web. For example, `GET /pets` or `POST /payment`
* **tests** allow you to run your action manually

The trigger can also specify any input for the action and which accounts to use.

[Read more about triggers](/Triggers)
