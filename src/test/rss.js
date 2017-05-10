"use strict";
let expect = require('chai').expect;
let datafire = require('../entry');

const PORT = 3333;

const RSS_BODY = `
<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0">
  <channel>
    <title>ACME RSS</title>
    <link>http://www.acme.com</link>
    <item>
      <link>https://acme.com/link</link>
      <description>An article</description>
    </item>
  </channel>
</rss>

`

let project = new datafire.Project({
  paths: {
    '/rss': {
      get: {
        action: {
          handler: input => {
            return new datafire.Response({
              headers: {
                'Content-Type': 'application/rss+xml',
              },
              statusCode: 200,
              body: RSS_BODY,
            });
          }
        }
      }
    }
  },
  openapi: {
    host: 'localhost:' + PORT,
    schemes: ['http'],
    info: {
      'x-datafire': {type: 'rss'},
    }
  }
})

describe('RSS', () => {
  before(() => {
    return project.serve(PORT)
  })
  after(() => {
    project.server.close();
  })
  it('should return a JS object', () => {
    return project.integration.actions.rss.get()
      .then(feed => {
        expect(feed.feed).to.be.an('object');
        expect(feed.feed.entries.length).to.equal(1);
      })
  })
})
