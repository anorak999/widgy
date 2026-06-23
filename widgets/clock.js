import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import { BaseWidget } from './base.js';

/*
  Clock Widget — Small (170×170 pt)
  ┌──────────────────┐
  │     MONDAY       │  caption-2, uppercase
  │                  │
  │     14:26        │  large-title, 48pt, thin
  │                  │
  │  June 23, 2026   │  body, secondary
  └──────────────────┘
*/
export class ClockWidget extends BaseWidget {
    constructor(settings, widgetManager) {
        super(settings, widgetManager, 'SMALL');
        this.type = 'clock';

        this.actor.x_expand = true;
        this.actor.y_expand = true;
        this.actor.y_align = Clutter.ActorAlign.CENTER;
        this.actor.x_align = Clutter.ActorAlign.CENTER;

        this._dayLabel = new St.Label({
            style_class: 'widgy-clock-day widgy-text-quaternary',
            text: '',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.actor.add_child(this._dayLabel);

        this._timeLabel = new St.Label({
            style_class: 'widgy-clock-time',
            text: '--:--',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.actor.add_child(this._timeLabel);

        this._dateLabel = new St.Label({
            style_class: 'widgy-clock-date',
            text: '',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.actor.add_child(this._dateLabel);

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

        const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                        'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

        this._dayLabel.set_text(days[now.getDay()]);
        this._dateLabel.set_text(`${months[now.getMonth()]} ${now.getDate()}`);
    }

    destroy() {
        if (this._timeId) {
            GLib.source_remove(this._timeId);
            this._timeId = null;
        }
        super.destroy();
    }
}
