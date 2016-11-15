const datafire = require('datafire');
const flow = module.exports = new datafire.Flow("Create a Spotify playlist from r/listenToThis", "Create a new playlist every day using suggestions from Reddit");
const spotify = datafire.Integration.new('spotify').as('guitpicker07');
const reddit = datafire.Integration.new('reddit');

flow.step('spotify', {
  do: spotify.get("/me"),
  params: (data) => {
    return {}
  }
})

flow.step('reddit', {
  do: reddit.get("/r/{subreddit}/.rss"),
  params: () => {
    return {subreddit: 'listentothis'}
  }
})

flow.step('spotify1', {
  do: spotify.get("/search"),
  params: (data) => {
    var tracks = data.reddit.feed.entries.slice(0, 10);
    return tracks.map(function(entry) {
        return {
          type: "track",
          q: entry.title.replace(/\[.*\]/g, '').replace(/\(.*\)/g, ''),
        }
    })
  }
})

flow.step('spotify2', {
  do: spotify.post("/users/{user_id}/playlists"),
  params: (data) => {
    return {
      user_id: data.spotify.id,
      body: {
        name: "r/listentothis for " + new Date().toISOString().slice(0,10),
      }
    }
  }
})

flow.step('spotify3', {
  do: spotify.post("/users/{user_id}/playlists/{playlist_id}/tracks"),
  params: (data) => {
    return {
      user_id: data.spotify.id,
      playlist_id: data.spotify2.id,
      uris: data.spotify1.filter(function(searchResults) {
        return searchResults.tracks.items.length;
      }).map(function(searchResults) {
        return searchResults.tracks.items[0].uri;
      })
      .join(',')
    }
  }
})