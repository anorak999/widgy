import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { ClockWidget } from './widgets/clock.js';
import { CalendarWidget } from './widgets/calendar.js';
import { MusicWidget } from './widgets/music.js';
import { ControlWidget } from './widgets/control.js';
import { WeatherWidget } from './widgets/weather.js';
import { WidgySystemMenu } from './widgets/systemMenu.js';

export default class WidgyExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._widgetManager = new WidgetManager(this._settings);
        this._widgetManager.loadPositions();

        // System menu panel button
        this._systemMenu = new WidgySystemMenu(this._settings);
        Main.panel.addToStatusArea('widgy-system-menu', this._systemMenu);

        // Default widget layout — macOS Sonoma desktop style
        if (this._widgetManager.widgets.length === 0) {
            // Left column: clock (small) + weather (small) stacked
            this._widgetManager.createWidget('clock', 60, 60);
            this._widgetManager.createWidget('weather', 60, 250);
            // Center: calendar (large)
            this._widgetManager.createWidget('calendar', 250, 60);
            // Right column: music (medium) + controls (medium) stacked
            this._widgetManager.createWidget('music', 600, 60);
            this._widgetManager.createWidget('control', 600, 230);
            this._widgetManager.savePositions();
        }
    }

    disable() {
        if (this._systemMenu) {
            this._systemMenu.destroy();
            this._systemMenu = null;
        }
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
        this._dragWidget = null;
        this._dragData = null;
        this._stageMotionId = 0;
        this._initStageDrag();
    }

    _initStageDrag() {
        this._stageMotionId = global.stage.connect('motion-event', (stage, event) => {
            if (!this._dragWidget || !this._dragData) {
                return Clutter.EVENT_PROPAGATE;
            }

            let state = event.get_state();
            if (!(state & Clutter.ModifierType.BUTTON1_MASK)) {
                this._endDrag();
                return Clutter.EVENT_PROPAGATE;
            }

            let [x, y] = event.get_coords();
            let dx = x - this._dragData.startX;
            let dy = y - this._dragData.startY;
            let newX = Math.round(this._dragData.actorStartX + dx);
            let newY = Math.round(this._dragData.actorStartY + dy);

            if (this._dragWidget._snapGrid) {
                const snapSize = 20;
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
            }

            this._dragWidget.actor.set_position(newX, newY);
            return Clutter.EVENT_STOP;
        });
    }

    registerDrag(widget, event) {
        if (this._dragWidget) return false;
        let [startX, startY] = event.get_coords();
        let [actorStartX, actorStartY] = widget.actor.get_position();
        this._dragWidget = widget;
        this._dragData = { startX, startY, actorStartX, actorStartY };
        return true;
    }

    unregisterDrag(widget) {
        if (this._dragWidget === widget) this._endDrag();
    }

    _endDrag() {
        if (this._dragWidget) {
            this.savePositions();
            this._dragWidget = null;
            this._dragData = null;
        }
    }

    createWidget(type, x, y) {
        let WidgetClass;
        switch (type) {
            case 'clock':    WidgetClass = ClockWidget; break;
            case 'calendar': WidgetClass = CalendarWidget; break;
            case 'music':    WidgetClass = MusicWidget; break;
            case 'control':  WidgetClass = ControlWidget; break;
            case 'weather':  WidgetClass = WeatherWidget; break;
            default: throw new Error(`Unknown widget type: ${type}`);
        }

        let widget = new WidgetClass(this.settings, this);
        widget.setPosition(x, y);
        widget.onRemove = (w) => this.removeWidget(w);
        this.widgets.push(widget);
        Main.layoutManager._backgroundGroup.add_child(widget.actor);
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
        const children = new Array(this.widgets.length);
        for (let i = 0; i < this.widgets.length; i++) {
            const widget = this.widgets[i];
            const [x, y] = widget.getPosition();
            children[i] = [widget.type, x, y];
        }
        const variant = new GLib.Variant('a(sii)', children);
        this.settings.set_value('widget-positions', variant);
    }

    loadPositions() {
        let positions = this.settings.get_value('widget-positions').deep_unpack();
        for (let pos of positions) {
            if (!Array.isArray(pos) || pos.length !== 3) continue;
            let [type, x, y] = pos;
            if (typeof type !== 'string' || typeof x !== 'number' || typeof y !== 'number') continue;
            if (x < 0 || y < 0 || x > 5000 || y > 5000) continue;
            this.createWidget(type, x, y);
        }
    }

    destroy() {
        if (this._stageMotionId) {
            global.stage.disconnect(this._stageMotionId);
            this._stageMotionId = 0;
        }
        for (let widget of this.widgets) {
            if (widget.actor) {
                Main.layoutManager._backgroundGroup.remove_child(widget.actor);
            }
            widget.destroy();
        }
        this.widgets = [];
    }
}
