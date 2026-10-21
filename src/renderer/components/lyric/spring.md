# IMPLEMENTATION PROMPT: APPLE MUSIC–INSPIRED LYRIC SCROLL, SPRING MOTION & INACTIVE-LINE ANIMATION

## Objective

Upgrade the existing lyrics animation in this repository to reproduce the motion characteristics demonstrated in the supplied reference video and the generated MP4 prototype.

The existing lyrics engine, audio synchronization, karaoke highlighting, providers, background, and other functionality have already been implemented.

**Modify only the existing lyric animation, layout, focus, and rendering components required for this task. Do not rebuild the lyrics system from scratch.**

The primary goal is to reproduce a premium synchronized-lyrics experience in which:

1. The complete lyric sequence is tracked in one continuous layout.
2. The active lyric advances according to the existing playback synchronization.
3. The entire lyric field moves toward a focal position using spring-damped motion.
4. Every inactive line, including blurred lines far above and below the active lyric, remains part of the animation model.
5. Each line smoothly transitions between inactive, approaching-focus, active, and leaving-focus states.
6. Opacity, blur, scale, and position change coherently as the focus travels through the lyric sequence.
7. The complete animation remains performant without unnecessary rendering, layout recalculation, or continuous background CPU usage.

The intended result is not a generic scrolling list, an isolated stack of bouncing lines, or a static set of blurred lines surrounding one highlighted phrase.

It is a continuous, playback-driven lyric field with spring-based motion and smoothly changing per-line visual emphasis.

---

# 1. INSPECT THE EXISTING IMPLEMENTATION FIRST

Before modifying code, inspect the existing lyric renderer and animation architecture.

Identify:

- How the active lyric line is determined.
- How the complete lyric sequence is laid out.
- How scrolling or focus positioning currently works.
- How line positions are calculated.
- How inactive lines receive opacity, blur, and scale.
- Whether the existing implementation animates each line independently.
- How spring state, velocity, damping, and animation delays are handled.
- How `requestAnimationFrame` or the existing animation library is used.
- Which state changes cause framework rerenders.
- Whether lyric lines are measured repeatedly during animation.
- Whether there is already a virtualization or overscan mechanism.

Profile the existing implementation before adding more animation logic.

Identify what can be reused and what specifically needs to change.

Do not replace a functioning spring engine, playback clock, or rendering optimization without a demonstrated reason.

---

# 2. PRESERVE THE ENTIRE LYRIC FIELD

The animation must represent the full lyric sequence, not just a temporary collection of five or seven lines.

Conceptually:

```text
Line 001
Line 002
Line 003
Line 004
Line 005
...
Line 047
Line 048
Line 049
Line 050  ← active
Line 051
Line 052
...
Line 100
```

Each lyric must retain its logical identity and appropriate position within the continuous layout.

Do not reconstruct the sequence around the active lyric every time the active index changes.

Do not discard the inactive lyrics from the layout model simply because they are outside the visible viewport.

Use stable line identities and cached layout measurements wherever possible.

The inactive lines are important because their movement and appearance are part of the intended animation.

**Track the complete sequence logically; optimize the cost of rendering and updating it.**

---

# 3. IMPLEMENT CONTINUOUS SCROLLING WITH SPRING-DAMPED MOVEMENT

The whole lyric field must follow the active lyric through the existing lyric timeline.

First calculate the focal target using the active line's actual position in the complete layout.

Conceptually:

```ts
targetScrollY = activeLineLayoutY - focusAnchorY;
```

Adapt this calculation to the existing coordinate system, container padding, line heights, and viewport dimensions.

Then move the scroll/focus position toward the target using the existing spring infrastructure or a suitable stable damped-spring implementation.

Maintain persistent spring state:

```ts
type ScrollSpringState = {
  position: number;
  velocity: number;
  target: number;
};
```

Requirements:

- Smooth acceleration toward the new target.
- Natural deceleration as the target is approached.
- Persistent velocity when the target changes.
- No unnecessary restart of the animation from zero.
- Little or no noticeable overshoot.
- No repeated bouncing after the transition.
- Correct behavior at different frame rates.
- Appropriate handling of rapid active-line changes.

The dominant movement must still read as continuous scrolling through the lyrics.

Do not replace scrolling with an isolated spring stack.

Do not make every lyric's vertical position unrelated to the surrounding layout.

The global scroll/focus calculation establishes the sequence's spatial movement, while the individual line transitions described below produce the more nuanced visual effect.

---

# 4. THE MOST IMPORTANT REQUIREMENT: ANIMATE ALL INACTIVE LYRICS

