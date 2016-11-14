# Executing Flows
Flows can be run manually, on a schedule, or in response to an HTTP request.

While it's easy to self-host flows using cron, support is also built in for
AWS Lambda, which offers a [liberal free tier](https://aws.amazon.com/lambda/pricing/)

In your code, be sure to set `module.exports` to a flow object, e.g.
```js
module.exports = new Flow('myFlow', "an example flow");
```

### Command line
```
datafire run path/to/your/flow.js
```

### Crontab
The following will run flow.js every 5 minutes:
```
crontab -l > jobs
echo "*/5 * * * * datafire run /path/to/flow.js" >> jobs
crontab jobs
rm jobs
```


### AWS Lambda
Upload a .zip file of your project, and set `handler` to `path/to/your/flow.handler`.


### Serverless
> Read more about [Serverless](https://github.com/serverless/serverless)

To use the Serverless framework, just set your handler in `serverless.yml` to `yourFlow.handler`.
E.g. for a flow in ./flows/copyIssues.js:

```yml
service: copyIssues

provider:
  name: aws
  runtime: nodejs4.3

functions:
  copyIssues:
    handler: flows.copyIssues.handler
    events:
      - schedule: rate(1 hour)
      - http: POST /copyIssues
```

### DataFire.io
Coming soon!

