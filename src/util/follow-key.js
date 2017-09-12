module.exports = function(keyString, obj) {
  if (!keyString) return obj;
  let keys = keyString.split('.');
  let value = obj;
  keys.forEach(key => {
    value = value[key];
    if (value === undefined) {
      throw new Error("Key " + keyString + " not found, missing " + key);
    }
  });
  return value;
}
