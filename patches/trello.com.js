module.exports = (spec) => {
  spec.securityDefinitions.api_key.name = 'key';
  spec.securityDefinitions.api_token = {
    type: 'apiKey',
    in: 'query',
    name: 'token',
  }
  delete spec.securityDefinitions.trello_auth;
}
