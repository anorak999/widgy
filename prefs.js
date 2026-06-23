import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk?version=4.0';
import St from 'gi://St';

export default class WidgyPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage();
        window.add(page);

        // ─── Appearance ───────────────────────────────────
        const appearanceGroup = new Adw.PreferencesGroup({
            title: _('Appearance'),
            description: _('Widget theme and visual style'),
        });
        page.add(appearanceGroup);

        const themeRow = new Adw.ComboRow({
            title: _('Theme'),
            subtitle: _('Follow system, or force dark/light mode'),
            model: new Gtk.StringList({
                strings: [_('Auto'), _('Dark'), _('Light')]
            })
        });
        const themeChoices = ['auto', 'dark', 'light'];
        let currentTheme = settings.get_string('theme');
        let index = themeChoices.indexOf(currentTheme);
        if (index !== -1) themeRow.selected = index;
        themeRow.connect('notify::selected', () => {
            settings.set_string('theme', themeChoices[themeRow.selected]);
        });
        appearanceGroup.add(themeRow);

        const opacityRow = new Adw.ActionRow({
            title: _('Opacity'),
            subtitle: _('Widget background opacity (100% = fully opaque)')
        });
        const opacityScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 20, 100, 5);
        opacityScale.set_draw_value(true);
        opacityScale.set_value(settings.get_double('opacity') * 100);
        opacityScale.set_size_request(200, -1);
        opacityScale.connect('value-changed', () => {
            settings.set_double('opacity', opacityScale.get_value() / 100);
        });
        opacityRow.add_suffix(opacityScale);
        appearanceGroup.add(opacityRow);

        // ─── Behavior ─────────────────────────────────────
        const behaviorGroup = new Adw.PreferencesGroup({
            title: _('Behavior'),
            description: _('Widget interaction and layout'),
        });
        page.add(behaviorGroup);

        const snapRow = new Adw.SwitchRow({
            title: _('Snap to Grid'),
            subtitle: _('Align widgets to a 20px grid when dragging')
        });
        snapRow.active = settings.get_boolean('widget-snap-grid');
        snapRow.connect('notify::active', () => {
            settings.set_boolean('widget-snap-grid', snapRow.active);
        });
        behaviorGroup.add(snapRow);

        // ─── Weather ──────────────────────────────────────
        const weatherGroup = new Adw.PreferencesGroup({
            title: _('Weather'),
            description: _('Configure weather widget location'),
        });
        page.add(weatherGroup);

        const locationRow = new Adw.ActionRow({
            title: _('Location'),
            subtitle: _('Latitude,longitude (e.g. 40.7128,-74.0060) or "auto"')
        });
        const locationEntry = new Gtk.Entry({
            text: settings.get_string('weather-location'),
            placeholder_text: 'auto',
        });
        locationEntry.set_hexpand(true);
        locationEntry.connect('notify::text', () => {
            settings.set_string('weather-location', locationEntry.text);
        });
        locationRow.add_suffix(locationEntry);
        weatherGroup.add(locationRow);

        // ─── Widgets ──────────────────────────────────────
        const widgetsGroup = new Adw.PreferencesGroup({
            title: _('Widgets'),
            description: _('Available widget sizes (macOS Sonoma spec)'),
        });
        page.add(widgetsGroup);

        const sizes = [
            { name: _('Clock'),    size: _('Small — 170×170 pt'), icon: 'weather-clear-symbolic' },
            { name: _('Weather'),  size: _('Small — 170×170 pt'), icon: 'weather-overcast-symbolic' },
            { name: _('Music'),    size: _('Medium — 329×155 pt'), icon: 'multimedia-audio-player-symbolic' },
            { name: _('Controls'), size: _('Medium — 329×155 pt'), icon: 'preferences-other-symbolic' },
            { name: _('Calendar'), size: _('Large — 329×345 pt'), icon: 'x-office-calendar-symbolic' },
        ];

        for (let widget of sizes) {
            let row = new Adw.ActionRow({
                title: widget.name,
                subtitle: widget.size,
            });
            row.add_prefix(new St.Icon({ icon_name: widget.icon, style: 'icon-size: 16px; margin-right: 8px;' }));
            // Row is informational
            row.set_activatable(false);
            widgetsGroup.add(row);
        }
    }
}
