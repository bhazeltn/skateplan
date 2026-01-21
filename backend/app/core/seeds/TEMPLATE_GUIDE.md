# Federation Levels Template Guide

This guide explains how to create a new federation levels JSON file for SkatePlan.

## File Naming Convention

`{FEDERATION_CODE}_levels.json`

Examples:

- `ISU_levels.json`
- `CAN_levels.json`
- `USA_levels.json`
- `GBR_levels.json` (Great Britain)
- `JPN_levels.json` (Japan)

---

## Top-Level Structure

### `federation_code` (string, required)

- **Format:** 3-letter ISO country code or federation acronym
- **Examples:** "ISU", "CAN", "USA", "PHI", "ISI", "UNIVERSAL"
- **Use ISO 3166-1 alpha-3 codes when possible**

### `federation_name` (string, required)

- **Format:** Full official name of the federation
- **Examples:** 
  - "International Skating Union"
  - "Skate Canada"
  - "U.S. Figure Skating"
  - "Philippine Skating Union"

### `streams` (array, required)

- Array of competitive streams within the federation
- Each stream represents a distinct competitive pathway

---

## Stream Structure

### `stream_name` (string, required)

- **Format:** Snake_case identifier (no spaces)
- **Purpose:** Internal identifier, used in database queries
- **Examples:**
  - "Singles"
  - "Podium_Singles"
  - "STARSkate_Singles"
  - "Excel_Series"
  - "Adult_Ice_Dance"

### `stream_display` (string, required)

- **Format:** Human-readable display name
- **Purpose:** What users see in the UI
- **Rules:**
  - If federation has only ONE stream per discipline → Use discipline name only
    - Example: "Singles", "Pairs", "Ice Dance"
  - If federation has MULTIPLE streams per discipline → Include stream identifier
    - Example: "Podium Pathway", "STARSkate", "Excel", "Adult"

**Display Examples:**

| Scenario                     | stream_name         | stream_display   |
| ---------------------------- | ------------------- | ---------------- |
| Single stream for Singles    | "Singles"           | "Singles"        |
| Multiple streams for Singles | "Podium_Singles"    | "Podium Pathway" |
| Multiple streams for Singles | "STARSkate_Singles" | "STARSkate"      |
| Adult stream                 | "Adult_Singles"     | "Adult"          |

### `discipline` (string, required)

- **Format:** Standardized discipline identifier
- **Allowed Values:**
  - `Singles` - Individual freeskating
  - `Pairs` - Pair skating
  - `Ice_Dance` - Partnered ice dance
  - `Solo_Dance` - Solo ice dance
  - `Synchro` - Synchronized skating
  - `Artistic` - Artistic/interpretive skating
- **MUST use these exact values** for proper discipline filtering

---

## Level Structure

### `name` (string, required)

- **Format:** Official level name as used by the federation
- **Examples:**
  - "Junior"
  - "STAR 5"
  - "Adult Gold"
  - "Excel Intermediate Plus"
  - "Pre-Juvenile"

### `order` (integer, required)

- **Purpose:** Determines sorting order within and across streams
- **Rules:**
  - Lower numbers = lower skill levels
  - Higher numbers = higher skill levels
  - Gaps between numbers are fine (allows future insertions)

**Recommended Order Ranges by Stream Type:**

| Stream Type                | Order Range | Example                 |
| -------------------------- | ----------- | ----------------------- |
| Youth Competitive Stream 1 | 1-99        | Podium Pathway Singles  |
| Youth Competitive Stream 2 | 100-199     | Excel Series            |
| Youth Competitive Stream 3 | 200-299     | Compete USA             |
| Pairs                      | 300-399     | Pairs levels            |
| Ice Dance                  | 400-499     | Ice Dance levels        |
| Solo Dance (competitive)   | 500-599     | Solo Dance levels       |
| Solo Dance (test-based)    | 600-699     | Solo Pattern Dance      |
| Synchro Stream 1           | 700-799     | Main synchro            |
| Synchro Stream 2           | 800-899     | Aspire synchro          |
| STARSkate Singles          | 1000-1099   | STAR 1-10               |
| STARSkate Other            | 1100-1599   | Other STARSkate streams |
| Adult Streams              | 2000+       | All adult categories    |

**Within a stream:** Increment by 1 or use logical gaps

- Basic Novice: 1
- Intermediate Novice: 2
- Advanced Novice: 3
- Junior: 4
- Senior: 5

### `is_adult` (boolean, required)

- **Purpose:** Identifies adult competitive levels
- **Values:**
  - `true` - Adult competitive level
  - `false` - Youth/open competitive level
- **Use Cases:**
  - Filters adult vs youth levels in UI
  - Applies adult-specific features
  - Determines eligibility rules

### `isu_anchor` (string or null, required)

