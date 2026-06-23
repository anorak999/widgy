import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { BaseWidget } from './base.js';

/*
  Music Widget — Medium (329×155 pt)
  ┌──────────────────────────────────────────┐
  │ [album]  Track Title          [prev][▸]  │
  │  64px    Artist Name          [next]     │
  │          ───●────────────────── 3:24      │
  └──────────────────────────────────────────┘
*/
export class MusicWidget extends BaseWidget {
    constructor(settings, widgetManager) {
        super(settings, widgetManager, 'MEDIUM');
        this.type = 'music';

        this._player = null;
        this._currentPlayerBusName = null;
        this._playbackStatus = 'Stopped';
        this._metadata = {};

        this._buildUI();
        this._initDBus();
    }

    _buildUI() {
        this.actor.x_expand = true;
        this.actor.y_expand = true;

        let contentBox = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER,
        });

        // Album art
        this._albumArt = new St.Icon({
            style_class: 'widgy-music-art',
            gicon: Gio.ThemedIcon.new('audio-x-generic'),
            y_align: Clutter.ActorAlign.CENTER,
        });
        contentBox.add_child(this._albumArt);

        // Separator
        let sep = new St.Widget({
            style_class: 'widgy-separator-vertical',
            min_width: 0.5,
            min_height: 64,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            margin_left: 12,
            margin_right: 12,
        });
        contentBox.add_child(sep);

        // Info + controls column
        let rightBox = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });

        // Track info row
        let infoRow = new St.BoxLayout({
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });

        let textBox = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            x_expand: true,
        });

        this._trackLabel = new St.Label({
            style_class: 'widgy-music-track',
            text: 'No Track Playing',
            x_expand: true,
            ellipsize: 3,
        });
        textBox.add_child(this._trackLabel);

        this._artistLabel = new St.Label({
            style_class: 'widgy-music-artist',
            text: '',
            x_expand: true,
            ellipsize: 3,
        });
        textBox.add_child(this._artistLabel);

        infoRow.add_child(textBox);

        // Playback controls
        let controlsBox = new St.BoxLayout({
            style_class: 'widgy-music-controls',
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
            margin_left: 8,
        });

        this._prevButton = new St.Button({
            style_class: 'widgy-music-btn',
            child: new St.Icon({ icon_name: 'media-skip-backward-symbolic', style_class: 'widgy-toggle-icon' }),
        });
        this._playIcon = new St.Icon({ icon_name: 'media-playback-start-symbolic', style_class: 'widgy-toggle-icon' });
        this._playButton = new St.Button({
            style_class: 'widgy-music-btn widgy-music-btn-play',
            child: this._playIcon,
        });
        this._nextButton = new St.Button({
            style_class: 'widgy-music-btn',
            child: new St.Icon({ icon_name: 'media-skip-forward-symbolic', style_class: 'widgy-toggle-icon' }),
        });

        controlsBox.add_child(this._prevButton);
        controlsBox.add_child(this._playButton);
        controlsBox.add_child(this._nextButton);

        infoRow.add_child(controlsBox);
        rightBox.add_child(infoRow);

        // Progress bar
        let progressBox = new St.BoxLayout({
            x_expand: true,
            margin_top: 8,
            y_align: Clutter.ActorAlign.END,
        });

        this._progressBar = new St.Widget({
            style_class: 'widgy-music-progress',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._progressFill = new St.Widget({
            style_class: 'widgy-music-progress-fill',
            x_expand: false,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._progressBar.add_child(this._progressFill);
        progressBox.add_child(this._progressBar);

        rightBox.add_child(progressBox);
        contentBox.add_child(rightBox);

        this.actor.add_child(contentBox);

        this._prevButton.connect('clicked', () => this._previousTrack());
        this._playButton.connect('clicked', () => this._playPause());
        this._nextButton.connect('clicked', () => this._nextTrack());
    }

    _initDBus() {
        const DBusIface = `<node>
          <interface name="org.freedesktop.DBus">
            <method name="ListNames"><arg type="as" direction="out"/></method>
          </interface>
        </node>`;
        const DBusProxyClass = Gio.DBusProxy.makeProxyWrapper(DBusIface);
        this._dbus = new DBusProxyClass(Gio.DBus.session, 'org.freedesktop.DBus', '/org/freedesktop/DBus');

        this._findActivePlayer();

        this._ownerChangedId = Gio.DBus.session.signal_subscribe(
            'org.freedesktop.DBus', 'org.freedesktop.DBus', 'NameOwnerChanged',
            '/org/freedesktop/DBus', null, Gio.DBusSignalFlags.NONE,
            (conn, sender, path, iface, signal, params) => {
                let [name, oldOwner, newOwner] = params.deep_unpack();
                if (name.startsWith('org.mpris.MediaPlayer2.')) {
                    if (newOwner && !oldOwner) {
                        if (!this._currentPlayerBusName) this._connectToPlayer(name);
                    } else if (!newOwner && oldOwner) {
                        if (this._currentPlayerBusName === name) {
                            this._disconnectPlayer();
                            this._findActivePlayer();
                        }
                    }
                }
            }
        );
    }

    _findActivePlayer() {
        this._dbus.ListNamesRemote((names, error) => {
            if (error || !names) return;
            let players = names[0].filter(n => n.startsWith('org.mpris.MediaPlayer2.'));
            if (players.length > 0) this._connectToPlayer(players[0]);
            else this._updateDisplay();
        });
    }

    _connectToPlayer(busName) {
        this._disconnectPlayer();
        this._currentPlayerBusName = busName;

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
            this._player = new MprisProxy(Gio.DBus.session, busName, '/org/mpris/MediaPlayer2');

            this._propertiesChangedId = this._player.connect('g-properties-changed', (proxy, changed) => {
                let unpacked = changed.deep_unpack();
                if ('PlaybackStatus' in unpacked) {
                    this._playbackStatus = unpacked.PlaybackStatus.deep_unpack();
                    this._updatePlayButton();
                }
                if ('Metadata' in unpacked) {
                    this._metadata = this._parseMetadata(unpacked.Metadata);
                    this._updateDisplay();
                }
            });

            let status = this._player.PlaybackStatus;
            if (status) {
                this._playbackStatus = typeof status.deep_unpack === 'function' ? status.deep_unpack() : status;
            }
            if (this._player.Metadata) {
                this._metadata = this._parseMetadata(new GLib.Variant('a{sv}', this._player.Metadata));
            }
            this._updatePlayButton();
            this._updateDisplay();
        } catch (e) {
            console.error('Widgy: Failed to connect MPRIS: ' + e);
        }
    }

    _disconnectPlayer() {
        if (this._player && this._propertiesChangedId) {
            this._player.disconnect(this._propertiesChangedId);
            this._propertiesChangedId = null;
        }
        this._player = null;
        this._currentPlayerBusName = null;
        this._playbackStatus = 'Stopped';
        this._metadata = {};
        this._updatePlayButton();
        this._updateDisplay();
    }

    _parseMetadata(metadataVariant) {
        if (!metadataVariant) return {};
        let metadata = metadataVariant.deep_unpack();
        let result = {};
        if ('xesam:title' in metadata) result.title = metadata['xesam:title'];
        if ('xesam:artist' in metadata && Array.isArray(metadata['xesam:artist']) && metadata['xesam:artist'].length > 0) {
            result.artist = metadata['xesam:artist'][0];
        }
        if ('mpris:artUrl' in metadata) result.artUrl = metadata['mpris:artUrl'];
        return result;
    }

    _updateDisplay() {
        if (this._metadata && this._metadata.title) {
            this._trackLabel.set_text(this._metadata.title);
        } else {
            this._trackLabel.set_text('No Track Playing');
        }
        if (this._metadata && this._metadata.artist) {
            this._artistLabel.set_text(this._metadata.artist);
        } else {
            this._artistLabel.set_text('');
        }
    }

    _updatePlayButton() {
        let iconName = this._playbackStatus === 'Playing'
            ? 'media-playback-pause-symbolic'
            : 'media-playback-start-symbolic';
        this._playIcon.set_icon_name(iconName);
    }

    _previousTrack() { if (this._player) this._player.PreviousRemote(() => {}); }
    _playPause()     { if (this._player) this._player.PlayPauseRemote(() => {}); }
    _nextTrack()     { if (this._player) this._player.NextRemote(() => {}); }

    destroy() {
        this._disconnectPlayer();
        if (this._ownerChangedId) {
            Gio.DBus.session.signal_unsubscribe(this._ownerChangedId);
            this._ownerChangedId = null;
        }
        this._dbus = null;
        super.destroy();
    }
}
