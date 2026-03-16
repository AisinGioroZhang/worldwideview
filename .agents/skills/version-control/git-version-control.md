---
name: git-version-control
description: General Git workflow rules for committing and bumping project versions at milestones.
---

# Git Version Control Rules

## Commits — Every Change

```bash
git add .
git commit -m "type: short description"
git push origin main
```

**Commit types:** `feat` | `fix` | `style` | `refactor` | `docs` | `chore` | `test`

Commits are working history — do them frequently. No version bump needed.

---

## Version Bumps — Milestones Only

| When | Command | Result |
|---|---|---|
| Bug fix shipped | `npm version patch` | `1.0.0 → 1.0.1` |
| Feature complete | `npm version minor` | `1.0.0 → 1.1.0` |
| Breaking change | `npm version major` | `1.0.0 → 2.0.0` |

After bumping:

```bash
git push origin main --tags
```

`npm version` automatically creates a Git commit + tag — no manual tagging needed.

---

## Rule of Thumb

- **Commit** = save point — do often
- **Version bump** = release point — do when something meaningful is done