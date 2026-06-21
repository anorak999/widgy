import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/extension.js';

export class BaseWidget {
    constructor(settings) {
        this.settings = settings;
        this.actor = new St.BoxLayout({
            style_class: 'widgy-widget',
            reactive: true,
            can_focus: true,
            track_hover: true
        });
        this.actor.set_name(this.constructor.name);
        this._initDrag();
        this._initContextMenu();
    }

    _initDrag() {
        this._stageMotionId = 0;
        let dragging = false;
        let dragStartX = 0, dragStartY = 0;
        let actorStartX = 0, actorStartY = 0;

        this._dragPressId = this.actor.connect('button-press-event', (actor, event) => {
            if (event.get_button() === 1) {
                dragging = false;
                [dragStartX, dragStartY] = event.get_coords();
                [actorStartX, actorStartY] = this.actor.get_position();

                // Connect stage-level motion handler to capture events outside the actor
                if (!this._stageMotionId) {
                    this._stageMotionId = global.stage.connect('motion-event', (stage, event) => {
                        // Verify button 1 is still held, not a phantom drag
                        let state = event.get_state();
                        if (!(state & Clutter.ModifierType.BUTTON1_MASK)) {
                            dragging = false;
                            return Clutter.EVENT_PROPAGATE;
                        }

                        let [x, y] = event.get_coords();

                        // Check drag threshold
                        if (!dragging) {
                            let dx = Math.abs(x - dragStartX);
                            let dy = Math.abs(y - dragStartY);
                            if (dx > 5 || dy > 5) {
                                dragging = true;
                            } else {
                                return Clutter.EVENT_PROPAGATE;
                            }
                        }

                        // Calculate new position using stage-relative delta
                        let dx = x - dragStartX;
                        let dy = y - dragStartY;
                        let newX = Math.round(actorStartX + dx);
                        let newY = Math.round(actorStartY + dy);

                        // Apply grid snapping if enabled
                        if (this.settings.get_boolean('widget-snap-grid')) {
                            const snapSize = 20;
                            newX = Math.round(newX / snapSize) * snapSize;
                            newY = Math.round(newY / snapSize) * snapSize;
                        }

                        this.actor.set_position(newX, newY);
                        return Clutter.EVENT_STOP;
                    });
                }
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this._dragReleaseId = this.actor.connect('button-release-event', (actor, event) => {
            if (event.get_button() === 1) {
                dragging = false;
                if (this._stageMotionId) {
                    global.stage.disconnect(this._stageMotionId);
                    this._stageMotionId = 0;
                }
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
    }

    _initContextMenu() {
        this.actor.connect('button-press-event', (actor, event) => {
            if (event.get_button() === 3) {
                this._showContextMenu(event);
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
    }

    _showContextMenu(event) {
        // Destroy existing menu before creating a new one to prevent memory leaks
        if (this._contextMenu) {
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
        Main.uiGroup.add_child(menu.actor);
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
        // Disconnect stage-level motion handler to prevent leaks
        if (this._stageMotionId) {
            global.stage.disconnect(this._stageMotionId);
            this._stageMotionId = 0;
        }

        // Disconnect actor-level signal handlers
        if (this._dragPressId) {
            this.actor.disconnect(this._dragPressId);
            this._dragPressId = 0;
        }
        if (this._dragReleaseId) {
            this.actor.disconnect(this._dragReleaseId);
            this._dragReleaseId = 0;
        }

        // Destroy cached context menu to prevent leaks
        if (this._contextMenu) {
            this._contextMenu.destroy();
            this._contextMenu = null;
        }

        this.actor.destroy();
    }
}