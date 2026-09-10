# Phase 2, slice one — the world tells the truth about this repository

**Status: proposed. Not started.** `OD-0009-netlify-and-phase-2-authorisation.md` authorises Phase 2 and says plainly that Phase 2 has no written brief, that no session may decide for itself what the phase contains, and that the scope of the first slice is to be written down and seen by the owner before it is built. This is that document. It is a proposal to the owner and nothing in it is authority.

## Why this slice, and why now

Everything the owner has seen so far is a **recording**. The world replays the Phase 0 consolidation — a run that really happened, with its real commit SHAs, its real verdicts and its real findings — and it says so on the screen. It is honest, and it is history.

The owner's question, asked plainly on 2026-09-10, is the one this slice answers:

> "but does that mean when I type stuff into it, it wont show live updates of how each job is going? isnt that the point of this UI??"

It is the point. Nothing built so far does it. This slice does the smallest useful part: **the world stops replaying and starts reporting.**

## What is now true, and what it changes

On 2026-09-10 the application ran hosted, at its own web address, on the owner's own phone, at full quality: *"it loads, beautfully smooth, clean, no black and the text is amazingly crisp."* That settles three things this slice depends on.

- A hosted page is the delivery shape. No file has to reach the phone.
- Full quality survives on real hardware at a real address. The black textures and flicker were the Claude artifact's embedded frame and nothing else; two links differing only in the build proved the build innocent, and the plain address proved the hosting innocent too.
- The site rebuilds itself from the branch on every push, so what the owner opens is what the branch contains.

## The slice

**The world shows the current state of this repository, read-only, and refreshes while it is open.**

Concretely, and no more than this:

1. **The three console screens and the three slabs carry real values.** Which branch. Which commit. Whether a pull request is open and what number. Which checks have run, and which passed, failed, or could not run. Whether a review has reported, and which of the four verdicts it returned. Whether anything is waiting on the owner.
2. **It refreshes on a timer while the page is open**, so a check turning green appears without a reload.
3. **It says when it last looked.** A page showing a state is claiming that state is current; the only honest version of that claim carries a time.

## What this slice does NOT do

Named, because the temptation to widen is the failure mode this repository keeps catching.

- **It writes nothing.** No merge, no pull request, no comment, no label, no branch. Read-only, at the level of the token as well as the code.
- **It starts no agents.** Typing into Virgil and having work happen is the owner's item 3 and is a later slice.
- **It replaces no history.** The recorded replay stays exactly as it is and stays reachable. A world with nothing happening in it is a poor demonstration, and the recording is the thing that shows what a full run looks like.
- **It does not touch the Owner Build.** V10 is 8,528,318 bytes and stays there. The single-file build makes zero network requests and must keep making zero: it is the artefact that works with no server at all, and this slice is the reason a separate hosted target exists.

## Where the data comes from, and where the token lives

GitHub's REST API, read-only, for one repository: this one.

The repository is private, so the request needs a token, and **a token cannot live in the page** — anyone who opens the page can read everything in it. So the page never talks to GitHub. It talks to one small Netlify function, and the function holds the token and talks to GitHub.

**The owner creates the token and puts it in Netlify's environment settings himself.** No session creates it, holds it, sees it, or types it anywhere. `CLAUDE.md` forbids connecting credentials without explicit written authorisation for the session, and `OD-0009` gives none:

> "A session that reads 'Phase 2 is authorised' as permission to create, hold, paste or configure a token has exceeded this record."

The token should be scoped to reading this one repository and nothing else. If it is ever pasted into a chat, a file, a log or a fixture, it is burned and must be revoked — that is the rule, not a caution.

## The honesty rules this slice must not break

These are the project's recurring failure class, and every one of them has been caught here at least once already.

- **Unknown must look unknown.** If the function cannot reach GitHub, or the answer has not arrived, the world says so. It does not show the last value as though it were current, and it does not show zero as though it were a measurement.
- **A check that could not run is not a failure.** The four verdicts and fifteen states in `constitution/authority.json` are the vocabulary; nothing else is a verdict.
- **A claim is not evidence.** If GitHub reports a check as queued, the screen may not draw it as passed.
- **No figure is invented to fill a display.** A rail with nothing to say is empty, and an empty rail is correct.
- **The build stamp describes the build.** The state banner says which repository, which branch, and when it last looked.

Every one of these already has a test guarding it against the recording. The same tests must pass against real data, which is the cheapest reason to keep the recording alive: it is the fixture.

## What could go wrong, said in advance

- **Rate limits.** A refresh every few seconds against GitHub will hit them. The function caches, and the page shows the cached time rather than pretending to be live.
- **An empty world.** Most of the time nothing is running, so the room will be at rest. That is the truth and it should look like the truth, but it is worth the owner knowing before he sees it: this will be less lively than the recording, and that is the point.
- **The recording and the real world diverge in vocabulary.** The replay knows nine hops; GitHub knows commits, checks and reviews. The mapping is where a lie could enter, and it is where the review of this slice should look hardest.

## How the owner will know it worked

He opens the address on his phone and sees **his own repository** — this branch, this commit, the checks that actually ran — and a check going green while he watches, without touching anything.

## What is deliberately left open

- **The performance governor still cannot detect the failure it exists for.** It watches frame rate; what broke on the phone was corruption, not slowness, and it has never been observed engaging on any hardware. The proper address made the symptom go away, not the gap. It stays open and recorded rather than being quietly dropped now that it is less urgent.
- **The four accepted gaps** — KR-03, KR-06, KR-07, KR-09 — are untouched by this slice.
