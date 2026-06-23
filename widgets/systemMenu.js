import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Util from 'resource:///org/gnome/shell/misc/util.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

/*
  System Menu — macOS Control Center style panel integration
  Provides: Control Center toggles, Music player, Notifications, Settings
*/
export class WidgySystemMenu extends PanelMenu.Button {
    constructor(settings) {
        super(0.0, 'Widgy', false);
        this._settings = settings;

        this._buildIndicator();
        this._buildMenu();

        this._controlButtons = {};
        this._mprisProxy = null;
        this._mprisBusName = null;
        this._mprisPropsChangedId = 0;
        this._dbusOwnerChangedId = 0;
        this._dbusProxy = null;

        this._initDBus();
        this._updateControlStates();
    }

    _buildIndicator() {
        this._icon = new St.Icon({
            icon_name: 'view-grid-symbolic',
            style_class: 'system-status-icon',
        });
        this.add_child(this._icon);
    }

    _buildMenu() {
        this._buildControlSection();
        this._addSeparator();
        this._buildMusicSection();
        this._addSeparator();
        this._buildNotificationSection();
        this._addSeparator();
        this._buildSettingsSection();
    }

    _addSeparator() {
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }

    /* ═══ CONTROL CENTER ═══════════════════════════════════════ */

    _buildControlSection() {
        let headerItem = new PopupMenu.PopupMenuItem(_('Control Center'), { reactive: false });
        headerItem.label.style_class = 'widgy-menu-header';
        this.menu.addMenuItem(headerItem);

        let toggles = [
            { name: 'Wi-Fi',        icon: 'network-wireless-symbolic', schema: 'org.gnome.settings-daemon.plugins.wifi',  key: 'wifi-enabled' },
            { name: 'Bluetooth',    icon: 'bluetooth-symbolic',        schema: 'org.gnome.bluetooth',                     key: 'enabled' },
            { name: 'Night Light',  icon: 'weather-night-symbolic',    schema: 'org.gnome.settings-daemon.plugins.color', key: 'night-light-enabled' },
            { name: 'Focus',        icon: 'notifications-disabled-symbolic', schema: 'org.gnome.desktop.notifications', key: 'show-banners', invert: true },
            { name: 'Dark Mode',    icon: 'weather-clear-night-symbolic',   schema: 'org.gnome.desktop.interface',     key: 'color-scheme', isString: true },
        ];

        for (let toggle of toggles) {
            let item = new PopupMenu.PopupMenuItem('', { reactive: true });
            let box = new St.BoxLayout({ x_expand: true, y_align: Clutter.ActorAlign.CENTER, style: 'spacing: 8px;' });

            let icon = new St.Icon({ icon_name: toggle.icon, style_class: 'popup-menu-icon', style: 'icon-size: 16px;' });
            let label = new St.Label({ text: toggle.name, x_expand: true, y_align: Clutter.ActorAlign.CENTER, style: 'font-size: 13px; font-weight: 500;' });
            let statusDot = new St.Widget({
                style: 'background-color: #30D158; border-radius: 50%; min-width: 8px; min-height: 8px;',
                y_align: Clutter.ActorAlign.CENTER,
            });
            let statusLabel = new St.Label({
                text: '',
                style: 'font-size: 11px; color: rgba(235, 235, 245, 0.6); min-width: 24px; text-align: right;',
                y_align: Clutter.ActorAlign.CENTER,
            });

            box.add_child(icon);
            box.add_child(label);
            box.add_child(statusDot);
            box.add_child(statusLabel);
            item.actor.add_child(box);

            this._controlButtons[toggle.name] = { item, statusDot, statusLabel, toggle };
            item.connect('activate', () => this._toggleControl(toggle));
            this.menu.addMenuItem(item);
        }
    }

