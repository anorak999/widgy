const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const Gio = imports.gi.Gio;

const BaseWidget = require('./base.js');

const CalendarWidget = class CalendarWidget extends BaseWidget {
    constructor(settings) {
        super(settings);
        this.type = 'calendar';

        this._dateLabel = new St.Label({
            style_class: 'widgy-widget-label',
            text: 'Loading...'
        });
        this.actor.add_child(this._dateLabel);

        this._eventsBox = new St.BoxLayout({ vertical: true });
        this.actor.add_child(this._eventsBox);

        this._updateDate();
        this._dateId = Mainloop.timeout_add_seconds(60, Lang.bind(this, this._updateDate));
        // For events, we could try to read from Evolution Data Server, but for simplicity, we'll just show a placeholder.
        this._updateEvents();
    }

    _updateDate() {
        let now = new Date();
        let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        let dateString = now.toLocaleDateString(undefined, options);
        this._dateLabel.set_text(dateString);
        return GObject.SOURCE_CONTINUE;
    }

    _updateEvents() {
        // Clear existing events
        this._eventsBox.destroy_all_children();

        // Placeholder: show a couple of dummy events
        let event1 = new St.Label({ text: 'Meeting at 10:00', style_class: 'widgy-widget-event' });
        let event2 = new St.Label({ text: 'Lunch with Alex', style_class: 'widgy-widget-event' });
        this._eventsBox.add_child(event1);
        this._eventsBox.add_child(event2);

        // Update every hour
        return GObject.SOURCE_CONTINUE;
    }

    destroy() {
        if (this._dateId) {
            Mainloop.source_remove(this._dateId);
        }
        super.destroy();
    }
};

if (typeof module !== 'undefined') {
    module.exports = CalendarWidget;
}