- **Purpose:** Maps federation levels to ISU equivalent levels for international comparison
- **Allowed Values:**
  - `null` - No ISU equivalent (recreational, beginner, or federation-specific levels)
  - `"DEVELOPMENTAL"` - Pre-competitive/developmental levels (Pre-Juvenile, Juvenile, Basic Novice, Intermediate Novice, etc.)
  - `"NOVICE_ADV"` - Advanced Novice equivalent
  - `"JUNIOR"` - Junior level equivalent
  - `"SENIOR"` - Senior level equivalent

**When to Use Each Value:**

| isu_anchor        | When to Use                                                       | Examples                                                                |
| ----------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `null`            | Beginner, recreational, test-based, or federation-specific levels | STAR 1-10, Excel levels, Adult Bronze/Silver/Gold, Basic 1-6            |
| `"DEVELOPMENTAL"` | Early competitive levels, not yet advanced novice                 | Pre-Juvenile, Juvenile, Basic Novice, Intermediate Novice, Intermediate |
| `"NOVICE_ADV"`    | Advanced Novice or equivalent competitive level                   | Advanced Novice, Novice (in some federations), Pre-Novice (sometimes)   |
| `"JUNIOR"`        | Junior level or equivalent                                        | Junior                                                                  |
| `"SENIOR"`        | Senior level or equivalent                                        | Senior                                                                  |

---

## Common Patterns & Examples

### Pattern 1: Simple Federation (ISU Model)

One stream per discipline, competitive levels only:

```json
{
  "federation_code": "ISU",
  "federation_name": "International Skating Union",
  "streams": [
    {
      "stream_name": "Singles",
      "stream_display": "Singles",
      "discipline": "Singles",
      "levels": [
        {
          "name": "Basic Novice",
          "order": 1,
          "is_adult": false,
          "isu_anchor": "DEVELOPMENTAL"
        },
        {
          "name": "Advanced Novice",
          "order": 2,
          "is_adult": false,
          "isu_anchor": "NOVICE_ADV"
        },
        {
          "name": "Junior",
          "order": 3,
          "is_adult": false,
          "isu_anchor": "JUNIOR"
        },
        {
          "name": "Senior",
          "order": 4,
          "is_adult": false,
          "isu_anchor": "SENIOR"
        }
      ]
    }
  ]
}
```

### Pattern 2: Multiple Streams Per Discipline

Federation with Competitive + Recreational tracks:

```json
{
  "federation_code": "CAN",
  "streams": [
    {
      "stream_name": "Podium_Singles",
      "stream_display": "Podium Pathway",
      "discipline": "Singles",
      "levels": [
        {
          "name": "Novice",
          "order": 1,
          "is_adult": false,
          "isu_anchor": "NOVICE_ADV"
        }
      ]
    },
    {
      "stream_name": "STARSkate_Singles",
      "stream_display": "STARSkate",
      "discipline": "Singles",
      "levels": [
        {
          "name": "STAR 5",
          "order": 1001,
          "is_adult": false,
          "isu_anchor": null
        }
      ]
    }
  ]
}
```

### Pattern 3: Adult Levels

Adult competitive levels:

```json
{
  "stream_name": "Adult_Singles",
  "stream_display": "Adult",
  "discipline": "Singles",
  "levels": [
    {
      "name": "Adult Bronze",
      "order": 2001,
      "is_adult": true,
      "isu_anchor": null
    },
    {
      "name": "Adult Silver",
      "order": 2002,
      "is_adult": true,
      "isu_anchor": null
    },
    {
      "name": "Adult Gold",
      "order": 2003,
      "is_adult": true,
      "isu_anchor": null
    }
  ]
}
```

### Pattern 4: Solo Dance (Competitive) vs Solo Pattern Dance (Test-Based)

Some federations have both age-based solo dance AND test-based solo pattern dance:

```json
{
  "streams": [
    {
      "stream_name": "Solo_Dance",
      "stream_display": "Solo Dance",
      "discipline": "Solo_Dance",
      "levels": [
        {
          "name": "Junior",
          "order": 501,
          "is_adult": false,
          "isu_anchor": "JUNIOR"
        }
      ]
    },
    {
      "stream_name": "Solo_Pattern_Dance",
      "stream_display": "Solo Pattern Dance",
      "discipline": "Solo_Dance",
      "levels": [
        {
          "name": "Gold",
          "order": 601,
          "is_adult": false,
          "isu_anchor": null
        }
      ]
    }
  ]
}
```

---

## Decision Trees

### Should I create separate Ice_Dance and Solo_Dance?

**YES** - Always separate these disciplines:

- `discipline: "Ice_Dance"` for partnered ice dance
- `discipline: "Solo_Dance"` for solo ice dance

