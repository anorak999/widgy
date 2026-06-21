const St = imports.gi.St;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;

const Gettext = imports.gettext.domain('widgy');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Settings = imports.ui.settings;

function buildPrefsWidget() {
    let frame = new St.BoxLayout({ vertical: true, spacing: 12 });

    // Theme selector
    let themeBox = new St.BoxLayout({ vertical: false, spacing: 6 });
    themeBox.add_child(new St.Label({ text: _('Theme:'), y_align: Clutter.ActorAlign.CENTER }));
    let themeCombo = new St.ComboBox();
    themeCombo.add_text(_('Auto'));
    themeCombo.add_text(_('Dark'));
    themeCombo.add_text(_('Light'));
    themeCombo.connect('changed', () => {
        let index = themeCombo.get_selected_index();
        let value = ['auto', 'dark', 'light'][index];
        Me.settings.set_string('theme', value);
    });
    themeBox.add_child(themeCombo, { expand: true });
    frame.add_child(themeBox);

    // Global opacity slider
    let opacityBox = new St.BoxLayout({ vertical: false, spacing: 6 });
    opacityBox.add_child(new St.Label({ text: _('Global Opacity:'), y_align: Clutter.ActorAlign.CENTER }));
    let opacityScale = new St.Scale({
        style_class: 'opacity-scale',
        range: [0.2, 1.0],
        value: 0.8
    });
    opacityScale.connect('value-changed', () => {
        let value = opacityScale.get_value();
        Me.settings.set_double('opacity', value);
        // Apply to all widgets? We'll just store the setting and widgets can read it.
    });
    opacityBox.add_child(opacityScale, { expand: true });
    frame.add_child(opacityBox);

    // Widget snapping grid
    let snapBox = new St.BoxLayout({ vertical: false, spacing: 6 });
    snapBox.add_child(new St.Label({ text: _('Snap to grid:'), y_align: Clutter.ActorAlign.CENTER }));
    let snapSwitch = new St.Switch();
    snapSwitch.connect('notify::active', () => {
        Me.settings.set_boolean('widget-snap-grid', snapSwitch.active);
    });
    snapBox.add_child(snapSwitch, { expand: true });
    frame.add_child(snapBox);

    // Weather location
    let locationBox = new St.BoxLayout({ vertical: false, spacing: 6 });
    locationBox.add_child(new St.Label({ text: _('Weather Location (lat,lon) or "auto":'), y_align: Clutter.ActorAlign.CENTER }));
    let locationEntry = new St.Entry({
        placeholder_text: _('e.g., 40.7128,-74.0060 or auto')
    });
    locationEntry.connect('activate', () => {
        Me.settings.set_string('weather-location', locationEntry.get_text());
    });
    locationBox.add_child(locationEntry, { expand: true });
    frame.add_child(locationBox);

    // Load current settings
    let settings = Me.getSettings();
    themeCombo.set_selected_index(['auto', 'dark', 'light'].indexOf(settings.get_string('theme')));
    opacityScale.set_value(settings.get_double('opacity'));
    snapSwitch.set_active(settings.get_boolean('widget-snap-grid'));
    locationEntry.set_text(settings.get_string('weather-location'));

    return frame;
}
