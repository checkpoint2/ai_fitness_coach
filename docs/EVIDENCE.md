# Evidence Policy

This policy controls which nutrition, training, recovery, body-composition, and safety claims may be
treated as product rules. It does not provide medical advice and does not claim that evidence research
has already been completed.

## Evidence Record

Every evidence-dependent rule records:

- an ID, topic, claim, and status;
- the applicable population and context, including relevant goal, age, sex, training status, health
  context, and exclusions;
- contraindications, exceptions, uncertainty, and known limitations;
- evidence strength and source type;
- source citations and publication details;
- the date last reviewed and the reviewer or approval process;
- the rule version and, when applicable, the rule it replaces.

Statuses are `DRAFT`, `REVIEWED`, `ACTIVE`, `DEPRECATED`, and `DISPUTED`. Only `ACTIVE` rules may be
presented as established product constraints. Product hypotheses and pilot defaults remain visibly
preliminary even when they are useful for testing.

## Sources And Strength

Prefer authoritative guidelines and consensus statements, then systematic reviews and meta-analyses,
high-quality randomized trials, relevant observational evidence, and finally clearly labelled expert
interpretation when stronger evidence is unavailable. Influencer posts, social media, SEO articles,
blogs, and promotional material may help discovery but cannot be the primary basis for a rule.

Strength depends on source quality, population match, methods, consistency, recency, limitations, and
applicability to the individual goal. Conflicting high-quality evidence is recorded as disagreement;
it is not silently resolved in favor of a convenient answer. Preserve supported ranges instead of
inventing a single optimal number.

## Rule Lifecycle

1. Define the exact product question and affected population.
2. Search authoritative guidance and the strongest relevant reviews and studies.
3. Record sources, methods, limitations, conflicts, and applicability.
4. Draft a claim no stronger than the evidence and identify contraindications.
5. Review and approve it through the agreed evidence process before marking it `ACTIVE`.
6. Version material changes and record `last_reviewed`.
7. Mark a rule `DEPRECATED` or `DISPUTED` when new evidence or safety concerns require withdrawal;
   future recommendations stop using it without rewriting historical records.

No numerical calorie, macronutrient, weight-change, training, sleep, or safety threshold becomes a
global product constant merely because it is common fitness advice. It must be evidence-reviewed and
applied with goal, context, data quality, and relevant contraindications.

## Product Decisions Versus Medical Recommendations

A product decision defines experience, such as using a four-week planning cycle or asking the user to
confirm a change. A medical or physiological claim states what is effective, safe, diagnostic, or
appropriate for a population and therefore requires evidence review. Product UX must not disguise an
unreviewed physiological assumption as a safety guarantee.

The product is not a diagnostic service. Evidence rules constrain the coach but do not replace an
individual clinical assessment. Escalation to a qualified professional is appropriate when the
question crosses the product's medical boundary.

## Pilot Settings Awaiting Review

The following are `DRAFT` evidence-dependent pilot hypotheses. No evidence review or source approval
is claimed yet:

| ID | Preliminary setting | Required review |
| --- | --- | --- |
| `EV-PILOT-001` | About a 15% calorie deficit as a possible fat-loss starting point | Population, range, contraindications, adjustment logic, and safety boundaries |
| `EV-PILOT-002` | About a 10% calorie surplus as a possible muscle-gain starting point | Population, range, training context, adjustment logic, and unnecessary fat-gain risk |
| `EV-PILOT-003` | At least four confirmed nutrition days before weekly interpretation | Whether data sufficiency depends on distribution, goal, completeness, and decision type |
| `EV-PILOT-004` | No confident weight-based adjustment before two weeks | Trend method, measurement frequency, exceptions, and goal-specific decision rules |
| `EV-PILOT-005` | At least two comparable measurements before comparison | Measurement reliability, comparability criteria, interval, and body-site differences |

Until review, these settings cannot be described as proven norms, immutable global constants,
guarantees of result or safety, or substitutes for individual context. They may be revised or removed
without changing the approved product goal or screen structure.
