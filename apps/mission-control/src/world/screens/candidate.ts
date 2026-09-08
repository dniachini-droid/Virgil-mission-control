/**
 * The candidate's identity, in one place.
 *
 * A review is of one exact immutable commit, so the string that stands for
 * it must not change while judgement proceeds — V6's walked every 0.7 s,
 * which pictured a candidate changing under review. It is **data-shaped and
 * is not a commit of this repository**; the screens and the panel both read
 * it from here rather than each computing one, so the two levels of detail
 * cannot disagree about which candidate they are describing
 * (`docs/process/PHASE_1_CONVERSATION_INTERFACE.md` §5b).
 *
 * The value is what `ScreenBank.tsx`'s `hex(7, 10)` produced from V6 to
 * V8.3, kept exactly so that the picture on the slab does not change with
 * the arrival of the panel.
 */
export const CANDIDATE_ID = '9abcdef012';
