# Agent Guidelines

## Git Workflow

### Branching
- Always create a feature branch for new work
- Branch naming: `feature/<description>`, `fix/<description>`, `chore/<description>`

### Commits
- Write clear, concise commit messages
- Use conventional commit format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Pull Requests
- **Always create a PR** for any changes to main
- **Never push directly to main**
- PRs must pass all checks (lint, typecheck, tests) before merging
- Request review from at least one team member
- Use PR template when available

### Merge Strategy
- Squash and merge for feature branches
- Rebase before merging to keep history clean
- Delete branch after merge

## Code Quality
- Run lint and typecheck before committing
- Write tests for new functionality
- Follow existing code conventions and patterns