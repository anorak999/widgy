# Fix for "No property subtitle on AdwEntryRow" Error

## Problem
The Widgy GNOME Shell extension was encountering the following error when trying to open the preferences dialog:
```
Error: No property subtitle on AdwEntryRow
```

This occurred in `prefs.js` at line 67 where the code attempted to create an `Adw.EntryRow` with a `subtitle` property.

## Root Cause
`Adw.EntryRow` (from libadwaita) does not have a `subtitle` property. Only `Adw.ActionRow` and its subclasses (like `Adw.SwitchRow`, `Adw.ComboRow`) support the subtitle property for displaying secondary text below the main title.

## Solution
Replaced the invalid `Adw.EntryRow` with subtitle with a proper `Adw.ActionRow` that contains an embedded `Adw.Entry` widget:

**Before (lines 66-75):**
```javascript
// 4. Weather Location Setting
const locationRow = new Adw.EntryRow({
    title: _('Weather Location'),
    subtitle: _('Latitude,longitude (e.g. 40.7128,-74.0060) or "auto"')
});
locationRow.text = settings.get_string('weather-location');
locationRow.connect('notify::text', () => {
    settings.set_string('weather-location', locationRow.text);
});
group.add(locationRow);
```

**After (lines 66-79):**
```javascript
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
```

## Changes Made
1. Changed from `Adw.EntryRow` to `Adw.ActionRow` (which supports subtitle)
2. Created a `Gtk.Entry` widget to handle the text input (since `Adw.Entry` doesn't exist in GTK 4)
3. Added the entry as a suffix to the action row
4. Set `set_hexpand(true)` on the entry to make it expand and fill available space
5. Maintained the same functionality for getting/setting the weather-location setting

## Verification
- The fix follows the same pattern used elsewhere in the file for the opacity setting (lines 41-53)
- All other uses of subtitle in the file are on widgets that properly support it:
  - `Adw.ComboRow` (lines 21-27) ✓
  - `Adw.ActionRow` (lines 41-44) ✓
  - `Adw.SwitchRow` (lines 56-58) ✓ (inherits from ActionRow)
- The weather-location setting continues to work as expected, storing a string value
- Uses `Gtk.Entry` which is the correct widget for text input in GTK 4 (used by GNOME Shell 48+)

This resolves the runtime error while maintaining the intended UI appearance and functionality.