Do not concentrate exclusively on the active lyric.

The inactive lines are not decorative text that can remain visually static while the active phrase changes.

**Every line passing through or near the focus region must transition smoothly according to its position relative to the active lyric.**

The renderer must account for lines:

- Far above the active lyric.
- Approaching the focus from above.
- Immediately above the active lyric.
- Currently active.
- Immediately below the active lyric.
- Leaving the focus region.
- Far below the active lyric.

Each line's visual appearance should evolve as the focal position moves through the continuous lyric sequence.

For example, when a new line becomes active:

1. The incoming line moves toward the focus position.
2. Its opacity and visual emphasis increase smoothly.
3. Its blur decreases appropriately.
4. Its scale transitions toward the active-line scale.
5. The previous active line leaves focus.
6. The previous line becomes progressively less prominent.
7. Its blur and opacity transition toward their inactive values.
8. The remaining inactive lines continue moving through the same continuous layout.
9. Lines farther from focus retain subdued styling appropriate to their distance.

Do not update only the newly active and previously active lines while leaving all other inactive lines unchanged.

Do not hard-switch visual properties at the active-index boundary.

The effect must be continuous across multiple consecutive lyric changes.

---

# 5. FOCUS-DEPENDENT VISUAL MODEL

Implement a consistent relationship between a lyric line's distance from the focal position and its visual appearance.

A conceptual model is:

```text
line position relative to focus
              ↓
       normalized distance
              ↓
         focus weight
       ┌──────┼──────┐
       ↓      ↓      ↓
      scale opacity blur
```

You may use a smooth interpolation curve, a distance-based function, or another model appropriate to the existing renderer.

The focal line should receive the highest emphasis. Nearby lines should remain readable, while more distant lines should appear progressively less prominent.

Use configurable parameters for:

- Active-line scale.
- Inactive-line scale.
- Opacity as a function of focus distance.
- Blur as a function of focus distance.
- The width of the focus region.
- Transition smoothness.
- Optional subtle overscan or edge-fade behavior.

The focus region must not be limited to just the current line.

The lines immediately before and after the active line must visibly participate in the transition.

## Important distinction

The focus function determines the intended visual properties of each line.

The animation system determines how each line transitions toward those properties.

Do not calculate the correct final opacity and blur but apply them instantly.

The transitions themselves must be smooth.

---

# 6. BLUR AND OPACITY MUST EVOLVE DURING MOVEMENT

The blurred, inactive lyrics are a core part of the intended visual effect.

Do not leave them at fixed opacity and blur values throughout an active-line transition.

As the focus advances:

- Lines approaching focus should gradually become clearer and more visible.
- Lines leaving focus should gradually become softer and less visible.
- More distant lines should remain subdued.
- All changes must be coordinated with the actual lyric movement.
- The background must not interfere with text readability.

Use the existing blur and opacity effects wherever possible.

Avoid unnecessary blur changes when a line has effectively reached its target.

If blur is expensive in the current rendering environment, optimize its application rather than removing this visual requirement.

Possible optimizations include reusing rendering layers, avoiding unnecessary filter changes, limiting expensive work to visible elements, and batching style updates.

Do not apply a large blur indiscriminately to every lyric line.

The result should preserve depth and hierarchy without making the interface unreadable.

---

# 7. POSITION AND SCALE TRANSITIONS

Preserve useful per-line spring behavior already implemented.

Every rendered line should have a well-defined target position from the continuous layout.

The global scroll/focus mechanism controls the field's overall movement.

The individual line animation controls appropriate local transitions, such as scale and any subtle position response already present in the reference implementation.

Avoid double-applying the same vertical displacement.

If the global scroll offset already moves a line through the viewport, do not add an independent full-strength per-line translation that duplicates the entire scroll movement.

A line's final position must remain consistent with the continuous layout model.

If per-line positional springs are necessary, define whether they represent absolute layout positions or local offsets, and use only one clear coordinate composition.

Requirements:

- The active line becomes prominent smoothly.
- Incoming lines acquire focus naturally.
- Outgoing lines lose focus naturally.
- Inactive lines retain correct relative ordering.
- No overlaps or unexpected gaps are introduced.
- No accumulated position drift occurs over successive transitions.
- No line is permanently displaced from its actual layout position.

Use independent position or scale spring state only where it provides a real visual benefit.

---

# 8. STAGGERED LINE TRANSITIONS

Investigate whether the existing renderer supports staggered transitions between lyric lines.

Use a subtle, configurable delay if it improves the reference behavior.

The delay should not make every line wait for the previous line to finish.

