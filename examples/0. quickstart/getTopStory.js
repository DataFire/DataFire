const datafire = require('datafire');
const fs = require('fs');
const hacker_news = datafire.Integration.new('hacker_news');

const flow = module.exports =
      new datafire.Flow('Top HN Story', 'Copies the top HN story to a local file');

flow
  .step('stories', {
    do: hacker_news.getStories(),
    params: {storyType: 'top'},
  })

  .step('story_details', {
    do: hacker_news.getItem(),
    params: data => {
      return {itemID: data.stories[0]}
    }
  })

  .step('write_file', {
    do: data => {
      fs.writeFileSync('./story.json', JSON.stringify(data.story_details, null, 2));
    }
  });
