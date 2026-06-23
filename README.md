# Widgy - GNOME Shell Extension

A desktop widget library with glassmorphic widgets inspired by macOS Sonoma.

![Widgy Screenshot](screenshot.png)

## Features

- **Glassmorphism style** widgets with blur and transparency
- **Draggable and resizable** widgets (with optional grid snapping)
- **Persistent positioning** via GSettings
- **Widget library** including:
  - 🕒 Clock (digital) - Small (170×170 pt)
  - 📅 Calendar (date and events) - Large (329×345 pt)
  - 🎵 Music player (MPRIS integration with dynamic player detection) - Medium (329×155 pt)
  - 🎛️ Control center (quick toggles for WiFi, Bluetooth, Night Light, Do Not Disturb, Dark Mode) - Medium (329×155 pt)
  - 🌤️ Weather (Open-Meteo API using libsoup 3.0) - Small (170×170 pt)
- **macOS Sonoma WidgetKit sizing**:
  - Small: 170×170 pt (2×2 grid)
  - Medium: 329×155 pt (4×2 grid)
  - Large: 329×345 pt (4×4 grid)
  - Extra Large: 715×345 pt (desktop only)
- **Modern Architecture** built on ESM (ECMAScript Modules) for GNOME Shell 45 to 48+
- **macOS Sonoma design system**:
  - Typography: SF Pro scale (26pt large-title down to 10pt caption2)
  - Colors: Semantic tokens with light/dark mode support
  - Corner radius: 20pt continuous curvature (squircle)
  - Spacing: 8pt grid, 16pt safe margins
  - Shadows: System drop shadow (0 4px 24px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.16))
- **Theme support** (auto, dark, light)
- **Global opacity control**
- **Weather location** configurable (latitude,longitude or "auto")
- **System menu integration**: Panel button with Control Center toggles, Music player, Notifications, and Extension Settings

## Installation

### From Source

The easiest way to install and compile the extension is using the provided `Makefile`:

1. Clone this repository:
   ```bash
   git clone https://github.com/anorak999/widgy.git
   cd widgy
   ```
2. Build and install:
   ```bash
   make install
   ```
   This will automatically zip the extension, install it to `~/.local/share/gnome-shell/extensions/`, compile the GSettings schemas, and attempt to enable it.

3. **Restart GNOME Shell**:
   GNOME Shell must be restarted for it to register the new extension files:
   - **Wayland**: Log out and log back in.
   - **X11**: Press `Alt + F2`, type `r`, and press `Enter`.

4. Enable the extension (if not already enabled) using the **Extensions** (or **Extension Manager**) app, or run:
   ```bash
   gnome-extensions enable widgy@anorak.example.com
   ```

### Uninstalling

To uninstall the extension, simply run:
```bash
make uninstall
```

## Usage

- Right-click on a widget to bring up the context menu and remove it.
- Drag widgets to reposition them (with optional grid snapping).
- Access the system menu via the Widgy icon in the top panel:
  - **Control Center**: WiFi, Bluetooth, Night Light, Do Not Disturb, Dark Mode toggles
  - **Music Player**: Now playing track info and playback controls
  - **Notifications**: Clear all notifications, toggle Do Not Disturb
  - **Extension Settings**: Open preferences dialog
- Access preferences via the GNOME Extensions/Extension Manager app or by running:
  ```bash
  gnome-extensions prefs widgy@anorak.example.com
  ```

## Customization

- Adjust theme, opacity, and snap-to-grid in the modern libadwaita preferences panel.
- Set weather location in preferences (latitude,longitude or "auto" for default).

## Development

Widgy is fully ported to GNOME Shell's modern ESM (ECMAScript Modules) architecture (GNOME 45+).

### Widget Sizes

All widgets follow macOS Sonoma WidgetKit sizing:
- **Small**: 170×170 pt (2×2 grid) — Clock, Weather
- **Medium**: 329×155 pt (4×2 grid) — Music, Control Center
- **Large**: 329×345 pt (4×4 grid) — Calendar
- **Extra Large**: 715×345 pt (desktop only) — Dashboard layouts

### To add a new widget:

1. Create a new file in `widgets/` (e.g., `mywidget.js`).
2. Implement your widget class extending `BaseWidget` from `./base.js`, and export it:
   ```javascript
   import St from 'gi://St';
   import { BaseWidget } from './base.js';

   export class MyWidget extends BaseWidget {
       constructor(settings, widgetManager, sizeKey = 'SMALL') {
           super(settings, widgetManager, sizeKey);
           this.type = 'mywidget';
           
           let label = new St.Label({ text: 'Hello World!' });
           this.actor.add_child(label);
       }
   }
   ```
