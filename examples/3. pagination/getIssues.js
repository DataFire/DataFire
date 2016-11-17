const fs = require('fs');
const path = require('path');
const datafire = require('datafire');

const ISSUE_FILE = path.join(__dirname, 'issues_seen.json')
if (!fs.existsSync(ISSUE_FILE)) fs.writeFileSync(ISSUE_FILE, '[]');

const github = datafire.Integration.new('github');
const zoomconnect = datafire.Integration.new('zoomconnect');
const flow = module.exports = new datafire.Flow('GitHub Issues', "Retrieve all pages of GitHub issues from a repository");

flow.setDefaults({
  owner: 'git',
  repo: 'git',
})

flow.step('issues', {
  do: github.get('/repos/{owner}/{repo}/issues'),
  params: data => {
    return {
      owner: flow.params.owner,
      repo: flow.params.repo,
      state: 'all',
      page: 1,
    }
  },
  nextPage: (data, params) => {
    params.page++;
    return params;
  },
  finish: data => {
    fs.writeFileSync('./issues.json', JSON.stringify(data.issues, null, 2))
  }
});

