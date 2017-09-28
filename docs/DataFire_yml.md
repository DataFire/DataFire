# DataFire.yml

Here's a sample DataFire.yml that shows all the available fields.

```yaml
options:
  cors: true # enable cross-origin requests
  cache: 100 # number of millseconds to cache requests (can be overridden for each path)

# Use openapi to control fields in the openapi.json generated for your project
openapi:
  host: www.example.com
  schemes:
    - https
  info:
    description: An API built with DataFire
    version: 2.0.0-beta

# Store credentials for different APIs and services.
# You can also put this in DataFire-accounts.yml, which can be added to your .gitignore
accounts:
  mongodb_readonly:
    url: https://readonly@database.example.com

# paths are the URLs exposed by your project
paths:
  get:
    /hello:
      action: ./actions/hello.js
      cache: false # disable cache for this path
    /goodbye:
      action: ./actions/goodbye.js
      cache: 500 # increase cache time for this path
      input:
        name: Ringo
      accounts:
        mongodb: mongodb_readonly # Specify accounts by the alias created above
        github:
          access_token: ABCDEFGH  # Or write the credentials in-line

# tasks will run on a regular schedule
tasks:
  send_database_report:
    action: ./actions/send_db_report.js
    accounts:
      mongodb: mongodb_readonly
    schedule: rate(1 day)  # You can use 'rate' or 'cron'

# tests can be run manually on the command line
tests:
  generate_database_report:
    action: ./actions/send_db_report.js
    accounts:
      mongodb: mongodb_readonly
    input:
      output_file: ./report.md
```

