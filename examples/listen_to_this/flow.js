const datafire = require('datafire');
const flow = module.exports = new datafire.Flow("Create a Spotify playlist from r/listenToThis", "Create a new playlist every day using suggestions from Reddit");
const spotify = datafire.Integration.new('spotify').as('default');
const reddit = datafire.Integration.new('reddit');

flow.step('spotify_user', {
  do: spotify.get("/me"),
  params: (data) => {
    return {}
  }
})

flow.step('reddit', {
  do: reddit.subreddit(),
  params: () => {
    return {subreddit: 'listentothis'}
  }
})

flow.step('tracks', {
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

flow.step('add_playlist', {
  do: spotify.post("/users/{user_id}/playlists"),
  params: (data) => {
    return {
      user_id: data.spotify_user.id,
      body: {
        name: "r/listentothis for " + new Date().toISOString().slice(0,10),
      }
    }
  }
})

flow.step('add_tracks', {
  do: spotify.post("/users/{user_id}/playlists/{playlist_id}/tracks"),
  params: (data) => {
    return {
      user_id: data.spotify_user.id,
      playlist_id: data.add_playlist.id,
      uris: data.tracks.filter(function(searchResults) {
        return searchResults.tracks.items.length;
      }).map(function(searchResults) {
        return searchResults.tracks.items[0].uri;
      })
      .join(',')
    }
  }
})
