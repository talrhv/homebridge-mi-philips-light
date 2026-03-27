// Base.js
class Base {
  constructor() {
    this.platform = null;
    this.config = null;
  }

  init(platform, config) {
    this.platform = platform;
    this.config = config;
  }

  obj2array(obj) {
    return Object.values(obj);
  }
}

module.exports = Base;
