let app = module.exports = require('express')();

app.get('/succeed', (req, res) => {
  res.json("OK");
})

app.get('/secret', (req, res) => {
  if (req.query.api_secret !== 'secretsauce') {
    return res.status(401).send("Incorrect api_secret");
  }
  res.json("OK");
})
