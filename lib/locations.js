const path = require('path');

const locations = module.exports = {}
locations.integrations = [
  path.join(process.cwd(), 'integrations'),
  '@datafire',
]

locations.credentials = [
  path.join(process.cwd(), 'credentials'),
]
