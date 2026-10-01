// SPDX-License-Identifier: GPL-2.0-or-later
//
// Week HP: a retro 2D platformer health bar in the Cinnamon panel.
// It fills up from Monday to Friday; when Friday ends, the weekly goals are complete.

const Applet = imports.ui.applet;
const Gettext = imports.gettext;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const St = imports.gi.St;

const {WORK_DAYS, getWeekProgress} = require('./weekProgress');

const UUID = 'week-hp@asterion';
// Must match the width of .week-hp-segment
const SEGMENT_WIDTH = 14;
const ICON_SIZE = 14;
const UPDATE_INTERVAL_S = 60;

Gettext.bindtextdomain(UUID, `${GLib.get_home_dir()}/.local/share/locale`);

function _(text) {
    return Gettext.dgettext(UUID, text);
}

class WeekHpApplet extends Applet.Applet {
    constructor(metadata, orientation, panelHeight, instanceId) {
        super(orientation, panelHeight, instanceId);
        this.setAllowedLayout(Applet.AllowedLayout.BOTH);

        this._dayNames = [
            // Translators: abbreviated weekday shown in the panel
            _('Mon'),
            // Translators: abbreviated weekday shown in the panel
            _('Tue'),
            // Translators: abbreviated weekday shown in the panel
            _('Wed'),
            // Translators: abbreviated weekday shown in the panel
            _('Thu'),
            // Translators: abbreviated weekday shown in the panel
            _('Fri'),
        ];

        const iconsDir = Gio.File.new_for_path(metadata.path).get_child('icons');
        this._heartIcon = new Gio.FileIcon({file: iconsDir.get_child('heart-symbolic.svg')});
        this._starIcon = new Gio.FileIcon({file: iconsDir.get_child('star-symbolic.svg')});

        // Centered on both axes, so the same children work in horizontal and vertical panels
        const centered = {x_align: St.Align.MIDDLE, x_fill: false, y_align: St.Align.MIDDLE, y_fill: false};

        this._box = new St.BoxLayout({style_class: 'week-hp-box'});
        this.actor.add(this._box, centered);

        this._icon = new St.Icon({
            icon_type: St.IconType.SYMBOLIC,
            icon_size: ICON_SIZE,
            style_class: 'week-hp-icon',
        });
        this._box.add(this._icon, centered);

        // One segment per work day, each holding a fill of variable width
        this._frame = new St.BoxLayout({style_class: 'week-hp-frame'});
        this._box.add(this._frame, centered);

        this._fills = Array.from({length: WORK_DAYS}, () => {
            const segment = new St.Widget({style_class: 'week-hp-segment'});
            const fill = new St.Widget({style_class: 'week-hp-fill'});
            segment.add_actor(fill);
            this._frame.add_actor(segment);
            return fill;
        });

        this._label = new St.Label({style_class: 'week-hp-label'});
        this._box.add(this._label, centered);

        this.on_orientation_changed(orientation);
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, UPDATE_INTERVAL_S, () => {
            this._update();
            return GLib.SOURCE_CONTINUE;
        });
    }

    // In a vertical panel everything is stacked: icon, one row per day, and the text on two lines
    on_orientation_changed(orientation) {
        this._vertical = orientation === St.Side.LEFT || orientation === St.Side.RIGHT;
        this._box.set_vertical(this._vertical);
        this._frame.set_vertical(this._vertical);
        this._update();
    }

    _update() {
        const {days, today, total} = getWeekProgress(GLib.DateTime.new_now_local());
        const complete = total >= 1;

        // Like in games: red when low, yellow at half, green when nearly full
        let level = '';
        if (complete)
            level = 'complete';
        else if (total >= 0.8)
            level = 'high';
        else if (total >= 0.4)
            level = 'mid';

        this._fills.forEach((fill, i) => {
            fill.width = Math.round(SEGMENT_WIDTH * days[i]);
            fill.style_class = `week-hp-fill ${level}`;
        });

        const percent = Math.floor(total * 100);
        // Translators: weekday and week progress, e.g. "Wed 46%"
        const text = complete ? _('GOAL!') : _('%s %d%%').format(this._dayNames[today], percent);
        this.set_applet_tooltip(text);

        if (!this._vertical) {
            this._label.text = text;
        } else if (!complete) {
            // Translators: weekday and week progress on two lines, for narrow vertical panels
            this._label.text = _('%s\n%d%%').format(this._dayNames[today], percent);
        }
        // The goal message is too wide for a vertical panel: the star and the full bar say it
        this._label.visible = !(this._vertical && complete);

        const state = `${complete ? ' complete' : ''}${this._vertical ? ' vertical' : ''}`;
        this._icon.gicon = complete ? this._starIcon : this._heartIcon;
        this._icon.style_class = `week-hp-icon${state}`;
        this._label.style_class = `week-hp-label${state}`;
    }

    on_applet_removed_from_panel() {
        GLib.source_remove(this._timeoutId);
        this._timeoutId = 0;
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new WeekHpApplet(metadata, orientation, panelHeight, instanceId);
}
