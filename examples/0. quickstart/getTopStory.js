const datafire = require('datafire');
const fs = require('fs');
const hackerNews = datafire.Integration.new('hacker-news');

const flow = module.exports =
      new datafire.Flow('Top HN Story', 'Copies the top HN story to a local file');

flow
  .step('stories', {
    do: hackerNews.getStories(),
    params: {storyType: 'top'},
  })

  .step('story_details', {
    do: hackerNews.getItem(),
    params: data => {
      return {itemID: data.stories[0]}
    }
  })

  .step('write_file', {
    do: data => {
      fs.writeFileSync('./story.json', JSON.stringify(data.story_details, null, 2));
    }
  });
