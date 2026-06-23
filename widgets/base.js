import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

export class BaseWidget {
    constructor(settings, widgetManager) {
        this.settings = settings;
        this._widgetManager = widgetManager;
        this._snapGrid = settings.get_boolean('widget-snap-grid');
        this._dragThreshold = 5;

        this.settings.connect('changed::widget-snap-grid', () => {
            this._snapGrid = this.settings.get_boolean('widget-snap-grid');
        });

        this.actor = new St.BoxLayout({
            style_class: 'widgy-widget',
            reactive: true,
            can_focus: true,
            track_hover: true
        });
        this.actor.set_name(this.constructor.name);
        this._initEvents();
    }

    _initEvents() {
        let dragStartX = 0, dragStartY = 0;
        let dragRegistered = false;

        this._pressId = this.actor.connect('button-press-event', (actor, event) => {
            const button = event.get_button();
            
            if (button === 1) {
                [dragStartX, dragStartY] = event.get_coords();
                
                if (this._widgetManager.registerDrag(this, event)) {
                    dragRegistered = true;
                }
                return Clutter.EVENT_STOP;
            }
            
            if (button === 3) {
                this._showContextMenu(event);
                return Clutter.EVENT_STOP;
            }
            
            return Clutter.EVENT_PROPAGATE;
        });

        this._releaseId = this.actor.connect('button-release-event', (actor, event) => {
            if (event.get_button() === 1 && dragRegistered) {
                this._widgetManager.unregisterDrag(this);
                dragRegistered = false;
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
    }

    _showContextMenu(event) {
        if (this._contextMenu) {
            this._contextMenu.actor.get_parent()?.remove_child(this._contextMenu.actor);
            this._contextMenu.destroy();
            this._contextMenu = null;
        }

        let menu = new PopupMenu.PopupMenu(this.actor, 0.5, St.Side.BOTTOM);
        let removeItem = new PopupMenu.PopupMenuItem(_("Remove Widget"));
        removeItem.connect('activate', () => {
            if (this.onRemove) {
                this.onRemove(this);
            }
            menu.close();
        });
        menu.addMenuItem(removeItem);
        Main.layoutManager._backgroundGroup.add_child(menu.actor);
        menu.open(true);

        this._contextMenu = menu;
    }

    setPosition(x, y) {
        this.actor.set_position(x, y);
    }

    getPosition() {
        return [this.actor.get_x(), this.actor.get_y()];
    }

    destroy() {
        // Disconnect actor-level signal handlers
        if (this._pressId) {
            this.actor.disconnect(this._pressId);
            this._pressId = 0;
        }
        if (this._releaseId) {
            this.actor.disconnect(this._releaseId);
            this._releaseId = 0;
        }

        // Unregister from widget manager drag
        if (this._widgetManager) {
            this._widgetManager.unregisterDrag(this);
        }

        // Destroy cached context menu to prevent leaks
        if (this._contextMenu) {
            this._contextMenu.destroy();
            this._contextMenu = null;
        }

        this.actor.destroy();
    }
}