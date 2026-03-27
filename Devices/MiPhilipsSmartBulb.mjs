// Devices/MiPhilipsSmartBulb.mjs
import Base from "./Base.mjs";
import { Device } from "miio";

class MiPhilipsSmartBulb extends Base {
  constructor(platform, config) {
    super();
    this.init(platform, config);

    this.device = new Device({
      address: this.config["ip"],
      token: this.config["token"],
    });

    this.accessories = {};
    if (!this.config["lightDisable"] && this.config["lightName"]) {
      this.accessories["lightAccessory"] = new MiPhilipsSmartBulbLight(this);
    }

    const accessoriesArr = this.obj2array(this.accessories);
    this.platform.log.debug(
      `[MiPhilipsLightPlatform][DEBUG] Initializing ${this.config["type"]} device: ${this.config["ip"]}`,
    );
    return accessoriesArr;
  }
}

class MiPhilipsSmartBulbLight {
  constructor(dThis) {
    this.device = dThis.device;
    this.name = dThis.config["lightName"];
    this.platform = dThis.platform;
  }

  getServices() {
    const Service = this.platform.Service;
    const Characteristic = this.platform.Characteristic;
    const services = [];

    const infoService = new Service.AccessoryInformation();
    infoService
      .setCharacteristic(Characteristic.Manufacturer, "XiaoMi")
      .setCharacteristic(Characteristic.Model, "Philips Smart Bulb")
      .setCharacteristic(Characteristic.SerialNumber, "Matter-Ready");
    services.push(infoService);

    const lightService = new Service.Lightbulb(this.name);

    lightService
      .getCharacteristic(Characteristic.On)
      .onGet(this.getPower.bind(this))
      .onSet(this.setPower.bind(this));

    lightService
      .addCharacteristic(Characteristic.Brightness)
      .onGet(this.getBrightness.bind(this))
      .onSet(this.setBrightness.bind(this));

    // UI Fix: Use standard Apple HomeKit Mired bounds (140-500)
    lightService
      .addCharacteristic(Characteristic.ColorTemperature)
      .setProps({ minValue: 140, maxValue: 500, minStep: 1 })
      .onGet(this.getColorTemperature.bind(this))
      .onSet(this.setColorTemperature.bind(this));

    services.push(lightService);
    return services;
  }

  async getPower() {
    try {
      const result = await this.device.call("get_prop", ["power"]);
      return result[0] === "on";
    } catch (err) {
      this.platform.log.error(`[Error] SmartBulb getPower: ${err}`);
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }
  }

  async setPower(value) {
    try {
      const result = await this.device.call("set_power", [
        value ? "on" : "off",
      ]);
      if (result[0] !== "ok") throw new Error(result[0]);
    } catch (err) {
      this.platform.log.error(`[Error] SmartBulb setPower: ${err}`);
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }
  }

  async getBrightness() {
    try {
      const result = await this.device.call("get_prop", ["bright"]);
      return result[0];
    } catch (err) {
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }
  }

  async setBrightness(value) {
    if (value === 0) return;
    try {
      const result = await this.device.call("set_bright", [value]);
      if (result[0] !== "ok") throw new Error(result[0]);
    } catch (err) {
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }
  }

  async getColorTemperature() {
    try {
      const result = await this.device.call("get_prop", ["cct"]);
      // Normalize to 1-100 scale (some firmware returns 0.01-1.00)
      let cct = result[0] <= 1 ? result[0] * 100 : result[0];

      // Map Xiaomi's 1-100 to Apple's 140-500 Mireds safely
      let mired = Math.round(400 - cct * 2.6);
      return Math.max(140, Math.min(500, mired));
    } catch (err) {
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }
  }

  async setColorTemperature(value) {
    // Map Apple's 140-500 Mireds back to Xiaomi's 1-100 scale
    let cct = Math.round((400 - value) / 2.6);
    cct = Math.max(1, Math.min(100, cct));

    try {
      const result = await this.device.call("set_cct", [cct]);
      if (result[0] !== "ok") throw new Error(result[0]);
    } catch (err) {
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }
  }
}

export default MiPhilipsSmartBulb;
