# LAB-8 2.0 Campaign Plan

## Goal
Evolve LAB-8 from a single endless laboratory runner into a four-level campaign while keeping the browser-only, dependency-free architecture.

## Campaign
1. LABORATORIO — baseline physics, Palace boss.
2. CASA — faster/heavier physics, Giant Alien boss.
3. SOTT'ACQUA — lower gravity/slower motion, Palace boss.
4. MARTE — very low gravity/long jumps, Giant Alien boss.

## Gameplay rules
- 3 starting lives, maximum 5.
- Damage removes one life and grants 1.5 s invulnerability.
- Game over only at 0 lives.
- Rare life pickup can restore one life.
- Defeating a boss completes the current level.
- Score and lives carry to the next level.
- Hazards may have different speeds but every generated threat must have at least one valid counter: jump, shoot or pass under.

## Architecture
- `levels.js`: immutable level definitions (physics, palette, hazards, boss).
- `campaign-core.js`: pure campaign/lives/fairness rules.
- `campaign-game.js`: campaign runtime state facade.
- `game.js`: existing simulation/render loop, progressively wired to campaign definitions.

## Delivery blocks
- L2001 Level Engine
- L2002 Lives & Damage
- L2003 Hazard/Fairness Engine
- L2004 Four Worlds
- L2005 Giant Alien Boss
- L2006 Campaign Flow & Polish

## Current branch status
The branch introduces the 2.0 definitions/core, campaign state facade, dedicated regression tests, CI coverage and PWA cache entries. Runtime integration into `game.js` follows incrementally to avoid a single unsafe rewrite of the existing simulation.
