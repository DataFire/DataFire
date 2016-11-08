module.exports = (args) => {
  let integration = new datafire.Integration(args.integration);
  integration.initialize(err => {
    if (err) throw err;
    let sec = integration.spec.securityDefinitions;
  })
}
