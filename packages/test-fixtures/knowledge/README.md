# Knowledge fixtures

Miniature knowledge trees for Mind Scan tests (`packages/knowledge-graph/test/lint.test.ts`). `clean/` must produce zero findings. Every other directory produces exactly the finding class named in `docs/architecture/MIND_SCAN.md`. Each tree has its own `knowledge/` directory and `sources/` files so hashes are self-contained; `stale-hash` and `echo-chamber` deliberately modify a source after sealing.
