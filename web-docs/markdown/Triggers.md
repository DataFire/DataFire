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

Start running tasks with:
```
datafire serve --tasks
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

In the above example, the action `reddit_rss/frontPage` returns a response like this:
```json
{
  "feed": {
    "entries": [{
      "link": "https://reddit.com/foo/bar",
      "title": "FooBar"
    }, {
      "link": "https://reddit.com/baz/quux",
      "title": "BazQuxx"
    }]
  }
}
```

In order to track the items in the `entries` array, we have to set two fields:
* `monitor.array` is set to `feed.entries` - the path we need to take from the top of the JSON response to get at the array.
* `monitor.trackBy` is set to `link` - this is the field we will use as a unique identifier for each entry.
Only entries with a link we haven't seen before will trigger the `post-story-to-slack.js` action.

