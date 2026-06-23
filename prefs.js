import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk?version=4.0';

export default class WidgyPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // Create page
        const page = new Adw.PreferencesPage();
        window.add(page);

        // Create group
        const group = new Adw.PreferencesGroup({
            title: _('General Settings'),
            description: _('Configure Widgy preferences')
        });
        page.add(group);

        // 1. Theme Setting
        const themeRow = new Adw.ComboRow({
            title: _('Preferred Theme'),
            subtitle: _('Choose widget theme color'),
            model: new Gtk.StringList({
                strings: [_('Auto'), _('Dark'), _('Light')]
            })
        });
        
        const themeChoices = ['auto', 'dark', 'light'];
        let currentTheme = settings.get_string('theme');
        let index = themeChoices.indexOf(currentTheme);
        if (index !== -1) {
            themeRow.selected = index;
        }
        themeRow.connect('notify::selected', () => {
            settings.set_string('theme', themeChoices[themeRow.selected]);
        });
        group.add(themeRow);

        // 2. Opacity Setting
        const opacityRow = new Adw.ActionRow({
            title: _('Global Opacity'),
            subtitle: _('Base opacity for all widgets')
        });
        const opacityScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.2, 1.0, 0.05);
        opacityScale.set_draw_value(true);
        opacityScale.set_value(settings.get_double('opacity'));
        opacityScale.set_size_request(200, -1);
        opacityScale.connect('value-changed', () => {
            settings.set_double('opacity', opacityScale.get_value());
        });
        opacityRow.add_suffix(opacityScale);
        group.add(opacityRow);

        // 3. Grid Snapping Setting
        const snapRow = new Adw.SwitchRow({
            title: _('Snap widgets to grid'),
            subtitle: _('Snap widgets to a 20px grid when dragged')
        });
        snapRow.active = settings.get_boolean('widget-snap-grid');
        snapRow.connect('notify::active', () => {
            settings.set_boolean('widget-snap-grid', snapRow.active);
        });
        group.add(snapRow);

        // 4. Weather Location Setting
        const locationRow = new Adw.ActionRow({
            title: _('Weather Location'),
            subtitle: _('Latitude,longitude (e.g. 40.7128,-74.0060) or "auto"')
        });
        const locationEntry = new Gtk.Entry({
            text: settings.get_string('weather-location')
        });
        locationEntry.set_hexpand(true);
        locationEntry.connect('notify::text', () => {
            settings.set_string('weather-location', locationEntry.text);
        });
        locationRow.add_suffix(locationEntry);
        group.add(locationRow);
    }
}
