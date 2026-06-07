# TikTok Outlier → Transcript Pipeline — Research & Handoff Notes

> **Status:** Ideation / research. No code written yet.
> **Owner:** personal content-creator business (not a product, not resold).
> **Next step:** hand off to a Claude Code **desktop** session with full run
> permissions to prototype Stage 1 end-to-end.
> **Last updated:** 2026-06-07.

## 1. Goal

Given a TikTok account, on a schedule:

1. Pull the account's videos from the last ~30 days.
2. Collect per-video metrics (views, likes, comments, shares, post time).
3. Statistically flag **over-performers** and **under-performers** (outliers),
   not by eyeballing.
4. For the outliers only, pull the **transcript** (caption track if present,
   else speech-to-text).
5. Output a report (winners vs. losers + transcripts) for content analysis.

This is for **my own account(s)**, so the ToS/legal scraping concern is
effectively moot — but note TikTok's own Creator/Business analytics and the
commercial Display/Research APIs are the only *sanctioned* paths if that ever
matters.

## 2. Recommended stack (the short version)

| Stage | Recommendation | Why |
|---|---|---|
| Discover + metrics | **Apify `apidojo/tiktok-scraper`** ($0.30/1k posts) as default; keep a **`yt-dlp` self-hosted** path as the free fallback | Cheapest reliable managed actor; offloads anti-bot/proxy upkeep. For one personal account the cost is rounding-error. |
| Download video/audio | **`yt-dlp`** | Free, points straight at a video URL, handles TikTok. |
| Captions (fast path) | **`yt-dlp --write-subs`** when a caption track exists | Free, instant, no compute. |
| Transcription (fallback) | **Groq Whisper-large-v3-turbo** API for cloud (~$0.0006/min), **or `faster-whisper` local** for zero marginal cost | Captions-first, Whisper-as-fallback. Groq is ~9× cheaper than OpenAI; local is free if a GPU/Mac is available. |
| Outlier scoring | **Modified z-score on median + MAD** | Robust to the very outliers we're hunting. |

**Bottom line on cost:** for a single personal account (~30 videos/mo, a
handful of outliers to transcribe per run), the total monthly cost is
**effectively pennies** regardless of which managed/cloud options you pick.
Optimize for *reliability and low maintenance*, not for shaving cents.

## 3. Stage 1–2 — Scraper options: managed vs. open source

### Managed scraper APIs (you call an endpoint, get JSON back)

| Provider / actor | Price (2026) | Notes |
|---|---|---|
| **Apify `apidojo/tiktok-scraper`** | **$0.30 / 1k posts** | Fastest actor (~600 posts/s, ~98% success). Best price/reliability for our use. |
| Apify `xtdata/tiktok-scraper` | $1 / 1k results | |
| Apify `clockworks/tiktok-scraper` | $1.70 / 1k videos | Most popular/most documented; pay-per-event. |
| Apify `scraptik/tiktok-api` | ~$2 / 1k requests | Flat per-request. |
| **EnsembleData** | $100–$1,400/mo by volume; **free 50 units/day** | Subscription model; free tier fine for one account. |
| **Bright Data** | from $0.75 / 1k requests (pay-per-success); higher tiers from ~$500 | Enterprise-grade, overkill/expensive here. |
| **ScrapFly** | 1,000 free credits to test; metered after | Has open-source TikTok scraper reference code too. |

**Takeaway:** Apify `apidojo` is the default pick. EnsembleData's free
50 units/day may even cover a single account at zero cost — worth testing first.

Fields to capture per video: `id`, `playCount` (views), `diggCount` (likes),
`commentCount`, `shareCount`, `createTime`, `webVideoUrl`/share URL, `desc`
(caption text), duration.

### Open-source / self-hosted

