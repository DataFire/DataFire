# Flows

> Using NodeJS v7 or above? You can use
> [async/await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)
> instead of Flows.

Flows allow you to create complex actions that make a series of calls to different
APIs and services. They keep track of results at each step so you can reference them
at any step in the flow.

The flow will keep track of results at each step in `context.results`. It will use
the name you give the parameter for the next step in your flow.

For example, here's a Flow that sends the top Hacker News stories to your e-mail:

```js
var datafire = require('datafire');
var fs = require('fs');
var hackerNews = require('@datafire/hacker_news').create();
var gmail = require('@datafire/google_gmail').create({
  access_token: process.env.GMAIL_TOKEN,
});

module.exports = new datafire.Action({
  title: "Top HN Story",
  description: "Copies the top HN story to a local file",
  handler: (input, context) => {
    return datafire.flow(context)
      .then(_ => hackerNews.getStories({storyType: 'top'}))
      .then(stories => {
        return Promise.all(stories.map(itemID => {
          return hackerNews.getItem({itemID})
        }));
      })
      .then(storyDetails => {
        let message = '<h1>Found ' + context.results.stories.length + ' stories</h1>';
        message += storyDetails.map(story => {
          return `<a href="${story.link}">${story.title}</a>`
        }).join('\n');
        return message;
      })
      .then(message => gmail.users.getProfile({
        userId: 'me',
      })
      .then(user => {
        return gmail.sendMessage({
          to: user.email,
          from: user.email,
          subject: "Latest Hacker News Stories",
          message: context.results.message,
        }, context);
      })
  }
})
```
