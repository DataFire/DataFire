# Integrations
Integrations are in the `@datafire` npm namespace. You can view available integrations by
visiting datafire.io/integrations or running
```
datafire list -a
```

To add an integration to your project, run:
```
npm install @datafire/$integration
```

If you'd like to add your API to the DataFire registry, submit a
[pull request](https://github.com/DataFire/Integrations).

## Versioning
DataFire integrations use [semver](http://semver.org/) after version 0.1.0. Specifically:
* PATCH changes will occur for backward-compatible fixes, or documentation changes
* MINOR changes will occur when new functionality is added
* MAJOR changes will occur if breaking changes are made

## Add Integrations by URL
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

### API Specification Formats
You can also specify `--raml`, `--io_docs`, `--wadl`, or `--api_blueprint`, though you'll need to install
api-spec-converter:
```
npm install -g api-spec-converter
datafire integrate --raml https://raw.githubusercontent.com/raml-apis/Bufferapp/master/api.raml
```

# Custom Integrations
You can greate custom integrations using the `datafire.Integration` class.
Here's an example that creates a filesystem integration:

```js
var datafire = require('datafire');
var fs = require('fs');
var Integration = module.exports = new Integration({
  title: "Filesystem",
  description: "Gives read access to the filesystem",
});

Integration.actions.readFile = new datafire.Action({
  inputs: [{
    name: "filename",
    type: "string",
  }],
  handler: input => {
    return new Promise((resolve, reject) => {
      fs.readFile(input.name, (err, contents) => {
        if (err) reject(err);
        else resolve(contents)
      });
    });
  }
});
```