| Tool | What it does | Reality check (2026) |
|---|---|---|
| **`yt-dlp`** | Point at `tiktok.com/@user`, downloads all videos + basic metadata JSON (`--write-info-json`), and caption tracks (`--write-subs`) | Free, great for **downloading**. Metadata is basic (has view count, not full engagement analytics). Hits 403/rate limits anonymously — fix with `--cookies-from-browser`, `--sleep-interval`, residential IP. |
| **`davidteather/TikTok-Api`** (Python) | Unofficial web-API wrapper via Playwright + `ms_token` cookie | **Actively maintained** (v7.3.3, Apr 2026, ~5.1k★). Gets profile videos + stats. Needs a browser cookie and ideally residential proxies. No authenticated routes. |
| `drawrowfly/tiktok-scraper`, `omkarcloud/tiktok-scraper` | Node/REST scrapers with download URLs + stats | Workable; you own the maintenance + proxy burden. |

**Trade-off in one line:** managed = pay a little, it just works; OSS = free,
but you maintain the cookie/proxy/rate-limit dance when TikTok changes things.

**Recommended hybrid:** Use a managed API for **metrics** (Stage 1–2,
where breakage hurts most), and `yt-dlp` for **download** (Stage 4, stable and
free). Keep `TikTok-Api` as a documented OSS fallback for metrics.

## 4. Stage 4 — Transcription options

Pattern: **captions-first, Whisper-as-fallback.** Many TikToks ship a caption
track (`yt-dlp --write-subs --sub-langs en --convert-subs srt`) — free and
instant. Only run STT when no caption exists.

| Option | Price (2026) | Accuracy / notes |
|---|---|---|
| **Groq Whisper-large-v3-turbo** | **~$0.0006/min** ($0.02–0.04/hr) | ~9× cheaper than OpenAI; batch-oriented (buffers full segments — fine for us). Best cloud value. |
| Deepgram Nova-3 (batch) | ~$0.0036/min | Best-in-class real-time streaming (not needed here). |
| AssemblyAI Universal | ~$0.0037/min | Balanced features (speaker labels, etc.). |
| OpenAI Whisper API | ~$0.006/min | Simple, but ~9× Groq's price. |
| **`faster-whisper`** (local) | **$0** marginal | Same weights as OpenAI Whisper → same WER. ~12× real-time on an RTX 4070. Best for batch on NVIDIA. Needs a GPU. |
| `whisper.cpp` (local) | $0 marginal | CPU/Metal/CUDA/Vulkan, no Python. Slightly behind faster-whisper on NVIDIA; great on Apple Silicon. |

**Accuracy note:** all Whisper variants share the same model weights, so WER is
identical given the same model size — choice is about **speed, platform, and
cost**, not quality (quantized local models lose ≤1–2% WER).

**Pick:** if the desktop machine has a decent GPU or Apple Silicon → **local
`faster-whisper`/`whisper.cpp`** (free, private). Otherwise → **Groq**.

## 5. Stage 3 — Outlier detection method

Do **not** use mean ± 2σ; viral videos inflate both the mean and σ and hide
themselves. Use the robust **modified z-score** on median + MAD:

```
median_views = median(views over window)
MAD          = median(|views_i - median_views|)
score_i      = 0.6745 * (views_i - median_views) / MAD

score_i >  +3.5  -> over-performer (transcribe)
score_i <  -3.5  -> under-performer (transcribe)
otherwise        -> baseline
```

