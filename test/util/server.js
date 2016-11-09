let app = module.exports = require('express')();

app.get('/succeed', (req, res) => {
  res.json("OK");
})

