const path = require('path');

const locations = module.exports = {}

locations.integrations = [
  path.join(process.cwd(), 'integrations'),
  path.join(process.cwd(), 'node_modules', '@datafire'),
]

locations.credentials = [
  path.join(process.cwd(), 'credentials'),
]