Refinements:
- **Recency normalization:** exclude videos < ~7 days old (haven't "settled"),
  or score on velocity (`views / days_live`).
- **Two axes:** also compute engagement rate `(likes+comments+shares)/views`.
  A video can be a *reach* outlier or an *engagement* outlier — different
  lessons. Flag both.
- Sanity check against the industry heuristic: outliers run ~3–10× the
  account's median view count.

## 6. Proposed architecture

```
config (handles, window, thresholds, output target)
        │
        ▼
[scraper adapter]  ── managed (Apify/EnsembleData)  ┐
        │           └ oss (yt-dlp / TikTok-Api)     ┘  ← swappable behind 1 interface
        ▼
raw video rows  ──►  normalize  ──►  store (SQLite/JSON; keep history for trend)
        │
        ▼
[outlier scorer]  (MAD + engagement rate + recency filter)
        │
        ▼  (outliers only)
[downloader: yt-dlp]  ──►  caption track?  ── yes ─►  use it
        │                                  └─ no ──►  [STT: Groq | faster-whisper]
        ▼
[report builder]  ──►  Notion DB  /  Google Sheet  /  Markdown
```

- **Swappable scraper interface** is the key design decision — one `fetch_user_videos(handle, since)` contract, multiple backends, so a TikTok change or pricing shift is a one-file swap.
- **Persist history** (don't just snapshot): storing each run lets you track a video's trajectory and compute velocity/"settled" views properly.
- Integrations available in-session for output: **Notion** and **Google Drive** were connected — a Notion database of `winners | losers | transcript` is a natural endpoint.

## 7. Decisions locked vs. open questions for the desktop session

**Locked:**
- Captions-first, Whisper-fallback for transcription.
- MAD-based outlier scoring with recency filter + engagement-rate second axis.
- Swappable scraper-adapter interface; `yt-dlp` for download.

**Open (need a choice before building):**
1. **Managed vs. OSS for metrics** — recommend starting with EnsembleData free
   tier or Apify `apidojo`; fall back to `TikTok-Api` if avoiding spend entirely.
2. **Local vs. cloud STT** — depends on the desktop machine's GPU/Apple Silicon.
3. **Output target** — Notion DB, Google Sheet, or local Markdown/CSV?
4. **Schedule** — manual run, or cron/daily? (affects history storage design)
5. **Language** — Python is the natural fit (yt-dlp, faster-whisper, TikTok-Api,
   pandas for stats) even though this repo is TS.

## 8. Implementation checklist (for the executing session)

- [ ] Confirm outbound network reaches TikTok + chosen API from the run env.
- [ ] Stand up scraper adapter + 1 backend; pull last-30-day video list for the handle.
- [ ] Normalize + persist rows (SQLite or JSON) with run timestamp.
- [ ] Implement MAD scorer + engagement-rate axis + recency filter; unit-test on sample data.
- [ ] `yt-dlp` download of flagged outliers; detect/grab caption track.
- [ ] Wire STT fallback (Groq key *or* local faster-whisper).
- [ ] Report builder → chosen output target.
- [ ] Dry-run on one real account; eyeball that flagged "winners" match intuition.

## 9. Sources

- [How To Scrape TikTok in 2026 — Scrapfly](https://scrapfly.io/blog/posts/how-to-scrape-tiktok-python-json)
- [Best TikTok Scraping Tools 2026 — AIMultiple](https://research.aimultiple.com/tiktok-scraping/)
- [Apify TikTok Scraper (clockworks)](https://apify.com/clockworks/tiktok-scraper) · [apidojo](https://apify.com/apidojo/tiktok-scraper) · [Apify pricing](https://apify.com/pricing)
- [EnsembleData pricing](https://ensembledata.com/pricing) · [Bright Data TikTok](https://brightdata.com/products/web-scraper/tiktok)
- [davidteather/TikTok-Api (GitHub)](https://github.com/davidteather/TikTok-Api) · [Downloading every video for a TikTok account — Simon Willison](https://til.simonwillison.net/tiktok/download-all-videos)
- [Choosing between Whisper variants — Modal](https://modal.com/blog/choosing-whisper-variants) · [whisper.cpp vs faster-whisper 2026](https://www.promptquorum.com/power-local-llm/local-whisper-stt-comparison-2026)
- [Whisper API Pricing 2026 — TokenMix](https://tokenmix.ai/blog/whisper-api-pricing) · [Groq Whisper-large-v3-turbo](https://groq.com/blog/whisper-large-v3-turbo-now-available-on-groq-combining-speed-quality-for-speech-recognition)
- [Speech-to-Text API Pricing Compared 2026 — Awesome Agents](https://awesomeagents.ai/pricing/transcription-api-pricing/)
- [Using the Median Absolute Deviation to Find Outliers — Eureka Statistics](https://eurekastatistics.com/using-the-median-absolute-deviation-to-find-outliers/)
- [AI-Video-Transcriber (captions-first + Whisper, GitHub)](https://github.com/wendy7756/AI-Video-Transcriber)
</content>
</invoke>
