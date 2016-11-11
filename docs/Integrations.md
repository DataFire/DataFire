## Add a Custom Integration
Integrations can be added by the URL of an Open API (Swagger) specification or an RSS feed:
```
datafire integrate --rss https://www.reddit.com/.rss
datafire integrate --openapi https://api.foobar.com/openapi.json --name foobar
```
This will copy the API specification into the `./integrations` directory in your current folder.

### Specification Formats
If your API is in a different specification format, such as
**RAML** or **API Blueprint**, you can use [lucybot/api-spec-converter](https://github.com/lucybot/api-spec-converter)
to convert it to Open API 2.0
