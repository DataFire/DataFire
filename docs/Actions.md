## Actions
Actions contain the logic that runs your DataFire project. Actions come in two varieties:
* actions you build yourself in JavaScript, e.g. `./actions/hello.js`
* actions that are part of an integration e.g. `hacker_news/getUser`

You can run actions on the command line:
```bash
datafire run hacker_news/getUser -i.username norvig
```

Or create triggers for them:
```yaml
paths:
  /my_profile:
    get:
      action: hacker_news/getUser
      input:
        username: 'norvig'
```

Or run them in JavaScript:
```js
var hackerNews = require('@datafire/hacker_news').create();

// Using await (requires NodeJS >= v7.10):
(async function() {

  var user = await hackerNews.getUser({username: 'norvig'});
  console.log(user);

})();

// Or with Promises:
hackerNews.getUser({
  username: 'norvig',
}).then(user => {
  console.log(user);
});
```

### Building Actions
> [Learn more about building actions](/Introduction/Hello_World)

Every action has a `handler`, which must return a value or a Promise. Actions can also
specify their inputs and outputs (using JSON schema).
Any inputs will be validated each time the action is run before the handler is called.

