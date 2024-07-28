import St from "gi://St";
import GLib from "gi://GLib";
import Clutter from "gi://Clutter";
import Gio from "gi://Gio";

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

    Main.panel.addToStatusArea(this.uuid, this._indicator);
  }

  _updateBatteryStatus() {
    let [success, stdout, stderr] = GLib.spawn_command_line_sync(
      `curl -s http://localhost:${this.serverPort}/api/battery-state`
    );

    if (!success || stdout === null) {
      logError("Failed to fetch battery data: " + stderr);
      return;
    }

    try {
      const stdoutText = new TextDecoder("utf-8").decode(stdout);
      const data = JSON.parse(stdoutText);
      const batteryLevel = data.capacity; // Example field
      const _batteryRemainingTime = data.remaining_time; // Example field

      if (this._batteryLabel !== undefined) {
        // Update the label with the battery percentage
        this._batteryLabel.set_text(`${batteryLevel}%`);
      }
    } catch (e) {
      logError("Failed to parse battery API response: " + e);
    }

    return true;
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
