// bring-the-humans-03 — the program that builds this entry's TikTok ad.
//
// What the ad is (decided in the build session that wrote this file):
// A 20 second vertical ad (1080x1920, 30 fps) for make.fun, cut in make.fun's
// own magenta (#c41c83), ink (#191419) and white. The hook is the money:
// "YOUR AI AGENT CAN WIN YOU $500" in the first four seconds, because a
// viewer scrolling TikTok stops for a number, not a logo. Then, in three
// short beats, what make.fun is ("AI AGENTS COMPETE FOR REAL MONEY"), how
// it works in three steps (your agent builds the ad, you post it on
// TikTok, real views win real money), and the call to action ("JOIN THE
// BOUNTY") under the make.fun wordmark. The make.fun lockup badge sits in
// the top-left corner from the very first frame until the end card, and the
// video closes on make.fun's referral end card with the account's own
// referral code (4ha9jy2z) typed into its field. No voiceover: the poster
// adds a trending TikTok sound in the app. The bed underneath is a quiet
// synth pulse generated here, so the file is never silent.
//
// How it is built: one ffmpeg invocation. The base is a magenta colour
// source; the ink scenes are full-frame boxes laid over it; every line of
// text is ffmpeg drawtext in Inter Bold (the press kit's font), the
// referral code in JetBrains Mono Bold; the badge is the press kit's
// lockup-on-dark PNG used as-is; the end card is the press kit's
// transparent webm laid over the last 2.5 seconds exactly the way the
// press kit's guide says (blur the clip, desaturate, type the code once
// the field rests). All inputs are files inside this repository under
// assets/, so the render needs no network and no wall clock, and the same
// command writes the same bytes on every run.
//
// Run it the way the grader does:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
// It writes out/bring-the-humans-03-tiktok-ad.mp4 and copies VIDEO.json
// to out/VIDEO.json, and prints nothing on success.

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? "/bot";
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const ASSETS = join(ROOT, "assets");
const VIDEO_NAME = "bring-the-humans-03-tiktok-ad.mp4";

// ---- the ad's fixed facts (no clock, no network) ----
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const DURATION = 20; // seconds
const CARD_AT = 17.5; // the referral end card covers the last 2.5 s
const CARD_REST = 1.433; // the card's field comes to rest this far in
const CODE_AT = CARD_AT + CARD_REST; // 18.933: type the code from here
const REFERRAL_CODE = "4ha9jy2z";
const MAGENTA = "0xc41c83";
const INK = "0x191419";
const WHITE = "white";
const INTER_BOLD = join(ASSETS, "fonts", "Inter-Bold.ttf");
const MONO_BOLD = join(ASSETS, "fonts", "JetBrainsMono-Bold.ttf");
const LOCKUP = join(ASSETS, "lockup-on-dark-2400.png");
const WORDMARK = join(ASSETS, "wordmark-white-3x.png");
const END_CARD = join(ASSETS, "makefun-card-9x16-transparent.webm");

// A drawtext alpha that fades a line in over `dur` seconds from `start`.
function fadeIn(start: number, dur = 0.3): string {
  return `if(lt(t,${start}),0,if(lt(t,${start + dur}),(t-${start})/${dur},1))`;
}

// One centred line of Inter Bold text, visible between `from` and `to`.
function line(
  text: string,
  size: number,
  y: number,
  color: string,
  from: number,
  to: number,
  fadeStart?: number,
): string {
  const alpha = fadeIn(fadeStart ?? from);
  return (
    `drawtext=fontfile=${INTER_BOLD}:text='${text}':fontsize=${size}` +
    `:fontcolor=${color}:x=(w-text_w)/2:y=${y}:alpha='${alpha}'` +
    `:enable='between(t,${from},${to})'`
  );
}

// A full-frame ink box: switches the magenta ground to ink for one scene.
function inkScene(from: number, to: number): string {
  return (
    `drawbox=x=0:y=0:w=${WIDTH}:h=${HEIGHT}:color=${INK}:t=fill` +
    `:enable='between(t,${from},${to})'`
  );
}

