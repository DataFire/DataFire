module.exports = spec => {
  spec.securityDefinitions.oauth_2_0.name = 'token';
  for (let path in spec.paths) {
    let op = spec.paths[path].get;
    op.operationId = path.substring(1).replace(/\.(\w)/, (match, w) => w.toUpperCase());
  }
}
