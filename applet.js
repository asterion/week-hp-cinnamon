// SPDX-License-Identifier: GPL-2.0-or-later
//
// Week HP: a retro 2D platformer health bar in the Cinnamon panel.
// It fills up from Monday to Friday; when Friday ends, the weekly goals are complete.

const Applet = imports.ui.applet;
const Gettext = imports.gettext;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const St = imports.gi.St;
const Settings = imports.ui.settings;

const {setConfig, getWeekProgress} = require('./weekProgress');

const UUID = 'week-hp@asterion';
const ICON_SIZE = 14;
const MIN_UPDATE_INTERVAL_S = 10;

Gettext.bindtextdomain(UUID, `${GLib.get_home_dir()}/.local/share/locale`);

function _(text) {
    return Gettext.dgettext(UUID, text);
}

class WeekHpApplet extends Applet.Applet {
    constructor(metadata, orientation, panelHeight, instanceId) {
        super(orientation, panelHeight, instanceId);
        this.setAllowedLayout(Applet.AllowedLayout.BOTH);

        this._settings = new Settings.AppletSettings(this, UUID, instanceId);
        this._settings.bind('work-days', 'workDays');
        this._settings.bind('day-start-hour', 'dayStartHour');
        this._settings.bind('day-end-hour', 'dayEndHour');
        this._settings.bind('last-day-end-hour', 'lastDayEndHour');
        this._settings.bind('segment-width', 'segmentWidth');
        this._settings.bind('update-interval', 'updateInterval');
        this._settings.bind('mid-threshold', 'midThreshold');
        this._settings.bind('high-threshold', 'highThreshold');
        this._settings.bind('fill-low-color', 'fillLowColor');
        this._settings.bind('fill-mid-color', 'fillMidColor');
        this._settings.bind('fill-high-color', 'fillHighColor');
        this._settings.bind('goal-color', 'goalColor');
        this._settings.connect('settings-changed', () => this._on_settings_changed());
        this._applyConfig();

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
        // Saturday and Sunday, only shown if the work week has more than five days
        const now = GLib.DateTime.new_now_local();
        const monday = now.add_days(1 - now.get_day_of_week());
        this._dayNames.push(monday.add_days(5).format('%a'), monday.add_days(6).format('%a'));

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

        this._segments = [];
        this._fills = [];
        this._buildSegments();

        this._label = new St.Label({style_class: 'week-hp-label'});
        this._box.add(this._label, centered);

        this.on_orientation_changed(orientation);
        this._restartTimer();
    }

    // All parameters live in settings-schema.json and are edited in the "Configure..." dialog
    _on_settings_changed() {
        this._applyConfig();
        if (this._segments.length !== this.workDays)
            this._buildSegments();
        else
            this._segments.forEach(segment => segment.set_style(`width: ${this.segmentWidth}px;`));
        this._restartTimer();
        this._update();
    }

    _applyConfig() {
        setConfig({
            workDays: this.workDays,
            dayStartHour: this.dayStartHour,
            dayEndHour: this.dayEndHour,
            lastDayEndHour: this.lastDayEndHour,
        });
    }

    _buildSegments() {
        this._segments.forEach(segment => segment.destroy());
        this._segments = [];
        this._fills = [];
        const style = `width: ${this.segmentWidth}px;`;
        for (let i = 0; i < this.workDays; i++) {
            const segment = new St.Widget({style_class: 'week-hp-segment', style});
            const fill = new St.Widget({style_class: 'week-hp-fill'});
            segment.add_actor(fill);
            this._frame.add_actor(segment);
            this._segments.push(segment);
            this._fills.push(fill);
        }
    }

    _restartTimer() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
        const interval = Math.max(MIN_UPDATE_INTERVAL_S, this.updateInterval);
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
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
        const progress = total * 100;

        // Like in games: red when low, yellow at half, green when nearly full
        let level = '';
        if (complete)
            level = 'complete';
        else if (progress >= this.highThreshold)
            level = 'high';
        else if (progress >= this.midThreshold)
            level = 'mid';

        const color = level === 'mid' ? this.fillMidColor
            : level === '' ? this.fillLowColor
            : this.fillHighColor;

        this._fills.forEach((fill, i) => {
            fill.width = Math.round(this.segmentWidth * days[i]);
            fill.style_class = `week-hp-fill ${level}`;
            fill.set_style(`background-color: ${color};`);
        });

        const percent = Math.floor(progress);
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
        const goalStyle = complete ? `color: ${this.goalColor};` : '';
        this._icon.gicon = complete ? this._starIcon : this._heartIcon;
        this._icon.style_class = `week-hp-icon${state}`;
        this._icon.set_style(goalStyle);
        this._label.style_class = `week-hp-label${state}`;
        this._label.set_style(goalStyle);
    }

    on_applet_removed_from_panel() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
        this._settings.finalize();
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new WeekHpApplet(metadata, orientation, panelHeight, instanceId);
}
