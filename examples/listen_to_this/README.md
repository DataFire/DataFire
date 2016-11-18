# Listen to This
Creates a Spotify playlist from the top tracks submitted to Reddit's r/listentothis

```bash
cd examples/listen_to_this
datafire integrate reddit spotify
datafire authenticate spotify --generate_token

datafire run flow.js
```
