# Authentication

You can create a bearer token for GitHub here:
[https://github.com/settings/tokens](https://github.com/settings/tokens)


```
cd examples/1.\ authentication
datafire integrate github
datafire authenticate github # you only need a bearer token
datafire run getUser.js
```
