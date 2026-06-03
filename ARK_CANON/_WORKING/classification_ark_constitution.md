# CLASSIFICATION PASS — The Ark Constitution

> **Working document.** Faithful classification of the primary source
> `00_SOURCES/ark_constitution.source.md`. No content rewritten. This maps each section to
> its canonical home and flags supersessions. Source remains intact.

## Verdict at a glance
This is the **master source** — it feeds primarily `01_CONSTITUTION`, with heavy lore into
`02_WORLD_BIBLE` and dedications/origin into `05_HISTORY`. Crucially, it **predates** our
recent amendments, and in every case the amendment *amplifies* an existing clause rather
than overturning it.

---

## Section-by-section

| Section | Classification | Canon home | Notes |
|---------|---------------|------------|-------|
| Title / dedication ("Dedicated to Winston, the first Gardener") | Historical | `05` | Winston is the origin story; his arc closes the doc. |
| Preamble ("three voices… stops living scattered across chats") | Commentary / Historical | `05` | Origin narrative. Not binding law. |
| **Art. I — The Philosophy** ("Do all the good you can…") | **GOVERNING LAW** | `01` | The locked root line. Foundational. Verbatim, never altered. |
| **Art. II — Circle, Not a Ladder** | **LAW** (the circle principle) + World (the 5 stages) | `01` + `02` | Principle → 01; the staged lifecycle description → World Bible. |
| **Art. III — The Imaginal Truth** ("Di wings did inna yuh…") | World / Lore (with a locked line) | `02` | The central metaphor. The locked DaddyManism → also cited in `01`. |
| **Art. IV — The Tests** (Butterfly/Egg/Field/Father + "more life than it consumes") | **GOVERNING LAW** | `01` | The decision filter. ⚠️ Overlaps the forthcoming `THE_FOUR_TESTS` source — reconcile when pasted (likely the expanded version). |
| **Art. V — The Ark Score** (four acts of service; "no XP/points") | **LAW** (substance) | `01` | ⚠️ **SUPERSEDED TERMINOLOGY + REFINED** — see flags below. |
| **Art. VI — Ranks & Three Doors / Witness Stamp / sponsorship≠ownership** | **GOVERNING LAW** | `01` | ⭐ The **Witness Stamp is the original seed of "Witness, not Confer."** |
| **Art. VII — The Gardener** (no badge, never pursued) | **LAW** | `01` | "Conferred quietly and never pursued" — reconcile wording with Witness amendment. |
| **Art. VIII — The Faada** (stewardship not rank; frictionless exit) | **LAW** | `01` | "The door that lets the child leave is the love." |
| **Art. IX — The Trunk: Fatherlessness** (capability over retention) | **LAW** (the trunk) | `01` | The deepest principle. "Choosing maturity even when it costs retention." |
| **Art. X — The Guardrails** (6 bullets) | **GOVERNING LAW** | `01` | ⭐ Contains the **original safeguarding clause** — seed of SAFEGUARDING_ARCHITECTURE. |
| **Art. XI — The Mission & the Canon** (BPU, Adrian Cross, Ms. Vash, the films, mission statement) | World / Lore | `02` + `05` | Transmedia universe. The locked BPU Mission Statement → cited in `01` as locked words. |
| Closing — "THE CONSTITUTION" ("If I disappear tomorrow, does the good continue?") | **LAW** + Commentary | `01` + `05` | The test beneath the tests; Winston's resolution is historical. |
| Authorship note ("three voices held as equal collaborators") | Historical | `05` | Provenance. |

---

## ⚠️ Supersessions & reconciliations (the important part)

1. **"Good Done" → renamed "Livity."** Art. V's score is called *Good Done*; the live
   platform renamed it **Livity** (repo commit "Rename Good Done → Livity across API, web,
   mobile, DB"). The four acts map exactly: Good / Creation / Preservation / Reconciliation
   = `LivityType` enum. **Substance intact; term superseded.** Canon `01` should record
   Livity as the current term with "Good Done" noted as the original.

2. **"Does not measure XP" → refined by the Bait Strategy.** Art. V says the platform
   measures no XP/points. The later **locked bait strategy** (CLAUDE.md) permits XP *only*
   as entry bait (honey) on the Egg→Caterpillar onramp, capping at Caterpillar, with Livity
   as the true measure from the J-Shape up. This is a genuine **evolution** — not a
   contradiction if framed as "XP is bait, never the measure." Canon `01` must hold both:
   the Constitution's "status never comes from XP" AND the bait strategy's permitted use.
   **Flag for Drew: confirm the reconciliation wording.**

3. **"SunMan Publishing" → "DaddyMan Publishing" (no longer used).** Masthead names SunMan
   Publishing; CLAUDE.md marks it superseded. Historical naming → note in `05`.

4. **Witness Stamp (Art. VI) + "conferred quietly" (Art. VII) → amplified by
   Witness-not-Confer.** The Constitution *already* says stamps are given by a witness and
   "cannot be earned alone." Our amendment sharpened this at the J-Shape (witness, never
   gate). **Continuity, not conflict** — reconcile the word "conferred" → "witnessed" where
   it implies gating.

5. **Safeguarding clause (Art. X) → amplified by SAFEGUARDING_ARCHITECTURE.** Art. X's
   "background checks, no unsupervised one-on-one, runs through D.A.D.D.Y. Inc." is the
   *seed*; our doc is the full build-out (minor-pool segregation, logging, no private
   channel). Continuity.

6. **The Tests (Art. IV) ↔ forthcoming `THE_FOUR_TESTS` source.** Expect overlap. When that
   source is pasted, reconcile: which is canonical, which is the expanded commentary.

7. **Good Done dashboard ↔ EVIDENCE_ARCHITECTURE.** Art. V's "dashboard reads in lives, not
   numbers" is the seed of the Evidence doctrine (evidence describes, never scores). Our
   Evidence doc refines *how* service is witnessed without gaming. Continuity.

---

## Recommended canon routing (for the future migration pass — not now)
- **→ 01 CONSTITUTION:** Articles I, IV, V (as Livity), VI, VII, VIII, IX, X, the circle
  principle of II, the closing test. With supersession notes #1–#2 applied.
- **→ 02 WORLD BIBLE:** the 5-stage lifecycle (II), the Imaginal Truth (III), the BPU/films
  lore (XI).
- **→ 05 HISTORY:** dedication, preamble, Winston's arc, SunMan naming, authorship.

## Open questions for Drew
1. Confirm the **XP reconciliation** (#2): "XP is bait, never the measure" — acceptable?
2. Confirm **"Good Done" is fully retired** in favor of **Livity** in canon (#1).
3. When `THE_FOUR_TESTS` source arrives, is it the **authoritative** version of Article IV,
   or commentary on it? (#6)