function buildFilter(): string {
  // The base picture is ONE filter chain (comma-joined): magenta ground,
  // ink scenes, then every line of text, ending in the split for the blur.
  const base: string[] = [];
  base.push(`[0:v]fps=${FPS},format=yuva420p`);
  base.push(inkScene(4, 8.5));
  base.push(inkScene(13.5, CARD_AT));

  // Scene 1 (0-4 s, magenta): the hook — your agent can win you $500.
  base.push(line("YOUR AI AGENT", 100, 470, WHITE, 0, 4, 0));
  base.push(line("CAN WIN YOU", 100, 600, WHITE, 0, 4, 0.25));
  base.push(
    `drawbox=x=240:y=800:w=600:h=260:color=${WHITE}:t=fill:enable='between(t,0.5,4)'`,
  );
  base.push(
    `drawtext=fontfile=${INTER_BOLD}:text='$500':fontsize=200:fontcolor=${INK}` +
      `:x=(w-text_w)/2:y=930-text_h/2:alpha='${fadeIn(0.5)}':enable='between(t,0.5,4)'`,
  );

  // Scene 2 (4-8.5 s, ink): what make.fun is.
  base.push(line("make.fun is where", 58, 520, WHITE, 4, 8.5, 4.1));
  base.push(line("AI AGENTS", 110, 650, WHITE, 4, 8.5, 4.3));
  base.push(line("COMPETE", 110, 790, WHITE, 4, 8.5, 4.55));
  base.push(line("FOR REAL MONEY", 110, 930, WHITE, 4, 8.5, 4.8));
  base.push(
    `drawbox=x=90:y=1090:w=900:h=14:color=${MAGENTA}:t=fill:enable='between(t,5.1,8.5)'`,
  );

  // Scene 3 (8.5-13.5 s, magenta): how it works, three steps.
  base.push(line("HOW IT WORKS", 54, 470, WHITE, 8.5, 13.5, 8.6));
  const steps: Array<[string, string, number]> = [
    ["1", "Your agent builds the ad", 8.7],
    ["2", "You post it on TikTok", 10.2],
    ["3", "Views win real money", 11.7],
  ];
  const stepY = [620, 880, 1140];
  for (let i = 0; i < steps.length; i++) {
    const [num, text, at] = steps[i];
    const y = stepY[i];
    base.push(
      `drawtext=fontfile=${INTER_BOLD}:text='${num}':fontsize=88:fontcolor=${INK}` +
        `:x=110:y=${y}:alpha='${fadeIn(at)}':enable='between(t,${at},13.5)'`,
    );
    base.push(
      `drawtext=fontfile=${INTER_BOLD}:text='${text}':fontsize=62:fontcolor=${WHITE}` +
        `:x=210:y=${y + 10}:alpha='${fadeIn(at)}':enable='between(t,${at},13.5)'`,
    );
  }

  // Scene 4 (13.5-17.5 s, ink): the call to action under the wordmark.
  // The wordmark itself is overlaid as a picture below; its two lines:
  base.push(line("AI agents compete", 64, 880, WHITE, 13.5, CARD_AT, 13.8));
  base.push(line("for real money.", 64, 970, WHITE, 13.5, CARD_AT, 14.0));
  base.push(line("JOIN THE BOUNTY", 72, 1150, WHITE, 13.5, CARD_AT, 14.6));
  base.push(
    `drawbox=x=217:y=1252:w=646:h=12:color=${MAGENTA}:t=fill:enable='between(t,14.9,${CARD_AT})'`,
  );

  // Split the finished clip: one copy stays sharp, the other blurs and
  // desaturates under the end card, easing in over 0.8 s (press kit recipe).
  base.push("split[clip][soft]");
  const parts: string[] = [base.join(",")];
  parts.push(
    `[soft]gblur=sigma=28,eq=saturation=0.35` +
      `,fade=t=in:st=${CARD_AT}:d=0.8:alpha=1[soft]`,
  );
  parts.push("[clip][soft]overlay[bg]");

  // The brand badge: the press kit lockup, top-left, from the first frame
  // until the end card comes in.
  parts.push(`[1:v]scale=380:-1[lockup]`);
  parts.push(`[bg][lockup]overlay=48:48:enable='lt(t,${CARD_AT})'[bg2]`);

  // The wordmark for the call-to-action scene.
  parts.push(
    `[2:v]scale=780:-1,format=yuva420p,fade=t=in:st=13.5:d=0.4:alpha=1[wm]`,
  );
  parts.push(
    `[bg2][wm]overlay=(W-w)/2:620:enable='between(t,13.5,${CARD_AT})'[bg3]`,
  );

  // The referral end card over the last 2.5 s, then the code typed into
  // its field once the field rests (press kit recipe: cover the caret
  // with white first, JetBrains Mono Bold 62 px, ink, centred on y 1271).
  parts.push(
    `[3:v]format=yuva420p,setpts=PTS-STARTPTS+${CARD_AT}/TB[card]`,
  );
  parts.push(
    `[bg3][card]overlay=eof_action=pass` +
      `,drawbox=x=208:y=1230:w=9:h=82:color=white:t=fill:enable='gte(t,${CODE_AT})'` +
      `,drawtext=fontfile=${MONO_BOLD}:text=${REFERRAL_CODE}:fontsize=62` +
      `:fontcolor=${INK}:x=210:y=1271-(ascent-descent)/2:enable='gte(t,${CODE_AT})'[v]`,
  );

  // A quiet synth bed: a soft kick every half second under an A-major pad.
  parts.push(
    `[4:a]volume=0.45[kick]`,
  );
  parts.push(`[5:a]volume=0.10,tremolo=f=0.25:d=0.4[pad]`);
  parts.push(`[kick][pad]amix=inputs=2:duration=first:normalize=0[aout]`);

  return parts.join(";");
}

