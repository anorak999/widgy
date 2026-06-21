const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;

const BaseWidget = class BaseWidget {
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

        let drag = Clutter.DragAction.new();
        drag.set_button(1); // left mouse button
        drag.connect('drag-begin', (action, x, y) => {
            this._dragStartX = x;
            this._dragStartY = y;
            this._actorStartX = this.actor.get_x();
            this._actorStartY = this.actor.get_y();
        });
        drag.connect('drag-update', (action, x, y, state) => {
            let dx = x - this._dragStartX;
            let dy = y - this._dragStartY;
            let newX = Math.round(this._actorStartX + dx);
            let newY = Math.round(this._actorStartY + dy);
            // Apply grid snapping if enabled
            if (this.settings.get_boolean('widget-snap-grid')) {
                const snapSize = 20; // pixels
                newX = Math.round(newX / snapSize) * snapSize;
                newY = Math.round(newY / snapSize) * snapSize;
            }
            this.actor.set_position(newX, newY);
        });
        this.actor.add_action(drag);
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
        let menu = new PopupMenu.PopupMenu();
        let removeItem = new PopupMenu.PopupMenuItem(_("Remove Widget"));
        removeItem.connect('activate', () => {
            if (this._onRemove) {
                this._onRemove(this);
            }
            menu.close();
        });
        menu.addMenuItem(removeItem);
        menu.open({
            point: event.get_coords(),
            anchor: Clutter.Gravity.SOUTH_WEST,
            animate: true
        });
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
};

if (typeof module !== 'undefined') {
    module.exports = BaseWidget;
}