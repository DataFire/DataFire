let app = module.exports = require('express')();

app.get('/succeed', (req, res) => {
  res.json("OK");
})

let authorize = (req, res, next) => {
  if (req.headers.authorization) {
    let key = req.headers.authorization.split(' ')[1];
    let str = new Buffer(key, 'base64').toString();
    let creds = str.split(':');
    if (creds[0] === 'user1' && creds[1] === 'secretsauce') {
      return next();
    }
  } else if (req.query.api_secret && req.query.api_secret === 'secretsauce') {
    return next();
  }
  res.status(401).send("Unauthorized");
}

app.get('/secret', authorize, (req, res) => {
  res.json("OK");
})

app.get('/page', (req, res) => {
  let page = +req.query.page;
  if (page === 1) {
    return res.json(['A', 'B', 'C'])
  } else if (page === 2) {
    return res.json(['D', 'E', 'F']);
  } else {
    return res.json([]);
  }
})
