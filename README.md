# Week HP for Cinnamon

A retro 2D platformer health bar for the Cinnamon panel that fills up
as your work week goes by. Reach Friday and… **GOAL!** ⭐

Using GNOME? See the [Week HP extension for GNOME Shell](https://github.com/asterion/week-hp).

## How it works

The bar has five segments, one for each day from Monday to Friday.
The current day fills up little by little during working hours, and the color
changes as you make progress, just like a health bar in a video game.

| | Panel |
|---|---|
| During the week | ![Heart, bar with four green segments and the text Jue 80%](examples/thursday-80.png) |
| Goal reached | ![Gold star, full green bar and the text GOAL!](examples/goal-en.png) |
| Goal reached, in Spanish | ![Gold star, full green bar and the text ¡META!](examples/goal-es.png) |

| Progress | Color | When |
|---|---|---|
| Below 40% | Red | Monday and Tuesday |
| 40% to 79% | Yellow | Wednesday and Thursday |
| 80% to 99% | Green | Thursday evening and Friday |
| 100% | Green, with a gold star and **GOAL!** | Friday 13:00 until Sunday |

- Days progress from **9:00 to 18:00**. Friday is a short day and ends at **13:00**.
- The bar stays full over the weekend and starts again on Monday.
- Hover over the applet to see the day and the percentage in a tooltip.
- It works in **horizontal and vertical panels**. In a vertical panel the days
  are stacked and the text is shown on two lines.
- It follows your system language: **English, Spanish and French**.

## Installation

Tested on Cinnamon 6.4. You need `git` to download it.

1. Download the applet into your applets folder:

   ```bash
   git clone https://github.com/asterion/week-hp-cinnamon.git \
       ~/.local/share/cinnamon/applets/week-hp@asterion
   ```

2. Install the translations (optional, the applet works in English without them):

   ```bash
   cinnamon-xlet-makepot -i ~/.local/share/cinnamon/applets/week-hp@asterion
   ```

3. Right-click the panel, choose **Applets**, select **Week HP** and press the **+** button.

## Updating

```bash
cd ~/.local/share/cinnamon/applets/week-hp@asterion
git pull
cinnamon-xlet-makepot -i .
```

Then restart Cinnamon with **Ctrl+Alt+Esc** to load the new version.

## Uninstalling

Right-click the applet and choose **Remove**, then delete its folder:

```bash
rm -rf ~/.local/share/cinnamon/applets/week-hp@asterion
```

## Customize your hours

Working hours are set at the top of [`weekProgress.js`](weekProgress.js):
`DAY_START_HOUR`, `DAY_END_HOUR` and `FRIDAY_END_HOUR`.
Restart Cinnamon with **Ctrl+Alt+Esc** after changing them.

## License

[GPL-2.0-or-later](LICENSE)
