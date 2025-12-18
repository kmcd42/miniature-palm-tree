# CLAUDE.md - AI Assistant Guide

## Repository Overview

**Repository Name**: miniature-palm-tree
**Owner**: kmcd42
**Status**: Early stage / Minimal structure
**Last Updated**: 2025-12-18

This repository is currently in its initial stages with minimal content. This document serves as a guide for AI assistants (like Claude) working with this codebase.

## Current Repository Structure

```
miniature-palm-tree/
├── .git/                 # Git version control
├── README.md             # Project README
└── CLAUDE.md            # This file - AI assistant guide
```

### Key Files

- **README.md**: Basic project description and overview

## Development Workflows

### Git Branching Strategy

This repository follows a branch naming convention for AI-assisted development:

- **Feature branches**: `claude/<description>-<session-id>`
- **Current working branch**: `claude/add-claude-documentation-ZiQWc`
- Branches must start with `claude/` and end with matching session ID for proper access control

### Git Operations Best Practices

#### Pushing Changes
- Always use: `git push -u origin <branch-name>`
- Branch naming is critical for authentication
- Retry on network failures: up to 4 times with exponential backoff (2s, 4s, 8s, 16s)
- **Never** push to branches without proper `claude/` prefix

#### Fetching/Pulling
- Prefer specific branches: `git fetch origin <branch-name>`
- Use same retry logic as pushing for network resilience

#### Committing
- Write clear, descriptive commit messages
- Focus on "why" rather than "what"
- Use conventional commit style when applicable
- Never skip hooks without explicit permission

### Pull Request Workflow

When creating pull requests:
1. Ensure all changes are committed and pushed to the feature branch
2. Use `gh pr create` with descriptive title and body
3. Include:
   - **Summary**: 1-3 bullet points of changes
   - **Test plan**: Checklist of testing steps
4. Always provide the PR URL after creation

## Code Conventions

### General Principles

1. **Avoid Over-Engineering**
   - Only make changes that are directly requested or clearly necessary
   - Don't add features beyond what was asked
   - Keep solutions simple and focused
   - Don't add unnecessary error handling, comments, or abstractions

2. **Security First**
   - Watch for common vulnerabilities (XSS, SQL injection, command injection, etc.)
   - Validate at system boundaries (user input, external APIs)
   - Trust internal code and framework guarantees
   - Fix security issues immediately upon discovery

3. **Read Before Modifying**
   - Always read files before suggesting modifications
   - Understand existing patterns and conventions
   - Maintain consistency with the current codebase

4. **Backwards Compatibility**
   - Avoid backwards-compatibility hacks
   - If something is unused, delete it completely
   - Don't keep dead code with comments like "removed"

### File Operations

- **Use specialized tools**: Read, Edit, Write instead of bash commands
- **Parallel operations**: Run independent operations concurrently
- **Prefer editing**: Always edit existing files rather than creating new ones when possible

### Documentation

- **Don't create documentation files proactively**: Only create .md files when explicitly requested
- **Keep comments minimal**: Only comment where logic isn't self-evident
- **Don't add docstrings** to code you didn't change

## Task Management

### Using Todo Lists

AI assistants should use the TodoWrite tool for:
- Complex multi-step tasks (3+ steps)
- Non-trivial implementations
- Multiple user-requested tasks
- Tracking progress on larger features

**Don't use TodoWrite for**:
- Single straightforward tasks
- Trivial operations
- Purely conversational requests

### Task Lifecycle

1. **Planning**: Break down complex tasks into specific, actionable items
2. **In Progress**: Mark ONE task as in_progress before starting
3. **Completion**: Mark completed IMMEDIATELY after finishing
4. **Updates**: Update status in real-time as work progresses

### Completion Criteria

Only mark tasks completed when:
- ✅ Implementation is fully finished
- ✅ Tests are passing (if applicable)
- ✅ No errors or blockers remain

Keep as in_progress if:
- ❌ Tests are failing
- ❌ Errors encountered
- ❌ Implementation is partial
- ❌ Blocked on external factors

## Communication Style

- **Concise and clear**: Output is displayed in CLI, keep responses short
- **Technical accuracy**: Prioritize facts over validation
- **No emojis**: Unless explicitly requested by user
- **Direct communication**: Use response text, not bash echo or code comments
- **No timelines**: Provide implementation steps without time estimates

## File Exploration Strategy

When exploring the codebase:

1. **Use Task tool with Explore agent** for:
   - Understanding overall structure
   - Finding where functionality is implemented
   - Non-specific exploratory questions

2. **Use Glob directly** for:
   - Finding specific files by pattern
   - Locating specific classes or functions

3. **Use Grep directly** for:
   - Searching for specific code patterns
   - Finding usage of specific functions/variables

4. **Use Read directly** for:
   - Reading specific known file paths
   - Reviewing changes before editing

## Security Context

This repository may be used for:
- ✅ Software development
- ✅ Educational purposes
- ✅ Authorized security testing
- ✅ CTF challenges
- ✅ Defensive security

AI assistants must refuse requests for:
- ❌ Destructive techniques
- ❌ DoS attacks
- ❌ Mass targeting
- ❌ Supply chain compromise
- ❌ Detection evasion for malicious purposes

## Project-Specific Notes

*As this repository grows, add project-specific conventions here:*

### Architecture Decisions
- *To be documented as project develops*

### Testing Strategy
- *To be documented when tests are added*

### Build and Deployment
- *To be documented when build process is established*

### Dependencies
- *To be documented when dependencies are added*

### Coding Standards
- *To be documented as coding patterns emerge*

## Changelog

- **2025-12-18**: Initial CLAUDE.md created with comprehensive AI assistant guidelines
- **2025-12-18**: Repository initialized with basic README

## References

- Repository: `miniature-palm-tree`
- Owner: `kmcd42`
- Current branch: `claude/add-claude-documentation-ZiQWc`

---

**Note for AI Assistants**: This document should be kept up-to-date as the repository evolves. When significant architectural decisions are made, new patterns emerge, or development workflows change, update this document accordingly.
