const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

// Helper to import a widget from the widgets directory
function importWidget(name) {
    let path = Me.dir.get_child('widgets').get_child(name + '.js');
    let imports = new imports;
    try {
        return imports.importWidget(path.get_path());
    } catch (e) {
        logError(`Failed to import widget ${name}: ${e}`);
        return null;
    }
}

let widgetManager = null;

function init() {
    // Import widget classes
    const ClockWidget = importWidget('clock');
    const CalendarWidget = importWidget('calendar');
    const MusicWidget = importWidget('music');
    const ControlWidget = importWidget('control');
    const WeatherWidget = importWidget('weather');

    // Make them available globally for the extension
    global.ClockWidget = ClockWidget;
    global.CalendarWidget = CalendarWidget;
    global.MusicWidget = MusicWidget;
    global.ControlWidget = ControlWidget;
    global.WeatherWidget = WeatherWidget;
}

function enable() {
    widgetManager = new WidgetManager();
    widgetManager.loadPositions();

    // If no widgets are saved, create some defaults for demonstration
    if (widgetManager.widgets.length === 0) {
        widgetManager.createWidget('clock', 100, 100);
        widgetManager.createWidget('calendar', 300, 100);
        widgetManager.createWidget('music', 100, 300);
        widgetManager.createWidget('control', 300, 300);
        widgetManager.createWidget('weather', 500, 200);
        widgetManager.savePositions();
    }

    // Listen for settings changes
    widgetManager.settings.connect('changed::widget-snap-grid', () => {
        // Update existing widgets? The snap grid is used during drag, so no need to update existing positions.
    });
}

function disable() {
    if (widgetManager) {
        widgetManager.savePositions();
        widgetManager = null;
    }
}

class WidgetManager {
    constructor() {
        this.widgets = [];
        this.settings = null;
        this._initSettings();
    }

    _initSettings() {
        let schemaSource = Gio.SettingsSchemaSource.new_from_directory(
            Me.dir.get_child('schemas').get_path(),
            Gio.SettingsSchemaSource.get_default(),
            false
        );
        let schema = schemaSource.lookup('org.gnome.shell.extensions.widgy', true);
        if (!schema) {
            throw new Error('Schema org.gnome.shell.extensions.widgy not found');
        }
        this.settings = new Gio.Settings({ settings_schema: schema });
    }

    createWidget(type, x, y) {
        let WidgetClass;
        switch (type) {
            case 'clock':
                WidgetClass = global.ClockWidget;
                break;
            case 'calendar':
                WidgetClass = global.CalendarWidget;
                break;
            case 'music':
                WidgetClass = global.MusicWidget;
                break;
            case 'control':
                WidgetClass = global.ControlWidget;
                break;
            case 'weather':
                WidgetClass = global.WeatherWidget;
                break;
            default:
                throw new Error(`Unknown widget type: ${type}`);
        }
        if (!WidgetClass) {
            throw new Error(`Widget class for ${type} not found`);
        }
        let widget = new WidgetClass(this.settings);
        widget.setPosition(x, y);
        this.widgets.push(widget);
        Main.uiGroup.add_actor(widget.actor);
        return widget;
    }

    removeWidget(widget) {
        let index = this.widgets.indexOf(widget);
        if (index !== -1) {
            this.widgets.splice(index, 1);
            widget.destroy();
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
        this.settings.set_value('widget-positions', new Gio.Variant('aa(ii)', positions.map(p => [p.type, p.x, p.y])));
    }

    loadPositions() {
        let positions = this.settings.get_value('widget-positions').deep_unpack();
        for (let pos of positions) {
            let [type, x, y] = pos;
            this.createWidget(type, x, y);
        }
    }
}
