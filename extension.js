import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/Shell/Extensions/js/extensions/extension.js';

// Import widgets relative to extension.js
import { ClockWidget } from './widgets/clock.js';
import { CalendarWidget } from './widgets/calendar.js';
import { MusicWidget } from './widgets/music.js';
import { ControlWidget } from './widgets/control.js';
import { WeatherWidget } from './widgets/weather.js';

export default class WidgyExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._widgetManager = new WidgetManager(this._settings);
        this._widgetManager.loadPositions();

        // If no widgets are saved, create some defaults for demonstration
        if (this._widgetManager.widgets.length === 0) {
            this._widgetManager.createWidget('clock', 100, 100);
            this._widgetManager.createWidget('calendar', 300, 100);
            this._widgetManager.createWidget('music', 100, 300);
            this._widgetManager.createWidget('control', 300, 300);
            this._widgetManager.createWidget('weather', 500, 200);
            this._widgetManager.savePositions();
        }
    }

    disable() {
        if (this._widgetManager) {
            this._widgetManager.savePositions();
            this._widgetManager.destroy();
            this._widgetManager = null;
        }
        this._settings = null;
    }
}

class WidgetManager {
    constructor(settings) {
        this.widgets = [];
        this.settings = settings;
    }

    createWidget(type, x, y) {
        let WidgetClass;
        switch (type) {
            case 'clock':
                WidgetClass = ClockWidget;
                break;
            case 'calendar':
                WidgetClass = CalendarWidget;
                break;
            case 'music':
                WidgetClass = MusicWidget;
                break;
            case 'control':
                WidgetClass = ControlWidget;
                break;
            case 'weather':
                WidgetClass = WeatherWidget;
                break;
            default:
                throw new Error(`Unknown widget type: ${type}`);
        }
        
        let widget = new WidgetClass(this.settings);
        widget.setPosition(x, y);
        widget.onRemove = (w) => this.removeWidget(w);
        this.widgets.push(widget);
        Main.uiGroup.add_child(widget.actor);
        return widget;
    }

    removeWidget(widget) {
        let index = this.widgets.indexOf(widget);
        if (index !== -1) {
            this.widgets.splice(index, 1);
            widget.destroy();
            this.savePositions();
        }
    }

    savePositions() {
        let positions = [];
        for (let widget of this.widgets) {
            let [x, y] = widget.getPosition();
            positions.push({
                type: widget.type,
                x: x,
                y: y
            });
        }
        // Save using GSettings (type: a(sii))
        let variant = new Gio.Variant('a(sii)', positions.map(p => [p.type, p.x, p.y]));
        this.settings.set_value('widget-positions', variant);
    }

    loadPositions() {
        let positions = this.settings.get_value('widget-positions').deep_unpack();
        for (let pos of positions) {
            let [type, x, y] = pos;
            this.createWidget(type, x, y);
        }
    }

    destroy() {
        for (let widget of this.widgets) {
            widget.destroy();
        }
        this.widgets = [];
    }
}
