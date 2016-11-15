module.exports = (spec) => {
  for (let path in spec.paths) {
    let op = spec.paths[path].get;
    if (op && path.endsWith('s')) {
      op.parameters.push({
        name: 'page',
        in: 'query',
        type: 'integer',
      })
    }
  }
}
