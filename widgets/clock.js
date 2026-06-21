const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;

const BaseWidget = require('./base.js');

const ClockWidget = class ClockWidget extends BaseWidget {
    constructor(settings) {
        super(settings);
        this.type = 'clock';

        this._timeLabel = new St.Label({
            style_class: 'widgy-widget-label',
            text: '--:--'
        });
        this.actor.add_child(this._timeLabel);

        // For now, we'll just show digital time. We can add analog later.
        this._updateTime();
        this._timeId = Mainloop.timeout_add_seconds(1, Lang.bind(this, this._updateTime));
    }

    _updateTime() {
        let now = new Date();
        let hours = now.getHours().toString().padStart(2, '0');
        let minutes = now.getMinutes().toString().padStart(2, '0');
        this._timeLabel.set_text(`${hours}:${minutes}`);
        return GObject.SOURCE_CONTINUE;
    }

    destroy() {
        if (this._timeId) {
            Mainloop.source_remove(this._timeId);
        }
        super.destroy();
    }
};

if (typeof module !== 'undefined') {
    module.exports = ClockWidget;
}