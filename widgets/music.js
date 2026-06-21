const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;

const BaseWidget = require('./base.js');

const MusicWidget = class MusicWidget extends BaseWidget {
    constructor(settings) {
        super(settings);
        this.type = 'music';

        this._player = null;
        this._playbackStatus = '';
        this._metadata = {};

        this._albumArt = new St.Icon({
            style_class: 'widgy-widget-album-art',
            gicon: Gio.ThemedIcon.new('audio-x-generic')
        });
        this.actor.add_child(this._albumArt);

        this._infoBox = new St.BoxLayout({ vertical: true });
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
        this._playButton = new St.Button({
            style_class: 'widgy-widget-button',
            child: new St.Icon({ icon_name: 'media-playback-start-symbolic', style_class: 'widgy-widget-icon' })
        });
        this._nextButton = new St.Button({
            style_class: 'widgy-widget-button',
            child: new St.Icon({ icon_name: 'media-skip-forward-symbolic', style_class: 'widgy-widget-icon' })
        });
        this._controlsBox.add_child(this._prevButton);
        this._controlsBox.add_child(this._playButton);
        this._controlsBox.add_child(this._nextButton);
        this.actor.add_child(this._controlsBox);

        this._initDBus();
        this._updateDisplay();

        // Button clicks
        this._prevButton.connect('clicked', Lang.bind(this, this._previousTrack));
        this._playButton.connect('clicked', Lang.bind(this, this._playPause));
        this._nextButton.connect('clicked', Lang.bind(this, this._nextTrack));
    }

    _initDBus() {
        Gio.DBusProxy.make_proxy_wrapper({
            interface: 'org.mpris.MediaPlayer2.Player',
            properties: ['PlaybackStatus', 'Metadata'],
            methods: ['PlayPause', 'Previous', 'Next', 'Stop']
        })(this, (proxy, error) => {
            if (error) {
                log('Failed to connect to MPRIS: ' + error);
                return;
            }
            this._player = proxy;
            this._player.connect('g-properties-changed', Lang.bind(this, this._onPropertiesChanged));
            this._player.connect('g-signal', Lang.bind(this, this._onSignal));
            this._fetchInitial();
        }, 'org.mpris.MediaPlayer2.', '/org/mpris/MediaPlayer2');
    }

    _fetchInitial() {
        if (!this._player) return;
        this._player.GetAll('org.mpris.MediaPlayer2.Player', null, Lang.bind(this, (proxy, result, error) => {
            if (error) {
                log('Failed to get initial MPRIS properties: ' + error);
                return;
            }
            let [properties] = result;
            this._onPropertiesChanged(properties, [], [];
        }));
    }

    _onPropertiesChanged(interfaceName, changedProperties, invalidatedProperties) {
        if (interfaceName !== 'org.mpris.MediaPlayer2.Player') return;
        for (let [name, value] of changedProperties) {
            if (name === 'PlaybackStatus') {
                this._playbackStatus = value.get_string();
                this._updatePlayButton();
            } else if (name === 'Metadata') {
                this._metadata = this._parseMetadata(value);
                this._updateDisplay();
            }
        }
    }

    _onSignal(proxy, senderName, signalName, parameters) {
        if (signalName === 'Seeked') {
            // We don't need to update display for seek
        }
    }

    _parseMetadata(metadataVariant) {
        let metadata = metadataVariant.deep_unpack();
        let result = {};
        if ('xesam:title' in metadata) {
            result.title = metadata['xesam:title'];
        }
        if ('xesam:artist' in metadata && metadata['xesam:artist'].length > 0) {
            result.artist = metadata['xesam:artist'][0];
        }
        if ('mpris:artUrl' in metadata) {
            result.artUrl = metadata['mpris:artUrl'];
        }
        return result;
    }

    _updateDisplay() {
        if (this._metadata.title) {
            this._trackLabel.set_text(this._metadata.title);
        } else {
            this._trackLabel.set_text('No track playing');
        }
        if (this._metadata.artist) {
            this._artistLabel.set_text(this._metadata.artist);
        } else {
            this._artistLabel.set_text('');
        }
        // TODO: Update album art from artUrl
    }

    _updatePlayButton() {
        if (this._playbackStatus === 'Playing') {
            this._playButton.set_child(new St.Icon({ icon_name: 'media-playback-pause-symbolic', style_class: 'widgy-widget-icon' }));
        } else {
            this._playButton.set_child(new St.Icon({ icon_name: 'media-playback-start-symbolic', style_class: 'widgy-widget-icon' }));
        }
    }

    _previousTrack() {
        if (this._player) {
            this._player.Previous();
        }
    }

    _playPause() {
        if (this._player) {
            this._player.PlayPause();
        }
    }

    _nextTrack() {
        if (this._player) {
            this._player.Next();
        }
    }

    destroy() {
        if (this._player) {
            this._player.$destroy();
        }
        super.destroy();
    }
};

if (typeof module !== 'undefined') {
    module.exports = MusicWidget;
}