The intent is a cohesive propagation of motion through neighboring lyrics.

Do not assume a particular delay is an Apple Music constant. Tune it against the supplied reference.

Ensure that:

- Normal playback produces a flowing transition.
- Rapidly changing targets do not accumulate a queue of stale animation delays.
- New animation targets replace obsolete pending targets.
- Lines entering or leaving the visible region do not visibly pop.
- Staggering never delays audio/lyric synchronization itself.

The playback clock remains authoritative.

Staggering affects visual motion, not the actual timing of the song lyrics.

---

# 9. MAINTAIN EXISTING LYRIC SYNCHRONIZATION

Do not modify the existing audio clock, active-word timeline, lyric providers, parsing, or karaoke engine.

The existing playback state determines which lyric should be active.

The animation system determines how the lyric field and its visual emphasis respond.

Maintain a strict distinction:

```text
Playback clock
      ↓
Actual lyric state
      ↓
Target positions and focus
      ↓
Spring and transition calculations
      ↓
Rendered visual state
```

The current line must remain correct even if the animation is still settling.

Do not infer the active line from which line happens to be visually closest to the focus anchor.

Do not allow spring lag to delay karaoke highlighting.

Word-level or syllable-level highlighting must continue according to the existing audio-synchronized timestamps.

---

# 10. OPTIMIZE THE RENDERING PATH BEFORE ADDING COMPLEXITY

The current implementation may become expensive if every inactive line receives repeated spring calculations, blur updates, and reactive rerenders.

Profile it before making the effect more complex.

## Centralized animation loop

Use the existing centralized animation loop where possible.

Do not create a separate `requestAnimationFrame` loop for every lyric line.

The frame loop should efficiently update the relevant animation state and batch the corresponding visual changes.

## Avoid full-tree updates

Do not cause the entire lyrics component tree to rerender every frame just because one spring position or interpolation value changed.

Separate low-frequency lyric state from high-frequency visual animation state.

Use the most appropriate mechanism for the existing framework, such as isolated motion values, refs, cached animation state, or controlled DOM transform updates.

Do not introduce imperative DOM manipulation if the existing framework or animation library already provides an efficient and reliable rendering path.

## Cached layout

Cache line positions, heights, and relevant text measurements.

Invalidate them when actual layout inputs change, such as:

- Window or container dimensions.
- Font family or size.
- Lyric content.
- Text wrapping.
- Translation visibility.
- Relevant styling changes.

Do not repeatedly measure every lyric during every animation frame.

## Visible-line optimization

Maintain the complete logical lyric sequence and its coordinate model.

For expensive rendering or per-frame visual work, use a visible window and a reasonable overscan buffer where appropriate.

Do not use virtualization in a way that causes lines to pop into existence without correct positioning or visual state.

Inactive lyrics must remain correctly represented even when they are outside the viewport.

## Stop when settled

Stop scheduling animation frames when all relevant motion has settled.

Do not maintain infinite tiny blur/scale/position adjustments after the transition is visually complete.

Use reasonable thresholds for position error and velocity, then settle exact values to their targets.

## Avoid unnecessary rendering costs

Profile before adding GPU hints or changing rendering techniques.

Prefer efficient transforms and opacity updates when appropriate.

Avoid excessive use of CSS filters, forced GPU layers, large numbers of `will-change` declarations, or other optimizations that increase resource consumption without measurable benefit.

---

# 11. HANDLE RAPID CHANGES, SEEKING, AND LAYOUT CHANGES

Test the actual behavior under realistic playback conditions.

## Normal playback

The focus advances naturally and all inactive lines transition through the focus region.

## Rapid lyric changes

New targets replace obsolete targets without accumulating delayed animations.

Existing spring velocity should be handled deliberately rather than resetting every animation arbitrarily.

## Forward and backward seek

On a significant seek, immediately synchronize to the correct destination lyric.

Do not scroll through every intervening lyric as though the song were still playing normally.

Recalculate the correct layout target and resume the appropriate visual transition.

## Window resize

Recalculate the focus anchor and affected line positions.

Do not allow resizing to accumulate spring displacement or produce blank space.

## Variable-height lyrics

Handle lines that wrap into multiple rows.

The focus and layout calculations must use actual line geometry instead of assuming every lyric has identical height.

## Track changes

Preserve the existing track-transition behavior and prevent stale animation state from the previous track from affecting the new track.

## Reduced motion

Respect the application's existing reduced-motion preference while preserving correct lyric synchronization and readable focus changes.

---

# 12. IMPLEMENTATION WORKFLOW

Follow these phases in order.

