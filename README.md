# Visual Transformation 🌷

A free, personal habit tracker with a rotating weekday grid, individual schedules, streak freezes, pixel-art rewards, a gallery, and separate task sheets.

## Updating your existing GitHub Pages app

1. **Back up your current habits first.** Open the *old* website and press **Download My Habit Backup**. Keep the JSON file; do not upload it publicly.
2. Download `Visual-Transformation-App.zip` from your ChatGPT conversation. Unzip/extract it on your HP laptop.
3. Open the `visual-transformation` folder inside the extracted files. Select the **9 app files** (`index.html`, `styles.css`, `app.js`, `core.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png`) and README if you want it.
4. On your GitHub repository's **Code** page, choose **Add file → Upload files**. Drag in those extracted files (not the ZIP itself). GitHub should show the updated `index.html` and other files. Click **Commit changes**.
5. Wait a minute or two for GitHub Pages to update and reload your existing website.

Do not delete your repository or change its GitHub Pages URL. The old app stored its habits under `vtHabits` in browser storage; this version imports them on first use and **does not delete that old key**. Backup and Restore are in Settings.

## Personal data and privacy

Your personal habits, completions, images sampled into pixels, and checklists are stored in local browser storage. None of your habit records or images are uploaded to GitHub by the app. Data is specific to each browser/device, and clearing the site's data may erase it. Keep downloadable JSON backups somewhere safe. You can restore those JSON backups on another device using Settings → Restore backup.

## How the streak system works

- Only scheduled weekdays count. Unscheduled days are not missed days.
- Every 14 consecutive successful scheduled check-ins earns one Streak Freeze (max 2 saved).
- On the next app visit after a missed scheduled day: one saved freeze is spent automatically; the progress day and pixel reveal stay the same. A freeze does not count as a completed day.
- An unprotected missed scheduled day resets that habit's progress, streak, and revealed pixels to zero. The selected pixel image design remains.
- Finishing a round allows you to end it or start another; either choice saves the completed artwork in the gallery.
- New rounds start no earlier than the following calendar day.

The app currently treats each planned day as one check-in. It detects missed days upon next opening/returning to the app, not through a background process.

## Install on Android

Once all app files are on your GitHub Pages website, open the site on your phone in Chrome. Use the Chrome menu → **Add to Home screen** / **Install app**. Visit once online to cache the files for offline use. Data from your laptop does not automatically appear on your phone; use Export / Restore to transfer it.

## Color themes

The Settings page includes the original five starter themes plus 15 Pinterest-based color palettes submitted by the user, each as its own independent theme. All original colors are represented in each theme’s preview swatches; legible foreground and background tints may be derived from that same palette. Choose any preset to apply it immediately without altering habit progress. You can also change individual background, text, card, button, highlight, and border colors and save a separate personal theme; it remains available when switching back to presets. No Pinterest images are uploaded or embedded in the app; these are color-only presets.


## Update: Dark Pinterest palettes and shared artwork

- All 15 Pinterest presets now place the darkest swatch on the page background and the lightest swatch on text/main buttons. Original non-Pinterest presets are unchanged.
- In the Pixel Gallery choose **Create shared picture** and select at least two habits. Each successful completion fills one pixel. Habits keep their independent streaks, schedules and resets.
- If a linked habit resets, its unfinished current-round contribution disappears, while the other habits' pixels remain. Completed rounds remain credited to the shared picture.
- Individual habit artwork is still the default. Deleting a shared picture returns its habits to their original individual images without erasing habit progress.
- Open Gallery → tap a picture → **Upload my own image** to select a JPG or PNG from your device. Pictures are reduced to pixel colors and stored locally; back up regularly.
- This update continues using the existing `vtStateV2` browser storage, adding `sharedPictures` only when needed.

## Update: Compact vertical weekday grid, optional Skip, and photo upload

- **Habit names now run vertically** above the weekday grid. Habit columns are narrower (51px on smaller phone screens) to fit more habits without scrolling. Day names and current habit day numbers remain readable. Swipe the grid sideways if a category has many habits.
- **No diary section.** The app continues to have Home, Tasks, Gallery and Settings. If an experimental diary version ever stored an entry, this update does not purposely delete your existing saved data, but it does not display a diary.
- **Optional Skip:** When creating or editing an individual habit, enable **Allow "Skip today"**. On a scheduled day, Skip exempts that day from missed-day penalties without adding progress or pixels or spending a freeze. The habit resumes on the next scheduled day. Skip is OFF for other habits unless you enable it. You can Undo a same-day skip in **View all habits**.
- **Phone photo uploads:** The file selector stays mounted while the Android photo picker is open. After selecting a JPG or PNG, the app shows a confirmation and a full-color preview of the selected image. Your growing pixel art still reveals one pixel per completed day.
- Existing habit records are read from your device's saved storage, not from files in GitHub. Do a JSON backup before uploading the new version, and keep backups private.
