const datafire = require('../../index');
const fs = require('fs');
const github = new datafire.Integration('github').as('default');

const flow = module.exports =
      new datafire.Flow('getUser', 'Copies the logged in user to a local file');

flow.step('user', github.get('/user'))
    .step('write_file',
          data => {
            fs.writeFileSync('./user.json', JSON.stringify(data.user, null, 2));
          })
