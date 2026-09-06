# Master commission provenance and integrity record

The canonical master commission is `docs/product/VIRGIL_MASTER_COMMISSION.md`. It is the only copy. Knowledge-layer raw-source records reference it by path and hash and must never duplicate it into a second editable copy.

## Versions

| Version | Content | Lines | Bytes | SHA-256 |
|---|---|---|---|---|
| Owner original attachment (as reported by owner) | Sections 1 to 14 | 1,031 | 44,373 | 95e8cc690d8b87ebd8999ee078f64b3e37ec94c2599211927788ed7d9ac80e29 |
| Repository copy, commit 3993393 | Sections 1 to 14 as received in-session | 1,031 | 45,125 | 68b43efa9c8eff70b11b48d9390e9b3c4e92690c6d61febe4b0ddefb7118c8b1 |
| Repository copy after Amendment 1 | Sections 1 to 14 plus amendments register and Amendment 1 | 1,978 | 77,076 | 15c658bfbfddfc98adb13fbb2d6d74b8445225dac73bc723e925fd238a96e654 |

## Integrity analysis of the 752-byte difference

Performed 2026-09-06 before any amendment.

Facts established:

- Line count is identical: 1,031 lines in both the owner's original and the repository copy. Every paragraph, bullet, heading and tree line is therefore present in the same count.
- The repository copy uses LF line endings only, has no trailing whitespace, ends with a single newline, and is unchanged under Unicode NFC and NFKC normalisation.
- The repository copy contains ten non-ASCII code points: U+2022 bullet (443), U+2500 box horizontal (224), U+251C (47), U+2014 em dash (43), U+2502 (37), U+2514 (9), U+2192 arrow (8), U+201C and U+201D curly double quotes (7 each), U+2019 curly apostrophe (6).
- The first 1,031 lines of the amended file are byte-identical to commit 3993393 (verified with `cmp`).

Attempted reproduction: every combination of plausible ASCII substitutions for those ten code points (bullet to `-`, `*`, `o` or removed; box drawing to `-`, `|`, `+`, backtick; em dash to `-`, `--`, ` - `, en dash; arrow to `->` or `=>`; curly quotes to straight), with and without a trailing newline, was hashed. None produced 44,373 bytes or the owner's hash. The exact cause therefore could not be determined from inside this session, because the original attachment bytes are not available here; the session received the commission as rendered message text.

Assessment: the matching line count and the verbatim transcription of the message text make a substantive content difference improbable. The most likely cause is attachment transport re-rendering of list markers, typography or indentation. This is recorded as an open verification item, not a confirmed equivalence.

## Owner verification (one command)

Run from the repository root with the original attachment saved as `original.txt`:

```sh
git show 3993393:docs/product/VIRGIL_MASTER_COMMISSION.md > /tmp/repo-copy.txt
diff <(sed -e 's/\r$//' original.txt | sed -e 's/^\([[:space:]]*\)[-*] /\1• /') /tmp/repo-copy.txt
```

An empty diff, or a diff confined to list markers and typographic punctuation, confirms transport formatting only. Any diff touching words, headings, requirements, directory trees or product principles must be reported and the commission corrected before further phases build on it.

## Amendment 1

Issued by the owner on 2026-09-06 with the Phase 0 approval. Appended verbatim after an amendments register. Sections 1 to 14 were not edited. Recorded as owner decision OD-0001 in `docs/decisions/`.
