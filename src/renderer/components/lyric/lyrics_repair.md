# Chorus Deck — Multi-Provider Lyrics Integration and Repair

## Objective

Improve the existing lyrics system in **Chorus Deck**, an existing music-streaming application.

This is an integration and repair task, NOT a request to create a new lyrics engine, standalone service, SDK, or separate application.

The application already has multiple lyrics providers. Some are broken, some return poor results, and some appear to use essentially identical retrieval or processing logic.

Your job is to inspect the existing codebase, diagnose these problems, and implement each provider according to its actual API, response format, capabilities, and limitations.

Preserve the existing application architecture, playback system, UI, and working functionality wherever possible.

## 1. Audit the existing implementation first

Before modifying code:

1. Inspect the complete repository structure and identify the frontend, backend, lyrics components, provider integrations, playback state management, caching, and shared utilities.
2. Identify every currently implemented lyrics provider and trace its complete request-to-rendering path.
3. Determine which providers are genuinely functional, partially functional, duplicated, obsolete, or incorrectly implemented.
4. Find shared logic that incorrectly assumes every provider uses the same endpoint, response schema, search parameters, or synchronization format.
5. Identify the actual source of every failure using existing logs, response handling, error paths, and tests.
6. Inspect how Chorus Deck identifies the currently playing track, including title, artist, album, duration, ISRC when available, and source-specific track identifiers.

Do not rewrite functioning modules just to make the code look different. Do not replace the entire lyrics implementation before understanding it.

Produce a concise audit of the existing implementation and then proceed with the repairs.

## 2. Implement distinct provider integrations

Investigate and integrate the following providers where technically feasible and appropriate for the existing application.

### A. KuGou

Repository/reference: https://github.com/chenmozhijin/LDDC

Requirements:

- Use KuGou-specific search, track matching, and lyric retrieval logic.
- Investigate the actual response structure and the availability of KRC or other richer synchronized formats.
- Decode or parse the returned format using appropriate provider-specific logic.
- Preserve word-level or finer timing when it is genuinely supplied.
- Handle translations and alternate versions when available.
- Do not treat KuGou as a generic LRC endpoint.

### B. LRCLIB

Documentation: https://lrclib.net/docs

Requirements:

- Implement its documented search and exact-lookup endpoints correctly.
- Use appropriate title, artist, album, and duration parameters.
- Handle plain lyrics, line-synchronized LRC, and richer word-synchronized records separately.
- Inspect the actual `syncedLyrics`, `plainLyrics`, `hasWordSync`, and `lyricsfile` fields where applicable.
- Do not assume every result has word-level timing.
- Implement caching, timeouts, rate-limit handling, and proper error responses.

### C. Paxsenix Lyrically

Reference: https://lyrics.paxsenix.org/

Requirements:

- Inspect the current API documentation and supported endpoints.
- Determine which upstream provider produced each result whenever the response exposes that information.
- Preserve the returned synchronization format and timing granularity.
- Handle provider-specific identifiers and parameters correctly.
- Avoid redundant requests when another Chorus Deck integration already queries the same upstream source.
- Treat the aggregator as a distinct integration, not as proof that its upstream sources are interchangeable.

### D. Better Lyrics and Unison

References:

- https://github.com/better-lyrics
- https://unison.boidu.dev/
- https://github.com/better-lyrics/unison

Requirements:

- Distinguish the Better Lyrics application/backend from the Unison community database.
- Inspect their actual APIs, supported query identifiers, response schemas, and available lyric versions.
- Use YouTube video IDs when appropriate and available.
- Preserve TTML or other rich timing when supplied.
- Handle multiple versions, match confidence, translations, and community-submitted alternatives when available.
- Respect documented request limits and database licensing requirements.

Do not assume that every Better Lyrics or Unison result is word-synchronized.

### E. LyricsPlus

Repository: https://github.com/ibratabian17/lyricsplus

Requirements:

