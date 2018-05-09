## Triggers

Triggers tell DataFire how and when to run your actions. There are three different types of triggers:

* `paths` - URLs like `GET /hello` or `POST /pets/{id}`
* `tasks` - Jobs that run on a schedule, like "every hour", or "every tuesday at 3pm"
* `tests` - Jobs that can be run manually using the `datafire` command line tool

Each trigger must have an `action`, and can also specify the `input` and `accounts` to pass
to that action.

### Paths
Paths create URLs that trigger your actions. For example, you can create a URL that returns
your GitHub profile:
```yaml
paths:
  /github_profile:
    get:
      action: github/users.username.get
      input:
        username: 'torvalds'
```

If you don't specify the `input` field, DataFire will automatically pass either query parameters
(for GET/DELETE/HEAD/OPTIONS) or the JSON body (for POST/PATCH/PUT) from the request to the
action.

Start serving your paths with:
```bash
datafire serve --port 3000
```

### Tasks
You can schedule tasks in DataFire.yml by specifying a
[rate or cron expression](http://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html#RateExpressions).
```yaml
tasks:
  send_database_report:
    action: ./send-db-report.js
    schedule: rate(1 day) // or cron(0 0 * * * *)
    accounts:
      google_gmail: lucy
      mongodb: mongo_read_only
```

#### Monitors
A monitor will poll a particular resource for new items,
and only run your action if a new item is found. For instance, we can
check for new items on Reddit every 5 minutes:

```yaml
tasks:
  watch_reddit:
    schedule: rate(5 minutes)
    monitor:
      action: reddit_rss/frontPage
      array: feed.entries
      trackBy: link
      input:
        subreddit: sports
    action: ./post-story-to-slack.js
```

Start running tasks with:
```
datafire serve --tasks
```

