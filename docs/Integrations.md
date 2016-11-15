# Add Integrations by URL
Integrations can be added by the URL of an Open API (Swagger) specification or an RSS feed:
```
datafire integrate --rss https://www.reddit.com/.rss
datafire integrate --openapi https://api.foobar.com/openapi.json --name foobar
```
This will copy the API specification into the `./integrations` directory in your current folder.

### API Specification Formats
You can also specify `--raml`, `--io_docs`, `--wadl`, or `--api_blueprint`, though you'll need to install
api-spec-converter:
```
npm install -g api-spec-converter
datafire integrate --raml https://raw.githubusercontent.com/raml-apis/Bufferapp/master/api.raml
```

# Custom Integrations
> Custom Integrations are currently experimental

You can also define your own integration by extending the `datafire.Integration` class.

See [RSSIntegration](../lib/rss-integration.js),
[RESTIntegration](../lib/rest-integration.js), or
[MongoDBIntegration](../native_integrations/mongodb.js)
for examples