### Phase 1 — Audit and benchmark

Inspect the existing animation architecture and profile a normal lyric transition.

Record the main performance problems and identify which files need modification.

### Phase 2 — Preserve existing functionality

Reuse the current playback clock, active-line calculation, lyric layout, spring engine, and animation utilities wherever appropriate.

Avoid replacing working code without evidence that replacement is necessary.

### Phase 3 — Establish the complete focus/layout model

Verify that the full lyric sequence has stable logical positions and that active focus can move through the sequence without reconstructing the layout around a small group of lines.

### Phase 4 — Implement per-line focus transitions

Create or refine the mapping from focus distance to target opacity, blur, scale, and other existing visual properties.

Ensure that incoming, outgoing, and distant inactive lines are all treated correctly.

### Phase 5 — Integrate spring-based motion

Connect the focus movement and individual line transitions to the existing animation system.

Ensure that the global scroll and local line animations do not duplicate movement.

### Phase 6 — Optimize

Profile the implementation again.

Address unnecessary rerenders, repeated layout reads, expensive blur/filter operations, unnecessary per-line updates, and animation loops that continue after settling.

### Phase 7 — Tune visually

Tune focus distance, opacity, blur, scale, spring damping, and any staggered timing against the supplied reference video and generated MP4.

Use visual evidence to choose the values. Do not claim that the values reproduce Apple's internal parameters.

### Phase 8 — Test and verify

Run relevant tests, type checking, linting, and the existing build.

Verify ordinary playback, rapid transitions, seeking, variable-height lyrics, window resizing, and the movement of inactive lines.

Do not stop after creating the initial animation. Inspect the actual result and refine it until it meets the acceptance criteria.

---

# 13. ACCEPTANCE CRITERIA

The implementation is complete only when the following are true.

### Whole lyric field

- The complete lyric sequence has a consistent layout model.
- Inactive lines remain correctly positioned and represented.
- The lyric field follows the active lyric through continuous spring-damped movement.
- The lyric sequence retains its order during transitions.

### Inactive lines

- Lines above and below the focus move through the layout naturally.
- Inactive lines do not remain visually static while the focus changes.
- Opacity and blur change smoothly as lines approach or leave focus.
- Scale and other existing focus properties transition coherently.
- The visual effect extends beyond only the previous and next lines.
- Distant inactive lines remain appropriately subdued.
- No abrupt state changes or distracting popping occur.

### Active line

- The active line remains synchronized to the actual playback state.
- Its position and emphasis transition naturally.
- Karaoke highlighting is unaffected by animation lag.
- It reaches the intended focus position without persistent bouncing.

### Performance

- The implementation does not force an unnecessary full-tree rerender every frame.
- Animation work is centralized and appropriately batched.
- Layout measurements are cached.
- Expensive work is limited to what can affect the screen.
- The animation stops when settled.
- Performance is measured instead of assumed.

### Regression safety

- Existing lyric providers, parsing, translations, background, player controls, and playback functionality remain unchanged.
- No additional animation system is introduced unnecessarily.
- Existing tests continue to pass, and new tests cover the modified behavior.

---

# 14. REQUIRED DELIVERABLES

When finished, report:

## A. Files changed

List the actual modified files and what each modification accomplishes.

## B. Animation model

Explain how the continuous lyric layout, focus target, spring movement, and inactive-line transitions work together.

## C. Inactive-line behavior

Explain specifically how opacity, blur, scale, and position change for incoming, active, outgoing, and distant lines.

## D. Optimization results

Document the actual bottlenecks found, the changes made, and any measurable performance differences. Do not invent benchmarks.

## E. Parameters

List the final spring, blur, opacity, scale, focus-distance, and stagger settings where applicable, and explain what each controls.

## F. Verification

Report the actual outcomes of tests, type checking, linting, build, and visual checks.

## G. Limitations

Document anything that could not be verified against the reference or any remaining visual/performance issues.

---

# FINAL REQUIREMENT

The final result must reproduce the following combined behavior:

**The active lyric advances in synchronization with playback. The complete lyric field moves continuously toward the focus. Every inactive line moves with the lyric sequence and transitions through its own appropriate visual emphasis. Lines become clearer and more prominent as they approach focus, then fade and blur as they leave it. Spring-driven movement and any staggered transitions remain smooth, restrained, and performant.**

Do not implement a generic scrolling list with a highlighted current line.

Do not implement an isolated bouncing stack.

Do not keep the inactive lyrics visually static.

**Focus on the entire moving field of lyrics, including all the blurred inactive lines, while preserving the continuous scroll and optimizing the animation system.**
