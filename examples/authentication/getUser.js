const datafire = require('../../index');
const fs = require('fs');
const github = datafire.Integration.new('github').as('default');

const flow = module.exports =
      new datafire.Flow('getUser', 'Copies the logged in user to a local file');

flow.step('user', {
  do: github.get('/user'),
  finish: data => {
    fs.writeFileSync('./user.json', JSON.stringify(data.user, null, 2));
  }
})
