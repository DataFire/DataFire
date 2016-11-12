let btoa = require('btoa');
let datafire = require('datafire');
let flow = module.exports = new datafire.Flow('headlines', "Get headlines from several news sources in your inbox");

let gmail = datafire.Integration.new('gmail').as('default');

const RSS_FEEDS = ['cnn', 'nytimes', 'npr'];
const MAX_ITEMS_PER_FEED = 8;

let rssIntegrations = {};
RSS_FEEDS.forEach(f => rssIntegrations[f] = datafire.Integration.new(f))

let makeEmail = (to, from, subject, body) => {
   return `

From: <${from}>
To: <${to}>
Subject: ${subject}
Date: ${new Date().toString()}
Content-Type: text/html; charset=utf-8

<html>
  <body>
${body}
  </body>
</html>

  `.trim();
}

let encodeMessage = (message) => {
  message = new Buffer(message).toString('base64');
  return message.replace(/\//g,'_').replace(/\+/g,'-');
}

RSS_FEEDS.forEach(f => {
  flow.step(f, {
    do: rssIntegrations[f].getItems(),
  })
})

flow
  .step('user', {
    do: gmail.get('/{userId}/profile'),
    params: {userId: 'me'},
  })
  .step('send_email', {
    do: gmail.post('/{userId}/messages/send'),
    params: data => {
      let addr = data.user.emailAddress;
      let body = '';
      RSS_FEEDS.forEach(f => {
        let feed = data[f].feed;
        body += `<h1>${feed.title}</h1>`;
        let entries = feed.entries.slice(0, MAX_ITEMS_PER_FEED);
        entries.forEach(entry => {
          body += `<p><a href="${entry.link}">${entry.title}</a></p>`
        })
      })
      let msg = makeEmail(addr, addr, 'News Headlines', body);
      return {
        userId: 'me',
        body: {
          raw: encodeMessage(msg)
        }
      }
    }
  })
