import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';
import { BaseWidget } from './base.js';

export class WeatherWidget extends BaseWidget {
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
        // Update weather every 30 minutes
        this._weatherId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1800, () => {
            this._updateWeather();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _updateWeather() {
        if (this._location === 'auto') {
            this._fetchWeather(40.7128, -74.0060); // Default: New York
        } else {
            let parts = this._location.split(',').map(s => parseFloat(s.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                this._fetchWeather(parts[0], parts[1]);
            } else {
                this._fetchWeather(40.7128, -74.0060);
            }
        }
    }

    _fetchWeather(lat, lon) {
        let url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius&windspeed_unit=kmh&precipitation_unit=mm`;
        let session = new Soup.Session();
        let message = Soup.Message.new('GET', url);
        
        session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
            try {
                let bytes = session.send_and_read_finish(result);
                let decoder = new TextDecoder('utf-8');
                let responseText = decoder.decode(bytes.toArray());
                let data = JSON.parse(responseText);
                this._processWeatherData(data);
            } catch (e) {
                console.error('Failed to fetch/parse weather data: ' + e);
            }
        });
    }

    _processWeatherData(data) {
        if (!data.current_weather) {
            return;
        }
        let weather = data.current_weather;
        this._temperature = Math.round(weather.temperature);
        this._condition = weather.weathercode;
        this._updateDisplay();
    }

    _updateDisplay() {
        if (this._temperature !== null) {
            this._tempLabel.set_text(`${this._temperature}°`);
        }
        
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
            GLib.source_remove(this._weatherId);
            this._weatherId = null;
        }
        super.destroy();
    }
}