# $SCREAM — Core Concept

Oct 9, 2026 · @Mickovic Balsa

## What $SCREAM is

$SCREAM is a Halloween memecoin with a website where anyone can record a scream, get it scored, and share it. For 14 nights before Halloween, the loudest and funniest screams get crowned, ending in a synchronized Final Scream at midnight on Oct 31.

**Ticker:** $SCREAM

**Bio:** The whole world screams together.

## Narrative

Everyone on earth has something to scream about, and crypto adds a few more: rugs, red candles, missed 100x's. $SCREAM turns all of it into one global event. Every scream from every country adds to a single world total, and on Halloween the whole world screams at once.

The season runs 14 nights, from Oct 17 to Oct 31. Each night has a theme, a winner gets crowned, and the community total keeps climbing toward the Final Scream on Halloween.

## Core loop

Every scream takes under a minute and ends in a shareable clip.

1. **Hit the red button.** The site records up to 10 seconds from the mic, in the browser only. File uploads are not accepted.
2. **Get a Scream Power score.** A live meter shows loudness and length while recording, then a score with a waveform.
3. **Get a share clip.** A vertical video with the scream, waveform, score and the $SCREAM mark is generated for TikTok, Reels and X.
4. **Feed the Global Scream Meter.** Every scream adds to one community total. Milestones unlock new prompts, features or reveals.

**Who can play:** anyone can scream for free. Holders above a minimum balance compete for prizes and vote, and their screams count double on the global meter.

## 14 Nights of Screaming

Each night has one prompt, and each night crowns one Scream King or Queen.

**How winners are picked:** Scream Power decides the top 50 of the night. Holders then vote, one vote per wallet, and the most-voted scream wins the crown and a prize from the pot. Loudness alone is easy to fake, so votes decide.

| Night | Date | Prompt |
| --- | --- | --- |
| 1 | Oct 17 | Scream like you just checked your portfolio |
| 2 | Oct 18 | Scream at the coin that rugged you |
| 3 | Oct 19 | Whisper scream |
| 4 | Oct 20 | Scream like a horror movie victim |
| 5 | Oct 21 | Scream with your pet |
| 6 | Oct 22 | Longest scream in one breath |
| 7 | Oct 23 | Scream in a public place |
| 8 | Oct 24 | Villain laugh scream |
| 9 | Oct 25 | Scream at a spider |
| 10 | Oct 26 | Duo scream with a friend |
| 11 | Oct 27 | Scream like you just got sniped |
| 12 | Oct 28 | Silent scream (face only, votes decide) |
| 13 | Oct 29 | Scream in your native language |
| 14 | Oct 31 | The Final Scream |

One date is open: Oct 30 has no prompt yet, so either add a rest night or shift the season start to Oct 18.

## Viral features

Each feature produces a clip or a rivalry people post on their own.

| Feature | What it does | Why people share it |
| --- | --- | --- |
| Scream at your bags | Connect a wallet, the site shows your worst coin, you scream at it | Every trader has a bag to scream at |
| Scream Battles | Challenge anyone by X handle, both scream, the community votes | Rivalries and loser clips get posted |
| Scream Wall | Playable gallery of the best screams of the day | People scroll it and send clips to friends |
| Scream Cam | Optional face-on-camera recording for a score bonus | Video spreads further and is harder to fake |
| KOL Scream Board | Separate leaderboard for known accounts | KOLs bring their audiences on day one |

## The finale

At midnight UTC on Oct 31, the whole world screams at the same time. It is livestreamed on X, and the global meter shows the spike live.

- The Scream King or Queen of the Season is crowned by a vote among the 14 nightly winners.
- The Nov 1 plan is announced on the final night, for example keeping the Scream Wall open as a permanent meme library or teasing the next seasonal event. This keeps the token from falling off a cliff after Halloween.

Open question: which Nov 1 plan do we commit to before launch?

## Prizes and fairness

The prize pot is funded by creator fees from $SCREAM trading, with no entry fee. Winners are picked by votes, not luck, which keeps it a contest rather than a bet. The pot is shown live and no amount is promised. A quick legal check is still needed before launch.

- **Fake screams:** in-browser recording only, no uploads, Scream Cam bonus for face-on video.
- **Spam:** a wallet signature to submit, one scream per wallet per prompt.
- **Vote farming:** only holders above a minimum balance vote, one vote per wallet per day.
- **Bad content:** audio is auto-transcribed and filtered for slurs, every clip has a report button, and only checked clips go on the public wall.
- **Minors:** terms state 18+.

## Tech on Heroku

The whole app runs on Heroku: one web dyno for the site and API, one worker dyno for video rendering. Heroku's filesystem is wiped on restart, so clips must live in external object storage.

| Part | Heroku piece | Job |
| --- | --- | --- |
| Website + API | Web dyno (Next.js / Node) | Recorder, live meter (Web Audio API, auto gain off), leaderboards, voting |
| Database | Heroku Postgres | Screams, scores, votes, wallets, winners |
| Queue + live counter | Heroku Redis | Render job queue, Global Scream Meter total |
| Video rendering | Worker dyno + ffmpeg buildpack | Turns each scream into a vertical share clip |
| Clip storage | S3-compatible add-on (e.g. Bucketeer) or Cloudinary | Stores audio and video files |
| Nightly jobs | Heroku Scheduler | Closes each night, counts votes, crowns winners, triggers X posts |
| Wallet data | Helius (external) | Balance checks, worst-bag lookup |
| Moderation | Speech-to-text API (external) | Transcribes clips for slur filtering |

**Build order:**

1. Recorder, Scream Power score and share clip.
2. Leaderboard, voting and nightly crowning.
3. Wallet connect, holder gating and the X bot.
4. Scream Battles and Scream at your bags.

## Timeline

Build from Oct 10 to Oct 16, launch on Oct 17 with Night 1, and finish with the Final Scream on Oct 31. During the build week, line up 5-10 KOLs to scream at launch and record team screams as the first content.
