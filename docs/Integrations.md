# Integrations
Over 800 integrations are available on npm, under the `@datafire` scope.
You can view a list of available integrations on [DataFire.io](https://app.datafire.io/integrations)

Each integration comes with a set of actions. For example, the `hacker_news` integration
contains the `getStories`, `getItem`, and `getUser` actions.

To add an integration to your project, run:
```
npm install @datafire/$integration
```
For example, to install the `hacker_news` integration:
```bash
npm install @datafire/hacker_news
```

## Using Integrations
Add an integration to your NodeJS project using `create()`. You can then
call its actions using Promises or async/await.

```js
let hn = require('@datafire/hacker_news').create();
```

### Authentication
> See [Authentication](/Authentication) for the full documentation

You can pass an account to  `create()`:

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



### Actions
Each integration offers a set of actions - each action returns a Promise.

#### With async/await
We recommend using NodeJS 7.10 or above, which includes support for `await`.

```js
let hn = require('@datafire/hacker_news').create();

(async () => {

  let storyIDs = await hn.getStories({storyType: 'top'});
  for (let itemID of storyIDs) {
    let story = await hn.getItem({itemID});
    console.log(story.title, story.url);
  }

})();
```

#### With Promises
If you're using an older version of Node, you can use Promises:
```js
let hn = require('@datafire/hacker_news').create();

hn.getStories({storyType: 'top'})
  .then(storyIDs => {
    return Promise.all(storyIDs.map(itemID => {
      return hn.getItem({itemID});
    }))
  })
  .then(stories => {
    stories.forEach(story => {
      console.log(story.title, story.url);
    })
  })

```

## Versioning
DataFire integrations use [semver](http://semver.org/) after version 0.1.0. Specifically:
* PATCH changes will occur for backward-compatible fixes, or documentation changes
* MINOR changes will occur when new functionality is added
* MAJOR changes will occur if breaking changes are made


## Custom Integrations

> If you'd like to add your API to the DataFire registry, submit a
> [pull request](https://github.com/DataFire/Integrations).

### Add Integrations by URL
New integrations can be added by the URL of an Open API (Swagger) specification or an RSS feed:
```
datafire integrate --rss https://www.reddit.com/.rss
datafire integrate --openapi https://api.acme.com/openapi.json --name acme
```

This will create the directory `./integrations/$name` with the required information. You can
reference this integration in NodeJS with:

```js
var acme = require('./integrations/acme');
```

#### API Specification Formats
You can also specify `--raml`, `--io_docs`, `--wadl`, or `--api_blueprint`, though you'll need to install
api-spec-converter:
```
npm install -g api-spec-converter
datafire integrate --raml https://raw.githubusercontent.com/raml-apis/Bufferapp/master/api.raml
```

### Write Integrations in JavaScript
You can greate custom integrations using the `datafire.Integration` class.
Here's an example that creates a filesystem integration:

```js
var datafire = require('datafire');
var fs = require('fs');
var filesystem = module.exports = new Integration({
  id: "filesystem",
  title: "Filesystem",
  description: "Gives read access to the filesystem",
});

filesystem.addAction('readFile', new datafire.Action({
  inputs: [{
    name: "filename",
    type: "string",
    maxLength: 100,
  }],
  handler: input => {
    return new Promise((resolve, reject) => {
      fs.readFile(input.filename, (err, contents) => {
        if (err) reject(err);
        else resolve(contents)
      });
    });
  }
}));
```

