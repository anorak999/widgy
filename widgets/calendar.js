import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import { BaseWidget } from './base.js';

export class CalendarWidget extends BaseWidget {
    constructor(settings, widgetManager) {
        super(settings, widgetManager);
        this.type = 'calendar';

        this._dateLabel = new St.Label({
            style_class: 'widgy-widget-label',
            text: 'Loading...'
        });
        this.actor.add_child(this._dateLabel);

        this._eventsBox = new St.BoxLayout({ orientation: Clutter.Orientation.VERTICAL });
        this.actor.add_child(this._eventsBox);

        this._updateDate();
        this._dateId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60, () => {
            this._updateDate();
            return GLib.SOURCE_CONTINUE;
        });
        this._updateEvents();
    }

    _updateDate() {
        let now = new Date();
        let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        let dateString = now.toLocaleDateString(undefined, options);
        this._dateLabel.set_text(dateString);
    }

    _updateEvents() {
        this._eventsBox.destroy_all_children();

        let event1 = new St.Label({ text: 'Meeting at 10:00', style_class: 'widgy-widget-event' });
        let event2 = new St.Label({ text: 'Lunch with Alex', style_class: 'widgy-widget-event' });
        this._eventsBox.add_child(event1);
        this._eventsBox.add_child(event2);
    }

    destroy() {
        if (this._dateId) {
            GLib.source_remove(this._dateId);
            this._dateId = null;
        }
        super.destroy();
    }
}