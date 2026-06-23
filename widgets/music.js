import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import { BaseWidget } from './base.js';

// Simple MPRIS interface definitions
const MprisPlayerIface = `<node>
  <interface name="org.mpris.MediaPlayer2.Player">
    <method name="PlayPause"/>
    <method name="Previous"/>
    <method name="Next"/>
    <method name="Stop"/>
    <property name="PlaybackStatus" type="s" access="read"/>
    <property name="Metadata" type="a{sv}" access="read"/>
  </interface>
</node>`;

const MprisPlayerProxy = Gio.DBusProxy.makeProxyWrapper(MprisPlayerIface);

const DBusIface = `<node>
  <interface name="org.freedesktop.DBus">
    <method name="ListNames">
      <arg type="as" direction="out"/>
    </method>
  </interface>
</node>`;

const DBusProxyClass = Gio.DBusProxy.makeProxyWrapper(DBusIface);

export class MusicWidget extends BaseWidget {
    constructor(settings, widgetManager) {
        super(settings, widgetManager);
        this.type = 'music';

        this._player = null;
        this._currentPlayerBusName = null;
        this._playbackStatus = 'Stopped';
        this._metadata = {};

        this._albumArt = new St.Icon({
            style_class: 'widgy-widget-album-art',
            gicon: Gio.ThemedIcon.new('audio-x-generic')
        });
        this.actor.add_child(this._albumArt);

        this._infoBox = new St.BoxLayout({ orientation: Clutter.Orientation.VERTICAL });
        this._trackLabel = new St.Label({
            style_class: 'widgy-widget-track',
            text: 'No track playing'
        });
        this._artistLabel = new St.Label({
            style_class: 'widgy-widget-artist',
            text: ''
        });
        this._infoBox.add_child(this._trackLabel);
        this._infoBox.add_child(this._artistLabel);
        this.actor.add_child(this._infoBox);

        this._controlsBox = new St.BoxLayout();
        this._prevButton = new St.Button({
            style_class: 'widgy-widget-button',
            child: new St.Icon({ icon_name: 'media-skip-backward-symbolic', style_class: 'widgy-widget-icon' })
        });
        this._playIcon = new St.Icon({ icon_name: 'media-playback-start-symbolic', style_class: 'widgy-widget-icon' });
        this._playButton = new St.Button({
            style_class: 'widgy-widget-button',
            child: this._playIcon
        });
        this._nextButton = new St.Button({
            style_class: 'widgy-widget-button',
            child: new St.Icon({ icon_name: 'media-skip-forward-symbolic', style_class: 'widgy-widget-icon' })
        });
        this._controlsBox.add_child(this._prevButton);
        this._controlsBox.add_child(this._playButton);
        this._controlsBox.add_child(this._nextButton);
        this.actor.add_child(this._controlsBox);

        this._prevButton.connect('clicked', () => this._previousTrack());
        this._playButton.connect('clicked', () => this._playPause());
        this._nextButton.connect('clicked', () => this._nextTrack());

        this._initDBus();
    }

    _initDBus() {
        // Find active players and subscribe to changes
        this._dbus = new DBusProxyClass(Gio.DBus.session, 'org.freedesktop.DBus', '/org/freedesktop/DBus');
        
        this._findActivePlayer();

        this._ownerChangedId = Gio.DBus.session.signal_subscribe(
            'org.freedesktop.DBus',
            'org.freedesktop.DBus',
            'NameOwnerChanged',
            '/org/freedesktop/DBus',
            null,
            Gio.DBusSignalFlags.NONE,
            (connection, sender, path, iface, signal, parameters) => {
                let [name, oldOwner, newOwner] = parameters.deep_unpack();
                if (name.startsWith('org.mpris.MediaPlayer2.')) {
                    if (newOwner && !oldOwner) {
                        if (!this._currentPlayerBusName) {
                            this._connectToPlayer(name);
                        }
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
            if (error || !names) {
                return;
            }
            let players = names[0].filter(name => name.startsWith('org.mpris.MediaPlayer2.'));
            if (players.length > 0) {
                this._connectToPlayer(players[0]);
            } else {
                this._updateDisplay();
            }
        });
    }

    _connectToPlayer(busName) {
        this._disconnectPlayer();
        this._currentPlayerBusName = busName;

        try {
            this._player = new MprisPlayerProxy(
                Gio.DBus.session,
                busName,
                '/org/mpris/MediaPlayer2'
            );

            this._propertiesChangedId = this._player.connect('g-properties-changed', (proxy, changed, invalidated) => {
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

            // Get initial values if available
            let status = this._player.PlaybackStatus;
            if (status) {
                this._playbackStatus = typeof status.deep_unpack === 'function' ? status.deep_unpack() : status;
            }
            if (this._player.Metadata) {
                this._metadata = this._parseMetadata(new Gio.Variant('a{sv}', this._player.Metadata));
            }
            this._updatePlayButton();
            this._updateDisplay();
        } catch (e) {
            console.error('Failed to connect to MPRIS player: ' + e);
        }
    }

    _disconnectPlayer() {
        if (this._player) {
            if (this._propertiesChangedId) {
                this._player.disconnect(this._propertiesChangedId);
                this._propertiesChangedId = null;
            }
            this._player = null;
        }
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
        if ('xesam:title' in metadata) {
            result.title = metadata['xesam:title'];
        }
        if ('xesam:artist' in metadata && Array.isArray(metadata['xesam:artist']) && metadata['xesam:artist'].length > 0) {
            result.artist = metadata['xesam:artist'][0];
        }
        if ('mpris:artUrl' in metadata) {
            result.artUrl = metadata['mpris:artUrl'];
        }
        return result;
    }

    _updateDisplay() {
        if (this._metadata && this._metadata.title) {
            this._trackLabel.set_text(this._metadata.title);
        } else {
            this._trackLabel.set_text('No track playing');
        }
        if (this._metadata && this._metadata.artist) {
            this._artistLabel.set_text(this._metadata.artist);
        } else {
            this._artistLabel.set_text('');
        }
    }

    _updatePlayButton() {
        let iconName = this._playbackStatus === 'Playing' ? 'media-playback-pause-symbolic' : 'media-playback-start-symbolic';
        this._playIcon.set_icon_name(iconName);
    }

    _previousTrack() {
        if (this._player) {
            this._player.PreviousRemote(() => {});
        }
    }

    _playPause() {
        if (this._player) {
            this._player.PlayPauseRemote(() => {});
        }
    }

    _nextTrack() {
        if (this._player) {
            this._player.NextRemote(() => {});
        }
    }

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