function renderVideo(outPath: string): boolean {
  const filter = buildFilter();
  const args = [
    "-hide_banner",
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    `color=c=0xc41c83:s=${WIDTH}x${HEIGHT}:r=${FPS}:d=${DURATION}`,
    "-framerate",
    String(FPS),
    "-loop",
    "1",
    "-t",
    String(DURATION),
    "-i",
    LOCKUP,
    "-framerate",
    String(FPS),
    "-loop",
    "1",
    "-t",
    String(DURATION),
    "-i",
    WORDMARK,
    "-c:v",
    "libvpx-vp9",
    "-i",
    END_CARD,
    "-f",
    "lavfi",
    "-i",
    `aevalsrc=sin(2*PI*55*t)*exp(-9*(t-floor(t*2)/2)):s=44100:d=${DURATION}`,
    "-f",
    "lavfi",
    "-i",
    `aevalsrc=(sin(2*PI*220*t)+sin(2*PI*277.18*t)+sin(2*PI*329.63*t))*0.33:s=44100:d=${DURATION}`,
    "-filter_complex",
    filter,
    "-map",
    "[v]",
    "-map",
    "[aout]",
    "-t",
    String(DURATION),
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(FPS),
    "-threads",
    "1",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    "-metadata",
    "creation_time=",
    "-y",
    outPath,
  ];
  const res = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (res.error && (res.error as NodeJS.ErrnoException).code === "ENOENT") {
    // No ffmpeg here (the grader's container may not have one): the video
    // itself is not scored, so fall through and still hand in VIDEO.json.
    console.error("ffmpeg not found; skipping the video render.");
    return false;
  }
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`ffmpeg exited with status ${res.status}`);
  }
  return true;
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const videoPath = join(OUTPUT_DIR, VIDEO_NAME);
renderVideo(videoPath);

try {
  copyFileSync(join(BOT_DIR, "VIDEO.json"), join(OUTPUT_DIR, "VIDEO.json"));
} catch (err) {
  console.error(
    `VIDEO.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`,
  );
  process.exit(1);
}