3. Import and register the widget in `extension.js` inside the `createWidget` factory:
   ```javascript
   import { MyWidget } from './widgets/mywidget.js';
   // ...
   switch (type) {
       case 'mywidget':
           WidgetClass = MyWidget;
           break;
   }
   ```

### Preferences (prefs.js)

Extension preferences are built using **Libadwaita** and GTK4 preference rows (e.g., `Adw.ComboRow`, `Adw.ActionRow`, `Adw.SwitchRow`, `Adw.EntryRow`), ensuring a native GNOME settings look and feel.

## System Menu Integration

The Widgy extension now includes a system menu button in the top panel:

- **Control Center**: 5 toggle buttons (Wi-Fi, Bluetooth, Night Light, Do Not Disturb, Dark Mode) with live status indicators
- **Music Player**: Now playing track info with album art, artist, and playback controls (Previous/PlayPause/Next)
- **Notifications**: Clear All notifications button and Toggle Do Not Disturb
- **Extension Settings**: Opens the preferences dialog via `gnome-extensions prefs`

The system menu follows macOS Control Center design with:
- Clean, organized sections with headers
- Live status indicators (green/red dots)
- Consistent styling with the desktop widgets
- Quick access to commonly used controls without opening desktop widgets

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v1.0.4 (macOS Sonoma Redesign)

- **Redesigned:** Complete macOS Sonoma widget design system:
  - Widget sizes: Small (170×170), Medium (329×155), Large (329×345), Extra Large (715×345)
  - Typography: SF Pro scale (26pt large-title down to 10pt caption2)
  - Colors: Semantic tokens with light/dark mode support
  - Corner radius: 20pt continuous curvature (squircle)
  - Spacing: 8pt grid, 16pt safe margins
  - Shadows: System drop shadow (0 4px 24px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.16))
- **Added:** System menu integration with panel button:
  - Control Center toggles (Wi-Fi, Bluetooth, Night Light, Do Not Disturb, Dark Mode)
  - Music player (Now playing with album art and playback controls)
  - Notifications (Clear All, Toggle Do Not Disturb)
  - Extension Settings
- **Fixed:** `Gio.Variant` → `GLib.Variant` for GNOME 46+ compatibility
- **Updated:** All widgets with macOS Sonoma design tokens and proper sizing
- **Updated:** Preferences dialog with modern libadwaita layout

### v1.0.3

- **Fixed:** Widgets now render below application windows by attaching to `Main.layoutManager._backgroundGroup` instead of `Main.uiGroup`
- **Fixed:** Proper cleanup of widget actors from background group in `disable()` to prevent memory leaks
- **Fixed:** Preferences dialog GTK import — corrected to use `Gtk?version=4.0` for GNOME 45+ ESM compatibility

### v1.0.2

- **Fixed:** Drag no longer activates without a button held — motion handler now checks `event.get_state() & Clutter.ModifierType.BUTTON1_MASK`
- **Fixed:** Drag no longer loses events when cursor leaves widget bounds — motion captured on `global.stage` instead of the actor
- **Fixed:** Coordinate drift during drag — switched from actor-relative `get_x()`/`get_y()` to stage-relative `get_coords()`
- **Fixed:** Context menu memory leak — PopupMenu instance is now cached and destroyed before creating a new one
- **Fixed:** Stage motion handler leak on extension disable — properly disconnected in `destroy()`
- **Style:** `_initContextMenu()` now uses `Clutter.EVENT_STOP`/`Clutter.EVENT_PROPAGATE` for consistency with drag code
- **Fixed:** Preferences dialog weather location entry — replaced invalid `Adw.Entry` with `Gtk.Entry` for GTK 4 compatibility

### v1.0.1

- **Fixed:** Replaced invalid `pointer-motion-event` signal with correct `motion-event` signal for widget drag functionality (resolved runtime error on `StBoxLayout`)
- **Audited:** Verified all signal connections across the codebase for correctness
- **Reviewed:** Identified and documented drag implementation improvements (button state tracking, stage-level motion capture)

## Acknowledgments

- Inspired by macOS Sonoma's widget design
- Uses [Open-Meteo](https://open-meteo.com/) for weather data
- Built with GNOME Shell's modern JavaScript API