module.exports = {};

module.exports.getSchemaFromArray = function(arr) {
  let hasRequired = !!arr.filter(i => i.default === undefined).length;
  let schema = {
    type: 'object',
    properties: {}
  };
  schema.required = arr
    .filter(i => i.default === undefined)
    .map(i => i.title);
  if (!schema.required.length) {
    delete schema.required;
  }
  arr.forEach(input => {
    schema.properties[input.title] = input;
  });
  return schema;
}