    _toggleControl(toggle) {
        try {
            let settings = new Gio.Settings({ schema: toggle.schema });
            if (toggle.isString) {
                let current = settings.get_string(toggle.key);
                settings.set_string(toggle.key, current === 'prefer-dark' ? 'prefer-light' : 'prefer-dark');
            } else if (toggle.invert) {
                // DND: show-banners=false means DND=ON
                let current = settings.get_boolean(toggle.key);
                settings.set_boolean(toggle.key, !current);
            } else {
                let current = settings.get_boolean(toggle.key);
                settings.set_boolean(toggle.key, !current);
            }
        } catch (e) {
            console.error(`Widgy: Failed to toggle ${toggle.name}: ${e}`);
        }
        this._updateControlStates();
    }

    _updateControlStates() {
        let toggles = [
            { name: 'Wi-Fi',        schema: 'org.gnome.settings-daemon.plugins.wifi',  key: 'wifi-enabled' },
            { name: 'Bluetooth',    schema: 'org.gnome.bluetooth',                     key: 'enabled' },
            { name: 'Night Light',  schema: 'org.gnome.settings-daemon.plugins.color', key: 'night-light-enabled' },
            { name: 'Focus',        schema: 'org.gnome.desktop.notifications',          key: 'show-banners', invert: true },
            { name: 'Dark Mode',    schema: 'org.gnome.desktop.interface',              key: 'color-scheme', isString: true },
        ];

        for (let toggle of toggles) {
            let btn = this._controlButtons[toggle.name];
            if (!btn) continue;
            try {
                let settings = new Gio.Settings({ schema: toggle.schema });
                let isActive;
                if (toggle.isString) {
                    isActive = settings.get_string(toggle.key) === 'prefer-dark';
                } else if (toggle.invert) {
                    isActive = !settings.get_boolean(toggle.key);
                } else {
                    isActive = settings.get_boolean(toggle.key);
                }

                btn.statusDot.set_style(
                    isActive
                        ? 'background-color: #30D158; border-radius: 50%; min-width: 8px; min-height: 8px;'
                        : 'background-color: rgba(120, 120, 131, 0.36); border-radius: 50%; min-width: 8px; min-height: 8px;'
                );
                btn.statusLabel.set_text(isActive ? 'On' : 'Off');
            } catch (e) {
                btn.statusDot.set_style('background-color: #8E8E93; border-radius: 50%; min-width: 8px; min-height: 8px;');
                btn.statusLabel.set_text('—');
            }
        }
    }

    /* ═══ MUSIC PLAYER ═════════════════════════════════════════ */

