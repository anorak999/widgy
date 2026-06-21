import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import { BaseWidget } from './base.js';

export class ClockWidget extends BaseWidget {
    constructor(settings) {
        super(settings);
        this.type = 'clock';

        this._timeLabel = new St.Label({
            style_class: 'widgy-widget-label',
            text: '--:--'
        });
        this.actor.add_child(this._timeLabel);

        this._updateTime();
        this._timeId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            this._updateTime();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _updateTime() {
        let now = new Date();
        let hours = now.getHours().toString().padStart(2, '0');
        let minutes = now.getMinutes().toString().padStart(2, '0');
        this._timeLabel.set_text(`${hours}:${minutes}`);
    }

    destroy() {
        if (this._timeId) {
            GLib.source_remove(this._timeId);
            this._timeId = null;
        }
        super.destroy();
    }
}