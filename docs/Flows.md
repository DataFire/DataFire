# Flows
Every flow is a series of steps. Each step performs an asynchronous task (usually
an API call), and stores the result in `flow.data`.

Flows use a [waterfall](https://coderwall.com/p/zpjrra/async-waterfall-in-nodejs)
pattern - each step has access to all data returned in
previous steps, and can use this to generate the next request.

Below is an example flow. The steps are:
* `stories` - Gets a list of story IDs from Hacker News, e.g. `[234, 2352, 1834]`
* `story_details` - Gets details for the first story
* `write_file` - Writes the details to a local file

```js
const datafire = require('datafire');
const fs = require('fs');
const hacker_news = datafire.Integration.new('hacker_news');

const flow = module.exports =
      new datafire.Flow('Top HN Story', 'Copies the top HN story to a local file');

flow
  .step('stories', {
    do: hacker_news.getStories(),
    params: {storyType: 'top'},
  })
  .step('story_details', {
    do: hacker_news.getItem(),
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
### `Flow.constructor(name, description)`
Creates a new flow

Example:
```js
let flow = new datafire.Flow('Copy Stuff', "Copies stuff from here to there");
```

---
### `Flow.step(name, options)`
Adds a new step to the flow.
* `name` - a unique name for this step.
* `options.do` - either a function or a datafire `Operation`
* `options.params` - an object with the parameters to pass to `operation`, or
a function that returns that object
* `options.nextPage` - collect multiple pages of results
* `options.finish` - a function to run after `do` has executed.

#### `options.do`
`do` is the body of each step. It's where you'll fetch data, read/write files,
and call out to APIs or databases.

`do` often comes from an integration, e.g.
`hacker_news.getItem()`.  However, as you might have noticed in the
quickstart example, you can also pass in your own function:
```js
flow.step('write_file', {
  do: data => {
    fs.writeFileSync('./story.json', JSON.stringify(data.story))
  }
});
```

You can also make your function asynchronous:
```js
flow.step('write_file', {
  do: (data, callback) => {
    fs.writeFile('./story.json', JSON.stringify(data.story), (err) => {
      if (err) return callback(err);
      callback(null, "Success");
    })
  }
});
```

#### `options.params`
Use `options.params` to pass parameters to the Operation in `options.do`.

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

#### `options.nextPage`
Use `options.nextPage` if results are spread across multiple pages.

`nextPage` takes in the last set of parameters used, and modifies them
to get the next page of results.  If `nextPage` returns false/undefined,
DataFire will stop traversing pages of results.

```js
flow.step('users', {
  do: github.get('/users'),
  params: {page: 1},
  nextPage: (data, params) => {
    if (users.length > 100) return;
    params.page++;
    return params;
  },
  finish: data => {
    fs.writeFileSync('./users.json', JSON.stringify(data.users, null, 2))
  }
});
```

#### `options.finish`
A synchronous function to run after `options.do` has completed. Use this to
modify or check the response in `data[step.name]`.

#### Chaining
You can also chain calls to `step()`. Each step has access to the responses
from all the previous steps.

```js
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

---
### `Flow.catch(callback)`
Catches all HTTP errors (e.g. 404 or 500), and thrown errors.
Use this to recover from errors, perform additional logging,
or send error alerts via e-mail/SMS

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


---
### `Flow.fail(message)`
Can be called inside of a step to exit early. No subsequent steps will be called.


---
### `Flow.succeed(message)`
Can be called inside of a step to exit early. No subsequent steps will be called.


---
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
      repo: flow.params.repo,
      username: flow.params.username,
    }
  }
})
```

You can then pass options via the command line:
```
datafire run -f ./copyIssues.js --params.username="expressjs" --params.repo="express"
```

Or via an HTTP request (if you're using Serverless):
```
curl http://something.execute-api.us-east-1.amazonaws.com/dev/copyIssues?username="expresjs"&repo="expres"
```

