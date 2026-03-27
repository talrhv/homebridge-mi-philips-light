// Devices/MiPhilipsTableLamp2.mjs
import Base from "./Base.mjs";
import { Device } from "miio";

class MiPhilipsTableLamp2 extends Base {
  constructor(platform, config) {
    super();
    this.init(platform, config);
    this.device = new Device({
      address: this.config["ip"],
      token: this.config["token"],
    });
    this.accessories = {};
    if (this.config["mainLightName"]) {
      this.accessories["mainLightAccessory"] = new MiPhilipsTableLamp2Light(
        this,
      );
    }
    return this.obj2array(this.accessories);
  }
}

class MiPhilipsTableLamp2Light {
  constructor(dThis) {
    this.device = dThis.device;
    this.name = dThis.config["mainLightName"];
    this.secondLightDisable = dThis.config["secondLightDisable"];
    this.secondLightName =
      dThis.config["secondLightName"] || `${this.name} Ambient`;
    this.eyecareSwitchDisable = dThis.config["eyecareSwitchDisable"];
    this.eyecareSwitchName =
      dThis.config["eyecareSwitchName"] || `${this.name} Eyecare`;
    this.platform = dThis.platform;
  }

  getServices() {
    const Service = this.platform.Service;
    const Characteristic = this.platform.Characteristic;
    const services = [];

    const infoService = new Service.AccessoryInformation();
    infoService
      .setCharacteristic(Characteristic.Manufacturer, "XiaoMi")
      .setCharacteristic(Characteristic.Model, "Philips Table Lamp 2")
      .setCharacteristic(Characteristic.SerialNumber, "Matter-Ready");
    services.push(infoService);

    const mainLightService = new Service.Lightbulb(this.name, "mainLight");
    this.mainLightOnCharacteristic = mainLightService.getCharacteristic(
      Characteristic.On,
    );

    const secondLightService = new Service.Lightbulb(
      this.secondLightName,
      "secondLight",
    );
    this.secondLightOnCharacteristic = secondLightService.getCharacteristic(
      Characteristic.On,
    );

    const eyecareSwitchService = new Service.Switch(
      this.eyecareSwitchName,
      "eyecareSwitch",
    );
    this.eyecareSwitchOnCharacteristic = eyecareSwitchService.getCharacteristic(
      Characteristic.On,
    );

    // Main Light
    this.mainLightOnCharacteristic
      .onGet(async () => {
        try {
          const res = await this.device.call("get_prop", ["power"]);
          return res[0] === "on";
        } catch (err) {
          throw new this.platform.api.hap.HapStatusError(
            this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
          );
        }
      })
      .onSet(async (value) => {
        try {
          await this.device.call("set_power", [value ? "on" : "off"]);
          if (!value) {
            this.secondLightOnCharacteristic.updateValue(false);
            this.eyecareSwitchOnCharacteristic.updateValue(false);
          }
        } catch (err) {
          throw new this.platform.api.hap.HapStatusError(
            this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
          );
        }
      });

    mainLightService
      .addCharacteristic(Characteristic.Brightness)
      .onGet(async () => {
        try {
          const res = await this.device.call("get_prop", ["bright"]);
          return res[0];
        } catch (err) {
          throw new this.platform.api.hap.HapStatusError(
            this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
          );
        }
      })
      .onSet(async (value) => {
        if (value === 0) return;
        try {
          await this.device.call("set_bright", [value]);
        } catch (err) {
          throw new this.platform.api.hap.HapStatusError(
            this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
          );
        }
      });

    services.push(mainLightService);

    // Second Light
    if (!this.secondLightDisable) {
      this.secondLightOnCharacteristic
        .onGet(async () => {
          try {
            const res = await this.device.call("get_prop", ["ambstatus"]);
            return res[0] === "on" && this.mainLightOnCharacteristic.value;
          } catch (err) {
            throw new this.platform.api.hap.HapStatusError(
              this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
            );
          }
        })
        .onSet(async (value) => {
          try {
            await this.device.call("enable_amb", [value ? "on" : "off"]);
          } catch (err) {
            throw new this.platform.api.hap.HapStatusError(
              this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
            );
          }
        });

      secondLightService
        .addCharacteristic(Characteristic.Brightness)
        .onGet(async () => {
          try {
            const res = await this.device.call("get_prop", ["ambvalue"]);
            return res[0];
          } catch (err) {
            throw new this.platform.api.hap.HapStatusError(
              this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
            );
          }
        })
        .onSet(async (value) => {
          if (value === 0) return;
          try {
            await this.device.call("set_amb_bright", [value]);
          } catch (err) {
            throw new this.platform.api.hap.HapStatusError(
              this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
            );
          }
        });

      services.push(secondLightService);
    }

    // Eyecare Switch
    if (!this.eyecareSwitchDisable) {
      this.eyecareSwitchOnCharacteristic
        .onGet(async () => {
          try {
            const res = await this.device.call("get_prop", ["eyecare"]);
            return res[0] === "on" && this.mainLightOnCharacteristic.value;
          } catch (err) {
            throw new this.platform.api.hap.HapStatusError(
              this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
            );
          }
        })
        .onSet(async (value) => {
          try {
            await this.device.call("set_eyecare", [value ? "on" : "off"]);
          } catch (err) {
            throw new this.platform.api.hap.HapStatusError(
              this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
            );
          }
        });
      services.push(eyecareSwitchService);
    }

    return services;
  }
}
export default MiPhilipsTableLamp2;
