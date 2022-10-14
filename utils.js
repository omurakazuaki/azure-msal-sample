const wrap = fn => (...args) => fn(...args).catch(args[2]);

const kv = (obj, excludeKeys = []) => Object.keys(obj)
  .map(key => ({ key, value: JSON.stringify(obj[key]) }))
  .filter(e => !excludeKeys.includes(e.key));

module.exports = {
  wrap,
  kv,
};
