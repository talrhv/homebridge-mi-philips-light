// Devices/MiPhilipsCeilingLamp.js
const Base = require("../Base");
const miio = require("miio");

class MiPhilipsCeilingLamp extends Base {
  constructor(platform, config) {
    super();
    this.init(platform, config);
    this.device = new miio.Device({
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
      .onGet(async () => (await this.device.call("get_prop", ["bright"]))[0])
      .onSet(async (value) => {
        if (value > 0) await this.device.call("set_bright", [value]);
      });

    this.Lampservice.addCharacteristic(Characteristic.ColorTemperature)
      .setProps({ minValue: 50, maxValue: 400, minStep: 1 })
      .onGet(async () => {
        const res = await this.device.call("get_prop", ["cct"]);
        return res[0] < 1 ? 400 - res[0] * 350 : 400 - res[0] * 3.5;
      })
      .onSet(async (value) => {
        let mappedValue = Math.round(100 - ((value - 50) / 350) * 100);
        if (mappedValue === 0) mappedValue = 1;
        await this.device.call("set_cct", [mappedValue]);
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
module.exports = MiPhilipsCeilingLamp;