Even if they use the same level names, keep them separate for clarity.

### Should I include adult levels in this federation file?

**IF** the federation has CUSTOM adult level names/requirements → Include them
**IF** the federation uses standard Bronze/Silver/Gold/Masters → Skip them, use UNIVERSAL fallback

Examples:

- CAN has "Adult Intro Open" (custom) → Include in CAN file
- ISU has no adult structure → Skip, use UNIVERSAL
- USA has "Championship Adult Silver" (custom) → Include in USA file

### Should I create one stream or multiple streams for this discipline?

**ONE STREAM** when:

- Federation has only one competitive pathway for that discipline
- Example: ISU Singles (just Basic Novice → Senior)

**MULTIPLE STREAMS** when:

- Federation has distinct competitive tracks (Competitive vs Recreational vs Adult)
- Example: CAN has Podium_Singles, STARSkate_Singles, Adult_Singles

---

## Best Practices

1. **Always use exact official level names** from federation documentation
2. **Order numbering:** Leave gaps (10, 20, 30) if you anticipate future levels being added
3. **ISU anchors:** Only use for levels that truly map to ISU competitive structure
4. **Stream naming:** Be consistent within a federation
   - If you use "Podium_Singles", also use "Podium_Pairs", "Podium_Ice_Dance"
5. **Adult levels:** Always set `is_adult: true` for adult competitive categories
6. **Documentation:** When in doubt, consult the federation's official rulebook

---

## Validation Checklist

Before submitting a new federation file, verify:

- [ ] `federation_code` is 3 letters, uppercase
- [ ] `federation_name` is the official name
- [ ] All `discipline` values use allowed standardized values
- [ ] `order` values are unique within each stream and sorted correctly
- [ ] `is_adult` is set correctly for all levels
- [ ] `isu_anchor` values are only used for competitive levels with ISU equivalents
- [ ] `stream_display` names are user-friendly
- [ ] No duplicate level names within the same stream
- [ ] Adult levels use order 2000+

---

## Common Mistakes to Avoid

❌ **Using custom discipline names**

```json
"discipline": "Freeskate"  // Wrong!
"discipline": "Singles"    // Correct
```

❌ **Not separating Ice Dance and Solo Dance**

```json
// Wrong - combining into one stream
"discipline": "Dance"

// Correct - separate disciplines
"discipline": "Ice_Dance"
"discipline": "Solo_Dance"
```

❌ **Inconsistent stream naming**

```json
// Wrong
"stream_name": "Podium_Singles"
"stream_name": "Competitive_Pairs"  // Inconsistent naming

// Correct
"stream_name": "Podium_Singles"
"stream_name": "Podium_Pairs"
```

❌ **Using ISU anchors for recreational levels**

```json
{
  "name": "STAR 5",
  "isu_anchor": "DEVELOPMENTAL"  // Wrong! STAR levels are test-based, not competitive
}

{
  "name": "STAR 5",
  "isu_anchor": null  // Correct
}
```

---

## Need Help?

If you're unsure about how to structure a new federation:

1. Look at similar federations (ISU for simple, CAN/USA for complex)
2. Consult the federation's official rulebook
3. Ask: "What would a coach say when describing their skater's level?"
   - "My skater is Podium Junior" → Podium_Singles stream, Junior level
   - "My skater is STAR 7" → STARSkate_Singles stream, STAR 7 level

---

## Example: Creating a New Federation (GBR)

Let's say you're adding Great Britain (GBR):

```json
{
  "federation_code": "GBR",
  "federation_name": "National Ice Skating Association of UK",
  "streams": [
    {
      "stream_name": "Singles",
      "stream_display": "Singles",
      "discipline": "Singles",
      "levels": [
        {
          "name": "Basic Novice",
          "order": 1,
          "is_adult": false,
          "isu_anchor": "DEVELOPMENTAL"
        },
        {
          "name": "Advanced Novice",
          "order": 2,
          "is_adult": false,
          "isu_anchor": "NOVICE_ADV"
        },
        {
          "name": "Junior",
          "order": 3,
          "is_adult": false,
          "isu_anchor": "JUNIOR"
        },
        {
          "name": "Senior",
          "order": 4,
          "is_adult": false,
          "isu_anchor": "SENIOR"
        }
      ]
    }
  ]
}
```

**Notes:**

- GBR follows ISU structure → Simple one-stream-per-discipline model
- No custom adult levels → Will use UNIVERSAL fallback
- ISU anchors used for competitive levels

---

## File Locations

Place completed files in:

```
/backend/data/federation_levels/
├── ISU_levels.json
├── CAN_levels.json
├── USA_levels.json
├── PHI_levels.json
├── ISI_levels.json
├── UNIVERSAL_levels.json
└── {YOUR_FEDERATION}_levels.json
```
