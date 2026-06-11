# Design mockups — paths & exam

Static design mockups: source-of-truth references, NOT app code. Excluded
from lint/format/typecheck (biome `files.ignore`, per-package ESLint and
tsconfig never reach `docs/`).

- `*v2*` (catalog / detail, `.html` + `.jsx` + `.css`) — target of the
  deferred paths redesign; keep until that work lands.
- `Exam *.html` + `exam-*.css` — as-built reference of the shipped
  quiz/exam UI.
- `certificate.css`, `styles.css` — shared mockup styles.
