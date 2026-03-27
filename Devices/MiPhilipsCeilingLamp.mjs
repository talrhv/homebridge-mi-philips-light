// Devices/MiPhilipsCeilingLamp.mjs
import Base from "./Base.mjs";
import { Device } from "miio";

class MiPhilipsCeilingLamp extends Base {
  constructor(platform, config) {
    super();
    this.init(platform, config);
    this.device = new Device({
      address: this.config["ip"],
      token: this.config["token"],
    });
    this.accessories = {};
    if (this.config["lightName"]) {
      this.accessories["LightAccessory"] = new MiPhilipsCeilingLampLight(this);
    }
    return this.obj2array(this.accessories);
  }
}

class MiPhilipsCeilingLampLight {
  constructor(dThis) {
    this.device = dThis.device;
    this.name = dThis.config["lightName"];
    this.token = dThis.config["token"];
    this.platform = dThis.platform;
    this.updatetimere = dThis.config["updatetimer"];
    this.interval = dThis.config["interval"] || 3;

    this.Lampservice = null;
    this.timer = null;
    if (this.updatetimere) {
      this.updateTimer();
    }
  }

  getServices() {
    const Service = this.platform.Service;
    const Characteristic = this.platform.Characteristic;
    const services = [];
    const tokenSnippet = this.token.substring(this.token.length - 8);

    const infoService = new Service.AccessoryInformation();
    infoService
      .setCharacteristic(Characteristic.Manufacturer, "Philips")
      .setCharacteristic(Characteristic.Model, "Philips Ceiling Lamp")
      .setCharacteristic(Characteristic.SerialNumber, tokenSnippet);
    services.push(infoService);

    this.Lampservice = new Service.Lightbulb(this.name, "MiPhilipsCeilingLamp");

    this.Lampservice.getCharacteristic(Characteristic.On)
      .onGet(async () => {
        const res = await this.device.call("get_prop", ["power"]);
        return res[0] === "on";
      })
      .onSet(async (value) => {
        await this.device.call("set_power", [value ? "on" : "off"]);
      });

    this.Lampservice.addCharacteristic(Characteristic.Brightness)
      .onGet(async () => {
        const res = await this.device.call("get_prop", ["bright"]);
        return res[0];
      })
      .onSet(async (value) => {
        if (value > 0) await this.device.call("set_bright", [value]);
      });

    // UI Fix: Use standard Apple HomeKit Mired bounds (140-500)
    this.Lampservice.addCharacteristic(Characteristic.ColorTemperature)
      .setProps({ minValue: 140, maxValue: 500, minStep: 1 })
      .onGet(async () => {
        const res = await this.device.call("get_prop", ["cct"]);
        let cct = res[0] <= 1 ? res[0] * 100 : res[0];
        let mired = Math.round(400 - cct * 2.6);
        return Math.max(140, Math.min(500, mired));
      })
      .onSet(async (value) => {
        let cct = Math.round((400 - value) / 2.6);
        cct = Math.max(1, Math.min(100, cct));
        await this.device.call("set_cct", [cct]);
      });

    services.push(this.Lampservice);
    return services;
  }

  updateTimer() {
    if (this.updatetimere) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        if (this.Lampservice) this.runTimer();
        this.updateTimer();
      }, this.interval * 1000);
    }
  }

  async runTimer() {
    try {
      const powerRes = await this.device.call("get_prop", ["power"]);
      this.Lampservice.getCharacteristic(
        this.platform.Characteristic.On,
      ).updateValue(powerRes[0] === "on");

      const brightRes = await this.device.call("get_prop", ["bright"]);
      this.Lampservice.getCharacteristic(
        this.platform.Characteristic.Brightness,
      ).updateValue(brightRes[0]);
    } catch (err) {
      this.platform.log.debug(
        `[Background Poll Error] CeilingLamp Offline or Timed Out`,
      );
    }
  }
}

export default MiPhilipsCeilingLamp;
