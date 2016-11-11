# Add Integrations by URL
Integrations can be added by the URL of an Open API (Swagger) specification or an RSS feed:
```
datafire integrate --rss https://www.reddit.com/.rss
datafire integrate --openapi https://api.foobar.com/openapi.json --name foobar
```
This will copy the API specification into the `./integrations` directory in your current folder.

### API Specification Formats
If your API is in a different specification format, such as
**RAML** or **API Blueprint**, you can use [lucybot/api-spec-converter](https://github.com/lucybot/api-spec-converter)
to convert it to Open API 2.0

# Custom Integrations
> Custom Integrations are currently experimental

You can also define your own integration by extending the `datafire.Integration` class.

See [RSSIntegration](../lib/rss-integration.js),
[RESTIntegration](../lib/rest-integration.js), or
[MongoDBIntegration](../native_integrations/mongodb.js)
for examples
