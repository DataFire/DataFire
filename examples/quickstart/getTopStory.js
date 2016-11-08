const datafire = require('../../index');
const fs = require('fs');
const hn = new datafire.Integration('hacker_news');

const flow = module.exports =
      new datafire.Flow('copyStory', 'Copies the top HN story to a local file');

flow.step('stories',
          hn.get('/{storyType}stories.json'),
          {storyType: 'top'})

    .step('story_details',
          hn.get('/item/{itemID}.json'),
          data => {
            return {itemID: data.stories[0]}
          })

    .step('write_file',
          data => {
            fs.writeFileSync('./story.json', JSON.stringify(data.story_details, null, 2));
          })
