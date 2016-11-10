# Flows
Flows are a series of asynchronous steps. Each step will generally make one or more calls
to a given API endpoint, and store the resulting data in the `data` object. However,
you can add steps that execute any arbitrary code.

Flows use a waterfall design pattern - each step has access to the data returned in all
previous steps, and can use this data to construct its request.

Below is an example of DataFlow code:

```js
const datafire = require('datafire');
const fs = require('fs');
const hn = datafire.Integration.new('hacker_news');

const flow = module.exports =
      new datafire.Flow('copyStory', 'Copies the top HN story to a local file');

flow
  .step('stories', {
    do: hn.get('/{storyType}stories.json'),
    params: {storyType: 'top'}
  })
  .step('story_details', {
    do: hn.get('/item/{itemID}.json'),
    params: data => {
      return {itemID: data.stories[0]}
    }
  })
  .step('write_file', {
    do: data => {
      fs.writeFileSync('./story.json', JSON.stringify(data.story_details, null, 2));
    }
  });
```

# API

## Flow
### `Flow.constructor(name, description)`
Creates a new flow

Example:
```js
let flow = new datafire.Flow('copyStuff', "Copies stuff from here to there");
```

### `Flow.step(name, options)`
Adds a new step to the flow.
* `name` - a unique name for this step.
* `options.do` - either a function or a datafire `Operation`
* `options.params` - an object with the parameters to pass to `operation`, or
a function that returns that object
* `options.finish` - a synchronous function to run after `do` has executed.
Use this to modify or check the response in `data[name]`

#### Setting parameters
The following two steps are equivalent. The first uses an object literal for `params`,
while the second wraps it inside a function.
```js
flow.step('user', {
  do: github.get('/users/{username}'),
  params: {username: 'torvalds'}
})
```

```js
flow.step('user', {
  do: github.get('/users/{username}'),
  params: data => {
    return {username: 'torvalds'}
  }
})
```

#### Chaining
You can also chain calls to `step()`. Each step has access to the responses
from all the previous steps.

```
flow
  .step('users', {
    do: github.get('/users'),
  })
  .step('repos', {
    do: github.get('/users/{username}/repos'),
    params: data => {
      return {
        username: data.users[0].login,
      }
    }
  });
```

### `Flow.stepAsync(name, operation, request)`

### `Flow.stepRepeat(name, operation, request)`

### `Flow.catch(callback)`
Catches all HTTP errors (e.g. 404 or 500), and thrown errors.
Use this to react to errors e.g. by sending an e-mail.

```js
flow
  .step('messages', {
    do: gmail.get('/messages'),
    params: {limit: 10},
  })
  .catch((err, data) => {
    if (err.statusCode === 429) {
      console.log('Gmail rate limit exceeded, ignoring')
      flow.succeed();
    } else {
      throw err;
    }
  })
  .step('add_issue', {
    do: github.post('/issues'),
    params: data => {
      return {
        body {
          title: "There are " + data.messages.length + " new messages",
          body: messages.map(m => m.subject).join('\n'),
          assignee: 'bobby-brennan',
        }
      }
    }
  });
```


### `Flow.fail(message)`
Can be called inside of a step to exit early. No subsequent steps will be called.

### `Flow.succeed(message)`
Can be called inside of a step to exit early. No subsequent steps will be called.

### `Flow.setDefaults(defaults)`
Use `setDefaults` to parameterize your flow with options:

```js
flow.setDefaults({
  username: 'torvalds',
  repo: 'linux',
})
flow.step('issues', {
  do: github.get('/repos/{owner}/{repo}/issues'),
  params: () => {
    return {
      repo: flow.options.repo,
      username: flow.options.username,
    }
  }
})
```

You can then pass options via the command line:
```
datafire run -f ./copyIssues.js --options.username="expressjs" --options.repo="express"
```

Or via an HTTP request (if you're using Serverless):
```
curl http://something.execute-api.us-east-1.amazonaws.com/dev/copyIssues?username="expresjs"&repo="expres"
```

