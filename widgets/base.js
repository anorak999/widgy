import St from 'gi://St';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

export class BaseWidget {
    constructor(settings) {
        this.settings = settings;
        this.actor = new St.BoxLayout({ style_class: 'widgy-widget' });
        this.actor.set_name(this.constructor.name);
        this._initDrag();
        this._initContextMenu();
    }

    _initDrag() {
        this.actor.set_reactive(true);
        this.actor.set_can_focus(true);
        this.actor.set_track_hover(true);

        let dragged = false;
        let dragStartX = 0, dragStartY = 0;
        let actorStartX = 0, actorStartY = 0;

        this.actor.connect('button-press-event', (actor, event) => {
            if (event.get_button() === 1) { // left mouse button
                dragged = false;
                dragStartX = event.get_x();
                dragStartY = event.get_y();
                [actorStartX, actorStartY] = this.actor.get_position();
                return true;
            }
            return false;
        });

        this.actor.connect('motion-event', (actor, event) => {
            if (dragged) {
                let x = event.get_x();
                let y = event.get_y();
                let dx = x - dragStartX;
                let dy = y - dragStartY;
                let newX = Math.round(actorStartX + dx);
                let newY = Math.round(actorStartY + dy);
                // Apply grid snapping if enabled
                if (this.settings.get_boolean('widget-snap-grid')) {
                    const snapSize = 20; // pixels
                    newX = Math.round(newX / snapSize) * snapSize;
                    newY = Math.round(newY / snapSize) * snapSize;
                }
                this.actor.set_position(newX, newY);
                return true;
            } else {
                // Check if we have moved enough to start dragging
                let x = event.get_x();
                let y = event.get_y();
                let dx = Math.abs(x - dragStartX);
                let dy = Math.abs(y - dragStartY);
                if (dx > 5 || dy > 5) {
                    dragged = true;
                }
            }
            return false;
        });

        this.actor.connect('button-release-event', (actor, event) => {
            if (event.get_button() === 1 && dragged) {
                dragged = false;
                return true;
            }
            return false;
        });
    }

    _initContextMenu() {
        this.actor.connect('button-press-event', (actor, event) => {
            if (event.get_button() === 3) { // right click
                this._showContextMenu(event);
                return true;
            }
            return false;
        });
    }

    _showContextMenu(event) {
        let menu = new PopupMenu.PopupMenu(this.actor, 0.5, St.Side.BOTTOM);
        let removeItem = new PopupMenu.PopupMenuItem(_("Remove Widget"));
        removeItem.connect('activate', () => {
            if (this.onRemove) {
                this.onRemove(this);
            }
            menu.close();
        });
        menu.addMenuItem(removeItem);
        Main.uiGroup.add_actor(menu.actor);
        menu.open(true);
    }

    setPosition(x, y) {
        this.actor.set_position(x, y);
    }

    getPosition() {
        return [this.actor.get_x(), this.actor.get_y()];
    }

    destroy() {
        this.actor.destroy();
    }
}