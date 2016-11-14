const fs = require('fs');
const datafire = require('../../index');
const github = datafire.Integration.new('github');
const flow = module.exports = new datafire.Flow('Monitor GitHub Issues', "Checks for new GitHub issues and copies them to disk");

flow.setDefaults({
  owner: 'bobby-brennan',
  repo: 'rss-parser',
})

flow.step('issues', {
  do: github.get('/repos/{owner}/{repo}/issues'),
  params: data => {
    return {owner: 'bobby-brennan', repo: 'homedir'}
  },
  finish: data => {
    data.issues = data.issues.filter(i => !fs.existsSync(i.number + '.json'));
    if (!data.issues.length) flow.succeed();
  }
});

flow.step('write_new_issues', {
  do: data => {
    data.issues.forEach(i => {
      fs.writeFileSync(i.number + '.json', JSON.stringify(i, null, 2));
    })
  }
})
