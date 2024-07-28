import St from "gi://St";
import GLib from "gi://GLib";
import Clutter from "gi://Clutter";
import Gio from "gi://Gio";
import Soup from "gi://Soup?version=3.0";

import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";

import * as Main from "resource:///org/gnome/shell/ui/main.js";

export default class OGuardIndicatorExtension extends Extension {
  _batteryIcon?: St.Icon;
  _batteryLabel?: St.Label;
  _box?: St.BoxLayout;
  _updateInterval?: GLib.Source;
  _indicator?: PanelMenu.Button;
  gsettings?: Gio.Settings;
  serverPort: number = 5439;

  _session?: Soup.Session;

  enable(): void {
    this.gsettings = this.getSettings("org.gnome.shell.extensions.oguard");

    // Determine HTTP server port
    this.serverPort =
      this.gsettings!.get_value("server-port").deepUnpack() ?? 5439;

    this._indicator = new PanelMenu.Button(0.0, _("OGuard Battery Indicator"));

    // Battery icon
    this._batteryIcon = new St.Icon({
      icon_name: "battery-full-symbolic",
      style_class: "system-status-icon",
    });

    // Battery percent label
    this._batteryLabel = new St.Label({
      text: "", // Default value
      y_align: Clutter.ActorAlign.CENTER,
      style_class: "battery-percentage",
    });

    this._box = new St.BoxLayout({ vertical: false, reactive: true });
    this._box.add_child(this._batteryIcon);
    this._box.add_child(this._batteryLabel);

    this._indicator.add_child(this._box);

    // Poll battery status updates every second
    this._updateInterval = setInterval(
      this._updateBatteryStatus.bind(this),
      1000
    );
    this._updateBatteryStatus();

    this._session = new Soup.Session();

    Main.panel.addToStatusArea(this.uuid, this._indicator);
  }

  _updateBatteryStatus() {
    if (this._session === undefined) return;

    let msg = Soup.Message.new(
      "GET",
      `http://localhost:${this.serverPort}/api/battery-state`
    );

    this._session.send_and_read_async(
      msg,
      GLib.PRIORITY_DEFAULT,
      null,
      (source, result) => {
        try {
          if (source === null) return;
          const bytes = source.send_and_read_finish(result);
          const dataArray = bytes.get_data();
          if (dataArray === null) return;

          const responseJSON = new TextDecoder().decode(dataArray);
          const response = JSON.parse(responseJSON);
          const batteryLevel = response.capacity; // Example field
          const _batteryRemainingTime = response.remaining_time; // Example field
          if (this._batteryLabel !== undefined) {
            // Update the label with the battery percentage
            this._batteryLabel.set_text(`${batteryLevel}%`);
          }
        } catch (e) {
          logError("Failed to parse battery API response: " + e);
        }
      }
    );
  }

  disable() {
    this.gsettings = undefined;
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
      this._updateInterval = undefined;
    }

    if (this._box) {
      this._box.destroy();
      this._box = undefined;
    }

    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = undefined;
    }
  }
}
