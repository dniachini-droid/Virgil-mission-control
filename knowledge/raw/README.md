# Raw sources

Owner-curated, append-only. Agents read; they never edit or delete. Each `*.source.md` is a record (frontmatter per `schemas/raw-source-record.schema.json`) pointing at a canonical path and content hash. The master commission's canonical file lives in `docs/product/` and is referenced, not copied, so that a single editable copy exists. Sources the owner places directly in this directory are referenced the same way.
