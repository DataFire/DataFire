# Data Diffing
Often you'll want to monitor a data source for when a new item is added,
or when an item changes. Some integration platforms will automatically monitor data sources and
trigger your flow when a change occurs. This involves
keeping track of what has been seen, usually by keeping a list of IDs
in an external database.

To maintain flexibility, DataFire leaves diff detection up to the user.
In this example, the flow maintains a local file containing
all the issue IDs it has seen - if a new one comes in, it adds it to the
list and sends an SMS.

There are several possbile mechanisms for tracking new data, each with
its own tradeoffs:

### Maintain a file on disk
Write each new item ID to a local file.

#### Pros
* Simple to implement

#### Cons
* Not scalable
* Doesn't work on AWS, since disk isn't persistent

### External Database

#### Pros
* Robust
* Works anywhere

#### Cons
* Involves standing up a new DB
* Overkill in most situations

### Timing
If you know your flow will run every hour, and your data is tagged
with a `created_at` field, you can simply filter for items created
in the last hour.

#### Pros
* Simple to implement

#### Cons
* Changing the flow schedule can cause bugs
* If the flow stops running, data will be lost

### Marking the data source
If you're monitoring your own database, you can add a `seen` field
to the database and poll for items with `seen == false`. Some APIs
might allow you to attach extra data to items as well - e.g. we could
add a `seen` tag to GitHub issues after they come through the flow.

#### Pros
* Robust
* Simple to implement

#### Cons
* Clutters data source
* Not always possible

### Webhooks
Some APIs will call out to a user-specified URL when new data is created.
If you deploy your flow using Serverless and add an HTTP event, you can
use the URL provisioned by AWS as a webhook.

#### Pros
* Robust
* Simple to implement

#### Cons
* Not offered by every integration
