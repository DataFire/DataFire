let datafire = require('../../index');
let hn = datafire.Integration.new('hacker_news');

let flow = module.exports =
      new datafire.Flow('Trigger Error', "Intentionally cause an error to show catch usage")

flow
  .step('get_story', {
    do: hn.get('/{storyType}stories.json'),
    params: {storyType: 'notAnActualStoryType'}
  })
  .catch(err => {
    if (err.statusCode === 401) {
      flow.succeed();
    } else {
      flow.fail(err);
    }
  })
  .step('never_reached', {
    do: data => {
      throw new Error("You should never reach this step");
    }
  });
