const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const Soup = imports.gi.Soup;

const BaseWidget = require('./base.js');

const WeatherWidget = class WeatherWidget extends BaseWidget {
    constructor(settings) {
        super(settings);
        this.type = 'weather';

        this._location = settings.get_string('weather-location') || 'auto';
        this._temperature = null;
        this._condition = '';
        this._iconName = 'weather-clear-symbolic';

        this._icon = new St.Icon({
            style_class: 'widgy-widget-weather-icon',
            gicon: Gio.ThemedIcon.new(this._iconName)
        });
        this.actor.add_child(this._icon);

        this._tempLabel = new St.Label({
            style_class: 'widgy-widget-temperature',
            text: '--°'
        });
        this.actor.add_child(this._tempLabel);

        this._conditionLabel = new St.Label({
            style_class: 'widgy-widget-condition',
            text: '--'
        });
        this.actor.add_child(this._conditionLabel);

        this._updateWeather();
        this._weatherId = Mainloop.timeout_add_seconds(1800, Lang.bind(this, this._updateWeather)); // 30 minutes
    }

    _updateWeather() {
        if (this._location === 'auto') {
            // For simplicity, we'll use a fixed location (e.g., New York) or try to get from GeoClue.
            // We'll use a fixed location for now.
            this._fetchWeather(40.7128, -74.0060); // New York
        } else {
            // Try to parse as "lat,lon"
            let parts = this._location.split(',').map(s => parseFloat(s.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                this._fetchWeather(parts[0], parts[1]);
            } else {
                // Treat as city name and use a geocoding API? For simplicity, we'll use a fixed location.
                this._fetchWeather(40.7128, -74.0060);
            }
        }
        return GObject.SOURCE_CONTINUE;
    }

    _fetchWeather(lat, lon) {
        let url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius&windspeed_unit=kmh&precipitation_unit=mm`;
        let session = new Soup.SessionAsync();
        let message = Soup.Message.new('GET', url);
        session.queue_message(message, Lang.bind(this, (session, message) => {
            if (message.status_code !== 200) {
                log('Weather request failed: ' + message.status_code);
                return;
            }
            try {
                let data = JSON.parse(message.response_body.data);
                this._processWeatherData(data);
            } catch (e) {
                log('Failed to parse weather data: ' + e);
            }
        }));
    }

    _processWeatherData(data) {
        if (!data.current_weather) {
            return;
        }
        let weather = data.current_weather;
        this._temperature = Math.round(weather.temperature);
        this._condition = weather.weathercode; // We'll map to a condition and icon
        this._updateDisplay();
    }

    _updateDisplay() {
        this._tempLabel.set_text(`${this._temperature}°`);
        // Map weather code to icon and condition text
        // Based on WMO weather codes (https://open-meteo.com/en/docs)
        let code = this._condition;
        let iconName = 'weather-clear-symbolic';
        let conditionText = 'Clear';
        switch (code) {
            case 0: iconName = 'weather-clear-symbolic'; conditionText = 'Clear'; break;
            case 1: iconName = 'weather-few-clouds-symbolic'; conditionText = 'Mainly clear'; break;
            case 2: iconName = 'weather-overcast-symbolic'; conditionText = 'Partly cloudy'; break;
            case 3: iconName = 'weather-overcast-symbolic'; conditionText = 'Overcast'; break;
            case 45: case 48: iconName = 'weather-fog-symbolic'; conditionText = 'Fog'; break;
            case 51: case 53: case 55: iconName = 'weather-drizzle-symbolic'; conditionText = 'Drizzle'; break;
            case 56: case 57: iconName = 'weather-freezing-rain-symbolic'; conditionText = 'Freezing drizzle'; break;
            case 61: case 63: case 65: iconName = 'weather-showers-scattered-symbolic'; conditionText = 'Rain'; break;
            case 66: case 67: iconName = 'weather-freezing-rain-symbolic'; conditionText = 'Freezing rain'; break;
            case 71: case 73: case 75: iconName = 'weather-snow-symbolic'; conditionText = 'Snow'; break;
            case 77: iconName = 'weather-snow-symbolic'; conditionText = 'Snow grains'; break;
            case 80: case 81: case 82: iconName = 'weather-showers-symbolic'; conditionText = 'Rain showers'; break;
            case 85: case 86: iconName = 'weather-snow-symbolic'; conditionText = 'Snow showers'; break;
            case 95: case 96: case 99: iconName = 'weather-storm-symbolic'; conditionText = 'Thunderstorm'; break;
            default: iconName = 'weather-clear-symbolic'; conditionText = 'Unknown'; break;
        }
        this._icon.set_gicon(Gio.ThemedIcon.new(iconName));
        this._conditionLabel.set_text(conditionText);
    }

    destroy() {
        if (this._weatherId) {
            Mainloop.source_remove(this._weatherId);
        }
        super.destroy();
    }
};

if (typeof module !== 'undefined') {
    module.exports = WeatherWidget;
}