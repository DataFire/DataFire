module.exports = (spec) => {
  let curDef = Object.keys(spec.securityDefinitions)
        .map(k => spec.securityDefinitions[k])
        .filter(d => d.type === 'oauth2')[0];
  if (!curDef) return;
  spec.securityDefinitions.offline = {
    type: 'oauth2',
    flow: 'accessCode',
    scopes: curDef.scopes,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/auth',
    tokenUrl: 'https://www.googleapis.com/oauth2/v4/token',
    description: "Allows offline access using a refresh_token",
  }
}