- Investigate the documented `/v2/lyrics/get` and `/v1/ttml/get` endpoints.
- Determine which response is appropriate for each use case.
- Support its actual query parameters, identifiers, metadata, and response formats.
- Preserve rich timing and metadata rather than flattening the response into ordinary LRC.
- Handle caching and failures without breaking other providers.

### F. Additional providers

Investigate these projects and sources as potential integrations or references:

- AMLL TTML DB: https://github.com/amll-dev/amll-ttml-db
- LiriQo: https://github.com/AlFarrizi-Studio/Liriqo
- Syncanto: https://github.com/alfzcore/Syncanto
- LDDC: https://github.com/chenmozhijin/LDDC
- Musixmatch: https://www.musixmatch.com/
- LyricFind: https://www.lyricfind.com/

Use existing dependencies or direct integrations when appropriate. Do not add every possible provider blindly.

Prefer stable, documented APIs and integrations that are permitted for the intended use. Treat reverse-engineered endpoints as fragile and isolate them so their failure cannot break the rest of the application.

Do not copy an entire competing project's implementation into Chorus Deck. Inspect its architecture, API behavior, format handling, and license before reusing code.

## 3. Each provider must be genuinely distinct

Create or repair provider-specific modules within the existing Chorus Deck project.

Each integration must define its own:

- Request and lookup strategy.
- Query parameters and identifier handling.
- Response parsing.
- Timing-format detection.
- Error classification.
- Match validation.
- Provider-specific metadata extraction.
- Supported capabilities and limitations.
- Tests using realistic fixtures.

Use shared utilities only for genuinely common concerns such as timeouts, cancellation, logging, caching infrastructure, and conversion into the application's existing lyrics representation.

Do not force every provider through the same request function or assume all responses are JSON objects containing an LRC string.

A shared interface is acceptable. Identical implementations disguised as separate providers are not.

## 4. Preserve every supported synchronization format

Inspect the existing lyrics data model and extend it only as necessary.

Support the formats that the implemented providers actually return, including applicable variants of:

- Plain text.
- LRC.
- Enhanced LRC.
- TTML.
- KRC.
- QRC.
- Other formats already supported by the project.

Requirements:

- Preserve original provider data when practical.
- Preserve word and syllable timestamps when present.
- Support line and sentence timestamps.
- Preserve translations, romanization, vocalists, and background vocals when supplied.
- Handle missing timestamps, overlapping segments, malformed records, and multiple lyric versions.
- Avoid converting rich timing into line-only LRC unless explicitly required by a target component.
- Do not invent word-level timestamps and label them as genuine synchronization.

Reuse the application's current data model where possible. If a normalization layer already exists, repair it rather than introducing a second competing model.

## 5. Support sentence-by-sentence and word-by-word lyrics

Chorus Deck must support multiple display granularities using the actual data returned by the providers.

### Sentence-by-sentence

- Advance the active sentence using valid sentence or line timestamps.
- Handle punctuation and sentence boundaries without inventing timing for sentences that share one timestamped line.
- Support transitions, seeking, pausing, and resuming.

### Line-by-line

- Highlight the active line and optionally display nearby lines.
- Use actual line timing from the source.

### Word-by-word

- Highlight words progressively using actual word timestamps.
- Maintain correct timing after seeking and playback-rate changes.
- Use source-provided syllable timing when available.
- Fall back gracefully when only line timestamps exist.

### Syllable-by-syllable

- Preserve suitable source-provided syllable timings.
- Do not split text blindly on spaces, especially for languages such as Japanese and Chinese.

Ensure that the existing lyrics UI receives the correct timing information. Do not redesign the entire UI unless a change is necessary to expose an existing capability.

## 6. Fix track matching and result selection

A successful HTTP request does not guarantee a correct lyric.

Implement or repair result selection using:

- Exact provider track identifiers when available.
- ISRC when available.
- Title and artist similarity.
- Album and version information.
- Duration difference.
- Language and recording type when available.
- Timing granularity and completeness.

Avoid selecting lyrics from the wrong remix, live performance, cover, instrumental version, or similarly named song.

Use a transparent scoring or ranking strategy and preserve the reason a candidate was selected.

