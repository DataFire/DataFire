# Crashed Process Alerts
Get an alert in Slack when a Heroku process crashes.

```
datafire integrate slack heroku
datafire authenticate slack
# Follow prompts
datafire authenticate heroku
# Follow prompts

datafire run flow.js --params.channel general
```

Note that params.channel can be a chanel name or ID.
