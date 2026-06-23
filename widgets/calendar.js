import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import { BaseWidget } from './base.js';

/*
  Calendar Widget — Large (329×345 pt)
  ┌──────────────────────────────────────────┐
  │  MONDAY, JUNE 23              header      │
  │  ─────────────────────────────────────    │
  │  SU MO TU WE TH FR SA    week headers    │
  │      1  2  3  4  5  6                    │
  │   7  8  9 10 11 12 13                    │
  │  14 15 16 17 18 19 20                    │
  │  21 22 [23]24 25 26 27                    │
  │  28 29 30                                │
  │  ─────────────────────────────────────    │
  │  TODAY'S EVENTS                          │
  │  10:00  Meeting with design team         │
  │  14:00  Lunch with Alex                  │
  └──────────────────────────────────────────┘
*/
export class CalendarWidget extends BaseWidget {
    constructor(settings, widgetManager) {
        super(settings, widgetManager, 'LARGE');
        this.type = 'calendar';

        this.actor.x_expand = true;
        this.actor.y_expand = true;

        // Header
        this._headerLabel = new St.Label({
            style_class: 'widgy-calendar-header',
            text: '',
            x_expand: true,
        });
        this.actor.add_child(this._headerLabel);

        // Separator
        this.actor.add_child(new St.Widget({
            style_class: 'widgy-separator',
            x_expand: true,
            min_height: 0.5,
            margin_bottom: 8,
        }));

        // Day-of-week headers
        let weekHeaderRow = new St.BoxLayout({
            x_expand: true,
            style: 'spacing: 0px;',
        });
        const dayAbbrevs = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        for (let d of dayAbbrevs) {
            let lbl = new St.Label({
                style_class: 'widgy-calendar-day-header',
                text: d,
                x_expand: true,
                x_align: Clutter.ActorAlign.CENTER,
            });
            weekHeaderRow.add_child(lbl);
        }
        this.actor.add_child(weekHeaderRow);

        // Calendar grid (6 weeks × 7 days)
        this._gridBox = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            x_expand: true,
            margin_top: 4,
            margin_bottom: 8,
            style: 'spacing: 2px;',
        });
        this.actor.add_child(this._gridBox);

        // Separator
        this.actor.add_child(new St.Widget({
            style_class: 'widgy-separator',
            x_expand: true,
            min_height: 0.5,
            margin_bottom: 8,
        }));

        // Events section
        this._eventsHeader = new St.Label({
            style_class: 'widgy-type-headline',
            text: 'UPCOMING',
            margin_bottom: 4,
        });
        this.actor.add_child(this._eventsHeader);

        this._eventsBox = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            x_expand: true,
            y_expand: true,
            style: 'spacing: 4px;',
        });
        this.actor.add_child(this._eventsBox);

        this._updateCalendar();
        this._updateEvents();
        this._dateId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60, () => {
            this._updateCalendar();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _updateCalendar() {
        let now = new Date();
        let year = now.getFullYear();
        let month = now.getMonth();
        let today = now.getDate();

        const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                            'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
        const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

        this._headerLabel.set_text(`${dayNames[now.getDay()]}, ${monthNames[month]} ${today}`);

        // Build calendar grid
        this._gridBox.destroy_all_children();

        let firstDay = new Date(year, month, 1).getDay();
        let daysInMonth = new Date(year, month + 1, 0).getDate();
        let daysInPrevMonth = new Date(year, month, 0).getDate();

        let dayNum = 1;
        let nextMonthDay = 1;

        for (let week = 0; week < 6; week++) {
            let weekRow = new St.BoxLayout({
                x_expand: true,
                style: 'spacing: 0px;',
            });

            for (let dow = 0; dow < 7; dow++) {
                let dayLabel;
                let isToday = false;
                let dayValue;

                if (week === 0 && dow < firstDay) {
                    // Previous month
                    dayValue = daysInPrevMonth - firstDay + dow + 1;
                    dayLabel = new St.Label({
                        style_class: 'widgy-calendar-day other-month',
                        text: `${dayValue}`,
                        x_expand: true,
                        x_align: Clutter.ActorAlign.CENTER,
                        y_align: Clutter.ActorAlign.CENTER,
                    });
                } else if (dayNum <= daysInMonth) {
                    // Current month
                    dayValue = dayNum;
                    isToday = dayNum === today;
                    dayLabel = new St.Label({
                        style_class: isToday ? 'widgy-calendar-day today' : 'widgy-calendar-day',
                        text: `${dayNum}`,
                        x_expand: true,
                        x_align: Clutter.ActorAlign.CENTER,
                        y_align: Clutter.ActorAlign.CENTER,
                    });
                    dayNum++;
                } else {
                    // Next month
                    dayValue = nextMonthDay;
                    dayLabel = new St.Label({
                        style_class: 'widgy-calendar-day other-month',
                        text: `${nextMonthDay}`,
                        x_expand: true,
                        x_align: Clutter.ActorAlign.CENTER,
                        y_align: Clutter.ActorAlign.CENTER,
                    });
                    nextMonthDay++;
                }

                weekRow.add_child(dayLabel);
            }

            this._gridBox.add_child(weekRow);
        }
    }

    _updateEvents() {
        this._eventsBox.destroy_all_children();

        let events = [
            { time: '10:00', title: 'Meeting with design team', color: '#0A84FF' },
            { time: '14:00', title: 'Lunch with Alex', color: '#30D158' },
            { time: '16:30', title: 'Gym session', color: '#FF9F0A' },
        ];

        for (let event of events) {
            let row = new St.BoxLayout({
                style_class: 'widgy-calendar-event',
                x_expand: true,
                style: `spacing: 8px; padding: 6px 8px; margin: 2px 0; border-radius: 8px; background-color: rgba(120, 120, 131, 0.2);`,
            });

            // Color dot
            let dot = new St.Widget({
                style: `background-color: ${event.color}; border-radius: 50%; min-width: 6px; min-height: 6px; margin-right: 4px;`,
                y_align: Clutter.ActorAlign.CENTER,
            });
            row.add_child(dot);

            let timeLabel = new St.Label({
                style_class: 'widgy-calendar-event-time',
                text: event.time,
                y_align: Clutter.ActorAlign.CENTER,
            });
            row.add_child(timeLabel);

            let titleLabel = new St.Label({
                style_class: 'widgy-type-body',
                text: event.title,
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
            });
            row.add_child(titleLabel);

            this._eventsBox.add_child(row);
        }
    }

    destroy() {
        if (this._dateId) {
            GLib.source_remove(this._dateId);
            this._dateId = null;
        }
        super.destroy();
    }
}
