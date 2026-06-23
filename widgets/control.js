import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import { BaseWidget } from './base.js';

export class ControlWidget extends BaseWidget {
    constructor(settings) {
        super(settings);
        this.type = 'control';

        this.actor.orientation = Clutter.Orientation.VERTICAL;

        this._toggles = {};
        this._settingsCache = new Map();

        let row1 = new St.BoxLayout({ x_expand: true, y_expand: true, style: 'margin-bottom: 8px;' });
        let row2 = new St.BoxLayout({ x_expand: true, y_expand: true });
        this.actor.add_child(row1);
        this.actor.add_child(row2);

        let items = [
            { name: 'WiFi', icon: 'network-wireless-symbolic', setting: 'org.gnome.NetworkManager', key: 'wireless-enabled' },
            { name: 'Bluetooth', icon: 'bluetooth-symbolic', setting: 'org.gnome.bluetooth', key: 'enabled' },
            { name: 'Night Light', icon: 'weather-night-symbolic', setting: 'org.gnome.settings-daemon.plugins.color', key: 'night-light-enabled' },
            { name: 'Volume', icon: 'audio-volume-medium-symbolic', setting: 'org.gnome.desktop.sound', key: 'allow-volume-above-100' },
            { name: 'Brightness', icon: 'display-brightness-symbolic', setting: 'org.gnome.settings-daemon.plugins.power', key: 'idle-dim' }
        ];

        for (let [i, item] of items.entries()) {
            let button = new St.Button({
                style_class: 'widgy-widget-control-button',
                x_expand: true,
                y_expand: true,
                can_focus: true
            });
            let icon = new St.Icon({
                icon_name: item.icon,
                style_class: 'widgy-widget-control-icon'
            });
            button.set_child(icon);
            button.connect('clicked', () => this._toggleItem(item));
            this._toggles[item.name] = { button: button, item: item };

            if (i < 3) {
                row1.add_child(button);
            } else {
                row2.add_child(button);
            }
        }

        this._updateToggles();
    }

    _getSettings(schema) {
        if (!this._settingsCache.has(schema)) {
            this._settingsCache.set(schema, new Gio.Settings({ schema }));
        }
        return this._settingsCache.get(schema);
    }

    _toggleItem(item) {
        try {
            let settings = this._getSettings(item.setting);
            let current = settings.get_boolean(item.key);
            settings.set_boolean(item.key, !current);
        } catch (e) {
            console.error('Failed to toggle ' + item.name + ': ' + e);
        }
        this._updateToggles();
    }

    _updateToggles() {
        for (let [name, toggle] of Object.entries(this._toggles)) {
            let { button, item } = toggle;
            try {
                let settings = this._getSettings(item.setting);
                let value = settings.get_boolean(item.key);
                if (value) {
                    button.add_style_class_name('active');
                } else {
                    button.remove_style_class_name('active');
                }
            } catch (e) {
                button.remove_style_class_name('active');
            }
        }
    }
}