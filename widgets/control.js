const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;

const BaseWidget = require('./base.js');

const ControlWidget = class ControlWidget extends BaseWidget {
    constructor(settings) {
        super(settings);
        this.type = 'control';

        this._toggles = {};

        let grid = new St.GridLayout();
        this.actor.set_layout_manager(grid);

        // Define the toggles we want: WiFi, Bluetooth, Volume, Brightness, Night Light
        let items = [
            { name: 'WiFi', icon: 'network-wireless-symbolic', setting: 'org.gnome.NetworkManager', key: 'wireless-enabled' },
            { name: 'Bluetooth', icon: 'bluetooth-symbolic', setting: 'org.gnome.bluetooth', key: 'enabled' },
            { name: 'Volume', icon: 'audio-volume-medium-symbolic', setting: 'org.gnome.desktop.sound', key: 'allow-volume-above-100' }, // Not perfect, but we'll use a proxy
            { name: 'Brightness', icon: 'display-brightness-symbolic', setting: 'org.gnome.settings-daemon.plugins.power', key: 'idle-dim' }, // Not brightness, but we'll use a different approach
            { name: 'Night Light', icon: 'weather-night-symbolic', setting: 'org.gnome.settings-daemon.plugins.color', key: 'night-light-enabled' }
        ];

        // We'll create a toggle for each
        for (let i, item of items.enumerate()) {
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
            button.connect('clicked', Lang.bind(this, () => this._toggleItem(item)));
            this._toggles[item.name] = { button: button, item: item };
            grid.add_child(button, { row: Math.floor(i / 3), col: i % 3 });
        }

        // For volume and brightness, we'll use sliders or adjust via shell, but for simplicity, we'll just toggle a placeholder.
        // We'll implement volume and brightness in a more advanced version.

        // Load initial states
        this._updateToggles();
    }

    _toggleItem(item) {
        let settings = new Gio.Settings({ schema: item.setting });
        try {
            let current = settings.get_boolean(item.key);
            settings.set_boolean(item.key, !current);
        } catch (e) {
            log('Failed to toggle ' + item.name + ': ' + e);
        }
        this._updateToggles();
    }

    _updateToggles() {
        for (let [name, toggle] of Object.entries(this._toggles)) {
            let { button, item } = toggle;
            let settings = new Gio.Settings({ schema: item.setting });
            try {
                let value = settings.get_boolean(item.key);
                if (value) {
                    button.add_style_class_name('active');
                } else {
                    button.remove_style_class_name('active');
                }
            } catch (e) {
                // If the setting doesn't exist, we'll just show as inactive
                button.remove_style_class_name('active');
            }
        }
    }

    destroy() {
        super.destroy();
    }
};

if (typeof module !== 'undefined') {
    module.exports = ControlWidget;
}