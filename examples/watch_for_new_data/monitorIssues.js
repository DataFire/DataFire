const fs = require('fs');
const datafire = require('../../index');

const github = datafire.Integration.new('github');
const zoomconnect = datafire.Integration.new('zoomconnect');
const flow = module.exports = new datafire.Flow('Monitor GitHub Issues', "Sends an SMS when new issues are found");

flow.setDefaults({
  owner: 'bobby-brennan',
  repo: 'rss-parser',
  phoneNumber: '+15555555555',
})

flow.step('issues', {
  do: github.get('/repos/{owner}/{repo}/issues'),
  params: data => {
    return {owner: 'bobby-brennan', repo: 'homedir'}
  },
  finish: data => {
    const seen = require('./issues_seen.json');
    data.issues = data.issues.filter(i => seen.indexOf(i.number) === -1);
    if (!data.issues.length) flow.succeed();
  }
});

flow.step('send_sms', {
  do: zoomconnect.post("/api/rest/v1/sms/send"),
  params: data => {
    return {
      body: {
        message: data.issues.length + " new issues in " + flow.params.owner + '/' + flow.params.repo,
        recipientNumber: flow.params.phoneNumber,
      }
    }
  }
})