    _buildMusicSection() {
        let headerItem = new PopupMenu.PopupMenuItem(_('Now Playing'), { reactive: false });
        headerItem.label.style_class = 'widgy-menu-header';
        this.menu.addMenuItem(headerItem);

        let musicItem = new PopupMenu.PopupMenuItem('', { reactive: true });
        let musicBox = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            x_expand: true,
            style: 'spacing: 8px;',
        });

        // Track info row
        let infoRow = new St.BoxLayout({ x_expand: true, y_align: Clutter.ActorAlign.CENTER, style: 'spacing: 10px;' });

        this._albumIcon = new St.Icon({
            icon_name: 'audio-x-generic-symbolic',
            style: 'icon-size: 40px; border-radius: 6px;',
            y_align: Clutter.ActorAlign.CENTER,
        });
        infoRow.add_child(this._albumIcon);

        let textBox = new St.BoxLayout({ orientation: Clutter.Orientation.VERTICAL, x_expand: true });
        this._trackLabel = new St.Label({ text: 'No Track Playing', style: 'font-size: 13px; font-weight: 600; color: #ffffff;' });
        this._artistLabel = new St.Label({ text: '', style: 'font-size: 11px; color: rgba(235, 235, 245, 0.6);' });
        textBox.add_child(this._trackLabel);
        textBox.add_child(this._artistLabel);
        infoRow.add_child(textBox);

        musicBox.add_child(infoRow);

        // Playback controls
        let controlsRow = new St.BoxLayout({ x_align: Clutter.ActorAlign.CENTER, style: 'spacing: 12px; margin-top: 4px;' });

        this._prevBtn = new St.Button({
            style_class: 'widgy-menu-music-btn',
            child: new St.Icon({ icon_name: 'media-skip-backward-symbolic', style_class: 'popup-menu-icon', style: 'icon-size: 16px;' }),
        });
        this._playBtn = new St.Button({
            style_class: 'widgy-menu-music-btn',
            child: new St.Icon({ icon_name: 'media-playback-start-symbolic', style_class: 'popup-menu-icon', style: 'icon-size: 16px;' }),
        });
        this._nextBtn = new St.Button({
            style_class: 'widgy-menu-music-btn',
            child: new St.Icon({ icon_name: 'media-skip-forward-symbolic', style_class: 'popup-menu-icon', style: 'icon-size: 16px;' }),
        });

        controlsRow.add_child(this._prevBtn);
        controlsRow.add_child(this._playBtn);
        controlsRow.add_child(this._nextBtn);
        musicBox.add_child(controlsRow);

        musicItem.actor.add_child(musicBox);

        this._prevBtn.connect('clicked', () => this._mprisAction('Previous'));
        this._playBtn.connect('clicked', () => this._mprisAction('PlayPause'));
        this._nextBtn.connect('clicked', () => this._mprisAction('Next'));

        this.menu.addMenuItem(musicItem);
    }

    /* ═══ MPRIS DBUS ═══════════════════════════════════════════ */

    _initDBus() {
        const DBusIface = `<node>
          <interface name="org.freedesktop.DBus">
            <method name="ListNames"><arg type="as" direction="out"/></method>
          </interface>
        </node>`;
        const DBusProxyClass = Gio.DBusProxy.makeProxyWrapper(DBusIface);
        this._dbusProxy = new DBusProxyClass(Gio.DBus.session, 'org.freedesktop.DBus', '/org/freedesktop/DBus');

        this._dbusOwnerChangedId = Gio.DBus.session.signal_subscribe(
            'org.freedesktop.DBus', 'org.freedesktop.DBus', 'NameOwnerChanged',
            '/org/freedesktop/DBus', null, Gio.DBusSignalFlags.NONE,
            (conn, sender, path, iface, signal, params) => {
                let [name, oldOwner, newOwner] = params.deep_unpack();
                if (name.startsWith('org.mpris.MediaPlayer2.')) {
                    if (newOwner && !oldOwner && !this._mprisBusName) this._connectMpris(name);
                    else if (!newOwner && oldOwner && this._mprisBusName === name) {
                        this._disconnectMpris();
                        this._findMprisPlayer();
                    }
                }
            }
        );
        this._findMprisPlayer();
    }

    _findMprisPlayer() {
        this._dbusProxy.ListNamesRemote((names, error) => {
            if (error || !names) return;
            let players = names[0].filter(n => n.startsWith('org.mpris.MediaPlayer2.'));
            if (players.length > 0) this._connectMpris(players[0]);
        });
    }

    _connectMpris(busName) {
        this._disconnectMpris();
        this._mprisBusName = busName;

        const MprisIface = `<node>
          <interface name="org.mpris.MediaPlayer2.Player">
            <method name="PlayPause"/>
            <method name="Previous"/>
            <method name="Next"/>
            <method name="Stop"/>
            <property name="PlaybackStatus" type="s" access="read"/>
            <property name="Metadata" type="a{sv}" access="read"/>
          </interface>
        </node>`;
        const MprisProxy = Gio.DBusProxy.makeProxyWrapper(MprisIface);

        try {
            this._mprisProxy = new MprisProxy(Gio.DBus.session, busName, '/org/mpris/MediaPlayer2');

            this._mprisPropsChangedId = this._mprisProxy.connect('g-properties-changed', (proxy, changed) => {
                let unpacked = changed.deep_unpack();
                if ('PlaybackStatus' in unpacked) this._updateMusicPlayButton();
                if ('Metadata' in unpacked) this._updateMusicDisplay();
            });

            this._updateMusicDisplay();
            this._updateMusicPlayButton();
        } catch (e) {
            console.error('Widgy: MPRIS connect failed: ' + e);
        }
    }

    _disconnectMpris() {
        if (this._mprisProxy && this._mprisPropsChangedId) {
            this._mprisProxy.disconnect(this._mprisPropsChangedId);
            this._mprisPropsChangedId = 0;
        }
        this._mprisProxy = null;
        this._mprisBusName = null;
        if (this._trackLabel) this._trackLabel.set_text('No Track Playing');
        if (this._artistLabel) this._artistLabel.set_text('');
        if (this._playBtn) this._playBtn.child.set_icon_name('media-playback-start-symbolic');
    }

    _updateMusicDisplay() {
        if (!this._mprisProxy) return;
        try {
            let meta = this._mprisProxy.Metadata;
            if (meta) {
                let m = meta.deep_unpack();
                let title = m['xesam:title'] ? m['xesam:title'].deep_unpack() : 'No Track Playing';
                let artist = m['xesam:artist'] ? m['xesam:artist'].deep_unpack() : '';
                if (Array.isArray(artist)) artist = artist.join(', ');
                this._trackLabel.set_text(title);
                this._artistLabel.set_text(artist);
            }
        } catch (e) {
            this._trackLabel.set_text('No Track Playing');
            this._artistLabel.set_text('');
        }
    }

    _updateMusicPlayButton() {
        if (!this._mprisProxy) return;
        try {
            let status = this._mprisProxy.PlaybackStatus;
            this._playBtn.child.set_icon_name(status === 'Playing' ? 'media-playback-pause-symbolic' : 'media-playback-start-symbolic');
        } catch (e) {
            this._playBtn.child.set_icon_name('media-playback-start-symbolic');
        }
    }

    _mprisAction(method) {
        if (!this._mprisProxy) return;
        try {
            if (method === 'PlayPause') this._mprisProxy.PlayPauseRemote(() => {});
            else if (method === 'Previous') this._mprisProxy.PreviousRemote(() => {});
            else if (method === 'Next') this._mprisProxy.NextRemote(() => {});
        } catch (e) {
            console.error(`Widgy: MPRIS ${method} failed: ${e}`);
        }
    }

    /* ═══ NOTIFICATIONS ════════════════════════════════════════ */

    _buildNotificationSection() {
        let headerItem = new PopupMenu.PopupMenuItem(_('Notifications'), { reactive: false });
        headerItem.label.style_class = 'widgy-menu-header';
        this.menu.addMenuItem(headerItem);

        let clearItem = new PopupMenu.PopupMenuItem(_('Clear All'));
        clearItem.connect('activate', () => {
            try { Main.messageTray.clearAll(); } catch (e) { console.error('Widgy: ' + e); }
        });
        this.menu.addMenuItem(clearItem);

        let dndItem = new PopupMenu.PopupMenuItem(_('Toggle Do Not Disturb'));
        dndItem.connect('activate', () => {
            try {
                let settings = new Gio.Settings({ schema: 'org.gnome.desktop.notifications' });
                settings.set_boolean('show-banners', !settings.get_boolean('show-banners'));
                this._updateControlStates();
            } catch (e) { console.error('Widgy: ' + e); }
        });
        this.menu.addMenuItem(dndItem);
    }

    /* ═══ SETTINGS ═════════════════════════════════════════════ */

    _buildSettingsSection() {
        let settingsItem = new PopupMenu.PopupMenuItem(_('Extension Settings'));
        settingsItem.connect('activate', () => {
            try {
                Util.spawn(['gnome-extensions', 'prefs', 'widgy@anorak.example.com']);
            } catch (e) { console.error('Widgy: ' + e); }
        });
        this.menu.addMenuItem(settingsItem);
    }

    destroy() {
        this._disconnectMpris();
        if (this._dbusOwnerChangedId) {
            Gio.DBus.session.signal_unsubscribe(this._dbusOwnerChangedId);
            this._dbusOwnerChangedId = 0;
        }
        this._dbusProxy = null;
        super.destroy();
    }
}
