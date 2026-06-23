import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import { BaseWidget } from './base.js';

/*
  Control Widget — Medium (329×155 pt)
  macOS Control Center style 2×2 toggle grid
  ┌──────────────────────────────────────────┐
  │ ┌──────────┐  ┌──────────┐              │
  │ │ [WiFi]   │  │ [BT]     │              │
  │ │  ON      │  │  OFF     │              │
  │ └──────────┘  └──────────┘              │
  │ ┌──────────┐  ┌──────────┐              │
  │ │ [NIGHT]  │  │ [DND]    │              │
  │ │  OFF     │  │  ON      │              │
  │ └──────────┘  └──────────┘              │
  └──────────────────────────────────────────┘
*/
export class ControlWidget extends BaseWidget {
    constructor(settings, widgetManager) {
        super(settings, widgetManager, 'MEDIUM');
        this.type = 'control';

        this._toggles = {};
        this._settingsCache = new Map();

        this.actor.x_expand = true;
        this.actor.y_expand = true;

        // 2×2 toggle grid
        let grid = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
            style: 'spacing: 8px;',
        });

        let row1 = new St.BoxLayout({ x_expand: true, y_expand: true, style: 'spacing: 8px;' });
        let row2 = new St.BoxLayout({ x_expand: true, y_expand: true, style: 'spacing: 8px;' });
        grid.add_child(row1);
        grid.add_child(row2);

        let items = [
            { name: 'WiFi',      icon: 'network-wireless-symbolic',  schema: 'org.gnome.settings-daemon.plugins.wifi',  key: 'wifi-enabled' },
            { name: 'Bluetooth', icon: 'bluetooth-symbolic',         schema: 'org.gnome.bluetooth',                     key: 'enabled' },
            { name: 'Night Light', icon: 'weather-night-symbolic',   schema: 'org.gnome.settings-daemon.plugins.color', key: 'night-light-enabled' },
            { name: 'Do Not Disturb', icon: 'notifications-disabled-symbolic', schema: 'org.gnome.desktop.notifications', key: 'show-banners' },
        ];

        for (let [i, item] of items.entries()) {
            let toggle = this._createToggle(item);
            if (i < 2) row1.add_child(toggle.container);
            else row2.add_child(toggle.container);
        }

        this.actor.add_child(grid);
        this._updateToggles();
    }

    _createToggle(item) {
        let container = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            x_expand: true,
            y_expand: true,
            style_class: 'widgy-toggle',
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            reactive: true,
        });

        let icon = new St.Icon({
            icon_name: item.icon,
            style_class: 'widgy-toggle-icon',
            x_align: Clutter.ActorAlign.CENTER,
        });
        container.add_child(icon);

        let label = new St.Label({
            style_class: 'widgy-toggle-label',
            text: item.name,
            x_align: Clutter.ActorAlign.CENTER,
        });
        container.add_child(label);

        let statusLabel = new St.Label({
            style_class: 'widgy-type-caption-2',
            text: '',
            x_align: Clutter.ActorAlign.CENTER,
        });
        container.add_child(statusLabel);

        container.connect('button-press-event', () => {
            this._toggleItem(item);
            return Clutter.EVENT_STOP;
        });

        this._toggles[item.name] = { container, icon, statusLabel, item };
        return { container };
    }

    _toggleItem(item) {
        try {
            let settings = this._getSettings(item.schema);
            if (item.key === 'color-scheme') {
                let current = settings.get_string(item.key);
                settings.set_string(item.key, current === 'prefer-dark' ? 'prefer-light' : 'prefer-dark');
            } else if (item.key === 'show-banners') {
                let current = settings.get_boolean(item.key);
                settings.set_boolean(item.key, !current);
            } else {
                let current = settings.get_boolean(item.key);
                settings.set_boolean(item.key, !current);
            }
        } catch (e) {
            console.error('Widgy: Failed to toggle ' + item.name + ': ' + e);
        }
        this._updateToggles();
    }

    _getSettings(schema) {
        if (!this._settingsCache.has(schema)) {
            this._settingsCache.set(schema, new Gio.Settings({ schema }));
        }
        return this._settingsCache.get(schema);
    }

    _updateToggles() {
        for (let [name, toggle] of Object.entries(this._toggles)) {
            let { container, statusLabel, item } = toggle;
            try {
                let settings = this._getSettings(item.schema);
                let value;
                if (item.key === 'color-scheme') {
                    value = settings.get_string(item.key) === 'prefer-dark';
                } else if (item.key === 'show-banners') {
                    value = settings.get_boolean(item.key);
                } else {
                    value = settings.get_boolean(item.key);
                }

                if (value) {
                    container.add_style_class_name('active');
                    statusLabel.set_text('ON');
                    statusLabel.set_style('color: #30D158;');
                } else {
                    container.remove_style_class_name('active');
                    statusLabel.set_text('OFF');
                    statusLabel.set_style('color: rgba(235, 235, 245, 0.3);');
                }
            } catch (e) {
                container.remove_style_class_name('active');
                statusLabel.set_text('—');
                statusLabel.set_style('color: rgba(235, 235, 245, 0.3);');
            }
        }
    }

    destroy() {
        this._settingsCache.clear();
        super.destroy();
    }
}
