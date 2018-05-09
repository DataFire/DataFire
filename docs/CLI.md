> Run `datafire --help` or `datafire <command> --help` for more info

```bash
datafire serve --port 3000  # Start API server
datafire serve --tasks      # Start API server and start running tasks

datafire list             # View installed integrations
datafire list -a          # View all available integrations
datafire list -a -q news  # Search for integrations by keyword

datafire integrate --name petstore --openapi http://petstore.swagger.io/v2/swagger.json
datafire integrate --name reddit --rss http://www.reddit.com/.rss

datafire describe hacker_news           # Show info and actions
datafire describe hacker_news/getItem   # Show action details

datafire authenticate google_gmail      # Store credentials in DataFire-auth.yml

# Run an action
datafire run ./sendMessage.js

# Run integration actions with [integration]/[action]
datafire run github/repositories.get

# Pass parameters with --input
datafire run github/search.repositories.get --input.q java

# Use credentials with --accounts
datafire run github/user.get --accounts.github.access_token "abcde"
```


