# Sync GitHub Issues to Trello

You'll need to authorize Trello by running
```
datafire authenticate trello
```

You can find your `key` here:
https://trello.com/app-key

You'll also need to generate a `token`. The page above
contains a link for doing so, just below your `key`.

Once you're done authorizing, you can run:
```
datafire run flow.js -p.username torvalds -p.repo linux -p.board "Linux Issues"
```

replacing `p.repo`, `p.username`, and `p.board` with the repository and
Trello board you want to sync.
