// index.js
const MiPhilipsSmartBulb = require("./Devices/MiPhilipsSmartBulb");
const MiPhilipsTableLamp2 = require("./Devices/MiPhilipsTableLamp2");
const MiPhilipsCeilingLamp = require("./Devices/MiPhilipsCeilingLamp");
const packageFile = require("./package.json");

module.exports = (api) => {
  // This registration is compatible with HB 1.x and 2.x
  api.registerPlatform("MiPhilipsLightPlatform", MiPhilipsLightPlatform);
};

class MiPhilipsLightPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;

    // If config is null, the plugin is likely not configured yet
    if (!config) return;

    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.info(
      `[MiPhilipsLightPlatform] Initializing v${packageFile.version} (HB 1.x/2.x & Matter Compatible)`,
    );
  }

  // Dynamic accessory registration
  accessories(callback) {
    const myAccessories = [];
    const deviceCfgs = this.config["deviceCfgs"];

    if (Array.isArray(deviceCfgs)) {
      deviceCfgs.forEach((deviceCfg) => {
        if (!deviceCfg.type || !deviceCfg.token || !deviceCfg.ip) return;

        try {
          if (deviceCfg.type === "MiPhilipsSmartBulb") {
            myAccessories.push(...new MiPhilipsSmartBulb(this, deviceCfg));
          } else if (deviceCfg.type === "MiPhilipsTableLamp2") {
            myAccessories.push(...new MiPhilipsTableLamp2(this, deviceCfg));
          } else if (deviceCfg.type === "MiPhilipsCeilingLamp") {
            myAccessories.push(...new MiPhilipsCeilingLamp(this, deviceCfg));
          }
        } catch (err) {
          this.log.error(
            `Failed to load device ${deviceCfg.type}: ${err.message}`,
          );
        }
      });
    }

    callback(myAccessories);
  }
}
