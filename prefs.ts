import Gtk from "gi://Gtk";
import Adw from "gi://Adw";
import Gio from "gi://Gio";
import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class GnomeRectanglePreferences extends ExtensionPreferences {
  _settings?: Gio.Settings;

  fillPreferencesWindow(window: Adw.PreferencesWindow) {
    this._settings = this.getSettings("org.gnome.shell.extensions.oguard");

    const page = new Adw.PreferencesPage({
      title: _("General"),
      iconName: "dialog-information-symbolic",
    });

    const serverGroup = new Adw.PreferencesGroup({
      title: _("Server Settings"),
      description: _("Configure server related settings"),
    });
    page.add(serverGroup);

    const serverPort = new Adw.SpinRow({
      title: _("Server Port"),
      subtitle: _("Port the OGuard server is running on"),
      adjustment: new Gtk.Adjustment({
        lower: 1,
        upper: 65535,
        stepIncrement: 1,
      }),
    });
    serverGroup.add(serverPort);

    window.add(page);

    this._settings!.bind(
      "server-port",
      serverPort,
      "value",
      Gio.SettingsBindFlags.DEFAULT
    );
  }
}
