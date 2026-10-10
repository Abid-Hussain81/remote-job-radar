# Scoring Engine

This directory contains pure-function scoring logic to evaluate and rank incoming jobs against user keyword profiles.

## Scope
- Profile definitions (must-have keywords, preferred skills, negative/disqualifying keywords, location match bonuses).
- Deterministic calculation of `score`, `matchedKeywords`, and `scoreReasons`.
- 100% test coverage using Vitest.
