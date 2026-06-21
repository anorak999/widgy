# Widgy - GNOME Shell Extension

A desktop widget library with glassmorphic widgets inspired by macOS Sonoma.

![Widgy Screenshot](screenshot.png)

## Features

- **Glassmorphism style** widgets with blur and transparency
- **Draggable and resizable** widgets (with optional grid snapping)
- **Persistent positioning** via GSettings
- **Widget library** including:
  - 🕒 Clock (digital)
  - 📅 Calendar (date and events)
  - 🎵 Music player (MPRIS integration)
  - 🎛️ Control center (quick toggles)
  - 🌤️ Weather (Open-Meteo API)
- **Easy to extend** with new widgets
- **Theme support** (auto, dark, light)
- **Global opacity control**
- **Weather location** configurable (latitude,longitude or "auto")

## Installation

### From Source

1. Clone or copy this directory to `~/.local/share/gnome-shell/extensions/widgy@anorak.example.com`
   ```bash
   git clone https://github.com/anorak/widgy.git ~/.local/share/gnome-shell/extensions/widgy@anorak.example.com
   ```
2. Ensure the metadata.json UUID matches the directory name.
3. Compile the schemas:
   ```bash
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/widgy@anorak.example.com/schemas/
   ```
4. Enable the extension via:
   - GNOME Extensions app
   - Or run: `gnome-extensions enable widgy@anorak.example.com`

### From extensions.gnome.org (when published)

Visit the Widgy page on [extensions.gnome.org](https://extensions.gnome.org/) and toggle the switch.

## Usage

- Right-click on a widget to remove it.
- Drag widgets to reposition them (with optional grid snapping).
- Access preferences via the Extensions app or by running:
  ```bash
  gnome-extensions prefs widgy@anorak.example.com
  ```

## Customization

- Adjust theme, opacity, and snap-to-grid in preferences.
- Set weather location in preferences (latitude,longitude or "auto" for default).

## Development

To add a new widget:

1. Create a new file in `widgets/` (e.g., `mywidget.js`)
2. Extend the `BaseWidget` class from `widgets/base.js`
3. Register the widget type in `extension.js` in the `createWidget` function.
4. Add any necessary settings in the schema if needed.

### Widget Structure

Each widget should:
- Extend `BaseWidget`
- Set `this.type` in the constructor
- Create UI elements and add them to `this.actor`
- Implement a `destroy()` method that cleans up any timeouts or connections
- Optionally implement update methods called via `Mainloop.timeout_add_seconds`

See existing widgets (`clock.js`, `calendar.js`, etc.) for examples.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure to update tests as appropriate.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by macOS Sonoma's widget design
- Uses [Open-Meteo](https://open-meteo.com/) for weather data
- Built with GNOME Shell's JavaScript API