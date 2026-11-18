# Syncline

Syncline is a one-thumb rhythm runner for a phone. Barriers rush down three lanes in time with a beat. Switch lanes as the beat lands to score a Sync, grab the diamonds, and keep the run alive. Runs are short on purpose: long enough to learn, short enough to restart between classes.

Scores, the orb you picked, and the mute setting stay on the device. There is no account and no ads.

## Play

```bash
npm install
npm run dev
```

The dev server prints a local URL. On a phone-sized window, tap the left half of the screen to move left and the right half to move right. A keyboard uses the arrow keys or A and D. Enter starts or restarts, Esc pauses, M mutes.

- **Endless** is a new road every run.
- **Today** uses the same road for every player on that UTC date, so scores are comparable. Share copies a line you can drop into a chat.
- **Looks** unlock from your best score. Ion is free. Flare, Venom, Solar, Void, and Halo wait at 400, 900, 1,600, 2,600, and 4,000.

```bash
npm test
npm run build
npm run preview
```

## Why this, for under 20

People under 20 already live in short sessions. The Play Store games they reopen are usually one of these:

| Idea | Why it lands | What it costs to ship |
| --- | --- | --- |
| Rhythm lane runner (this game) | The same muscle as Geometry Dash and Subway Surfers: one thumb, a restart, a score you can brag about. Neon reads in a 2-second preview. | Art and feel. No server. |
| One-button timing (stack, slice, flip) | Huge download numbers, very fast to learn. | The ad feeds are crowded, and older teens treat a plain version as a kids' game unless the look is sharp. |
| Social deduction or party | This is what friend groups talk about. | Accounts, realtime servers, moderation, and a group online at the same time. |
| Arena .io | Same social pull, with a scoreboard. | Netcode and cheating, on top of the party-game costs. |
| Horror micro-episodes | Strong with 15–19 when a clip spreads. | Art, writing, and a tighter content rating. |
| Avatar dress-up | Strong with younger teens. | A lot of cosmetic content or the game feels empty. |

Syncline is the one that can be finished, look like a real store listing, and work offline. A party game is a better second project, after this loop is fun.

## Play Store

The web build is an installable PWA (`npm run build` writes `dist/`). For Play, wrap that build so the game is on the device instead of loaded from a site:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init Syncline app.syncline.game --web-dir dist
npm run build
npx cap add android
npx cap sync
```

Open the `android` project in Android Studio and produce a signed app bundle. You will need a Play Console account, a feature graphic, phone screenshots, and a 15 second portrait video that shows real gameplay in the first seconds.

Suggested Console answers for this build:

- Category: Game, Arcade.
- Ads and in-app purchases: none.
- Data safety: data is not collected. Scores stay on the device. The privacy page is `/privacy.html`.
- Content: no violence, chat, or user accounts. The questionnaire should land on a low age rating.
- Target age: the tone is aimed at teenagers. If the store listing targets anyone under 13, Play's Families policy applies. To market at teens without that program, set the target age groups to 13–15, 16–17, and 18 and up.

Replace `app.syncline.game` if that package id is taken.

## Privacy

See [public/privacy.html](public/privacy.html). The game does not send scores or identifiers anywhere.