Prefer a correct line-synchronized match over incorrect word-synchronized lyrics from a different recording.

## 7. Repair provider fallback behavior

Implement reliable fallback behavior in the existing application.

Requirements:

- Distinguish no-result responses, timeouts, rate limits, malformed data, and authentication failures.
- Do not silently interpret a failed request as an empty successful result.
- Avoid repeating failed requests unnecessarily.
- Apply request cancellation when the track changes.
- Prevent slow responses for an old track from replacing the current track's lyrics.
- Avoid querying the same upstream source redundantly through multiple aggregators.
- Cache successful results using appropriate keys and expiration policies.
- Respect upstream caching and usage restrictions.
- Support a configurable provider order and concurrency policy.
- Return the best valid candidate rather than blindly using the first successful response.

Keep provider-specific failures isolated. If KuGou fails, LRCLIB and other integrations must remain usable.

## 8. Playback synchronization

Integrate lyrics with Chorus Deck's existing playback clock.

Verify behavior during:

- Play and pause.
- Seeking forward or backward.
- Track changes.
- Playback-rate changes.
- Buffering and resumption.
- Long playback sessions.
- Switching between sentence, line, and word display modes.

Do not create an independent timer that gradually drifts away from actual audio playback.

Preserve the application's existing audio architecture.

## 9. Performance and reliability

Implement:

- Timeouts and cancellation.
- Bounded concurrency.
- Request deduplication.
- Appropriate caching.
- Rate-limit compliance.
- Structured diagnostic logs.
- Graceful fallback.
- Tests for malformed and incomplete provider responses.

Do not introduce excessive dependencies, unnecessary background services, or a separate backend unless the existing architecture genuinely requires one.

Do not hardcode API credentials or expose private tokens in the frontend.

## 10. Testing and verification

For every provider:

- Test successful retrieval.
- Test no-result behavior.
- Test network failures and timeouts.
- Test malformed responses.
- Test rate limits and authentication errors where applicable.
- Test rich-sync and line-sync results separately.
- Test correct matching of alternate versions.
- Verify that translations and timing survive normalization.
- Verify that one provider's failure does not disable the others.

Use saved fixtures or mocks for deterministic tests. Perform live API checks where access is available and permitted.

Do not claim a provider works merely because its code compiles.

Record which providers were tested live, which were tested with fixtures, and which remain blocked by credentials or upstream restrictions.

## 11. Licensing and compliance

Before enabling any provider in a production build:

- Inspect the applicable software license.
- Inspect the provider's API terms.
- Check permitted lyric display, storage, caching, translation, redistribution, and commercial use.
- Respect rate limits and authentication requirements.
- Do not bypass access controls or use unauthorized credentials.

Keep the provider disabled or clearly marked as experimental if its permitted integration cannot be established.

## 12. Deliverables

Make the changes directly in the existing Chorus Deck repository.

Deliver:

1. An audit of the existing lyrics integrations.
2. Repaired and distinct provider implementations.
3. Correct format parsing and timing preservation.
4. Improved result matching and fallback behavior.
5. Sentence-by-sentence and word-by-word support where the underlying data allows it.
6. Tests for every provider and important failure mode.
7. A concise list of modified files and dependencies.
8. Setup instructions for any required configuration.
9. A provider capability matrix showing actual tested timing support.
10. A list of unresolved limitations and licensing or API-access blockers.

## Non-negotiable constraints

- Do not create a new standalone lyrics engine or application.
- Do not replace the existing music player.
- Do not rebuild the frontend from scratch.
- Do not change the UI design unnecessarily.
- Do not duplicate provider logic while pretending the integrations are distinct.
- Do not discard word-level timing.
- Do not fabricate successful API results or claim untested providers work.
- Do not remove functioning providers simply because a new integration is easier.
- Keep changes focused, modular, testable, and compatible with the existing Chorus Deck codebase.

Begin by inspecting the actual repository and tracing the current provider implementations. Make targeted changes based on verified problems, then run the relevant tests and report the results.
