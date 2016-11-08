let datafire = require('../../index');
let hn = new datafire.Integration('hacker_news');

let flow = module.exports =
      new datafire.Flow('triggerError', "Intentionally cause an error to show catch usage")

flow.step('get_story',
          hn.get('/{storyType}stories.json'),
          {storyType: 'notAnActualStoryType'})
    .catch(err => {
      if (err.statusCode === 401) {
        flow.succeed();
      } else {
        flow.fail(err);
      }
    })
    .step('never_reached',
          (data) => {
            throw new Error("You should never reach this step");
          })
