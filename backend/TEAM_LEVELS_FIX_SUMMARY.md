# Team Levels Selection - Fixed Issues

**Date:** 2026-01-21
**Status:** ✅ ALL ISSUES RESOLVED

---

## Problems Fixed

### ✅ Issue 1: Only Showing ONE Stream
**Problem:** When selecting "Canada + Pairs", only showing Adult stream instead of ALL streams (Podium Pathway + STARSkate + Adult)

**Root Cause:** AddTeamModal was using `/federations/{code}/levels` endpoint which was designed for individual skaters and includes fallback logic that filters to one stream.

**Solution:** Created new `/federations/{code}/team-levels` endpoint that returns ALL streams for a federation+discipline combination without fallback logic or age-gating.

**Test Results:**
```
CAN + Pairs now returns 9 levels across 3 streams:
- Podium Pathway: Juvenile, Pre-Novice, Novice, Junior, Senior (5 levels)
- STARSkate: Introductory Pairs, Open Pairs (2 levels)
- Adult: Adult Pair, Adult Masters Pairs (2 levels)
```

---

### ✅ Issue 2: Wrong Label Display
**Problem:** Showing "Universal Adult Bronze" instead of "Adult Bronze"

**Solution:** Added label cleanup logic in backend endpoint:
- Removes "Universal Adult " prefix → "Adult "
- Removes "ISU Standard: " prefix
- Converts standalone "Universal Adult" → "Adult"

**Test Results:**
```
BEFORE:
- Universal Adult Bronze
- Universal Adult Silver
- ISU Standard: Junior

AFTER:
- Adult Bronze
- Adult Silver
- Junior
```

---

### ✅ Issue 3: Missing Adult Filtering
**Problem:** Adult streams showing for non-adult athletes. Teams should only see adult levels if BOTH athletes are >= 18 years old.

**Solution:** Implemented client-side age-based filtering:
1. Added `dob` field to Skater interface
2. Calculate age for both selected athletes
3. Filter out levels where `is_adult=true` unless both athletes >= 18

**Logic:**
```typescript
const age1 = calculateAge(skater1.dob);
const age2 = calculateAge(skater2.dob);
const bothAreAdults = (age1 >= 18) && (age2 >= 18);

const filteredLevels = bothAreAdults
  ? allLevels  // Show all including adult
  : allLevels.filter(l => !l.is_adult);  // Hide adult levels
```

**Test Results:**
- ✅ Both athletes 15 years old → Adult streams hidden
- ✅ One athlete 15, one 25 → Adult streams hidden (both must be adults)
- ✅ Both athletes 25 years old → Adult streams shown

---

### ✅ Issue 4: UI Organization
**Problem:** Levels shown as flat list without stream context

**Solution:** Grouped levels by stream using `<optgroup>` HTML elements

**UI Structure:**
```
Select level...
├─ Podium Pathway
│  ├─ Juvenile
│  ├─ Pre-Novice
│  ├─ Novice
│  ├─ Junior
│  └─ Senior
├─ STARSkate
│  ├─ Introductory Pairs
│  └─ Open Pairs
└─ Adult (only if both athletes >= 18)
   ├─ Adult Pair
   └─ Adult Masters Pairs
```

---

## Files Modified

### Backend
**File:** `/backend/app/api/routes/federations.py`
- Added `TeamLevelRead` Pydantic model
- Added `GET /federations/{code}/team-levels` endpoint
- Returns ALL streams and levels without fallback
- Includes `is_adult` flag for frontend filtering
- Cleans up display names (removes "Universal", "ISU Standard" prefixes)

### Frontend
**File:** `/frontend/app/dashboard/roster/add-team-modal.tsx`
- Updated `Skater` interface to include `dob` field
- Updated `Level` interface to include `stream_id`, `stream_display`, `is_adult`
- Added `calculateAge()` helper function
- Changed endpoint from `/levels` to `/team-levels`
- Implemented age-based filtering logic
- Added stream-grouped dropdown UI with `<optgroup>`

---

## API Endpoint Specification

### New Endpoint: `GET /api/v1/federations/{federation_code}/team-levels`

**Parameters:**
- `federation_code` (path): Federation code (CAN, USA, ISU, etc.)
- `discipline` (query): "Pairs" or "Ice_Dance"

**Response:**
```json
[
  {
    "id": "uuid",
    "stream_id": "uuid",
    "stream_code": "PODIUM_PATHWAY",
    "stream_display": "Podium Pathway",
    "federation_code": "CAN",
    "discipline": "Pairs",
    "level_name": "Junior",
    "display_name": "Junior",
    "level_order": 40,
    "is_adult": false
  },
  {
    "id": "uuid",
    "stream_id": "uuid",
    "stream_code": "ADULT",
    "stream_display": "Adult",
    "federation_code": "CAN",
    "discipline": "Pairs",
    "level_name": "Adult Pair",
    "display_name": "Adult Pair",
    "level_order": 10,
    "is_adult": true
  }
]
```

**Key Features:**
- Returns ALL streams (no filtering)
- Returns ALL levels (both adult and non-adult)
- Clean display names (prefixes removed)
- Sorted by stream_display then level_order
- Frontend responsible for age-based filtering

---

## Testing Checklist

### Backend Tests
- ✅ CAN + Pairs returns 9 levels across 3 streams
- ✅ ISU + Pairs shows clean labels (no "ISU Standard:" prefix)
- ✅ UNIVERSAL + Pairs shows "Adult Bronze" not "Universal Adult Bronze"
- ✅ is_adult flag correctly set on all levels
- ✅ Endpoint returns 404 for invalid federation
- ✅ Endpoint handles missing discipline parameter

### Frontend Tests
- ✅ Levels grouped by stream in dropdown
- ✅ Adult streams hidden when both athletes < 18
- ✅ Adult streams hidden when one athlete < 18
- ✅ Adult streams shown when both athletes >= 18
- ✅ Clean display names (no unwanted prefixes)
- ✅ All streams visible (not just one)

### Integration Tests (Manual)
To test manually:
1. Navigate to `/dashboard/roster`
2. Click "+ Add Dance/Pair Team"
3. Select two junior athletes (age < 18)
4. Select federation: Canada
5. Select discipline: Pairs
6. Verify level dropdown shows:
   - Podium Pathway group (5 levels)
   - STARSkate group (2 levels)
   - NO Adult group
7. Change both athletes to adults (age >= 18)
8. Verify Adult group now appears with 2 levels

---

## Database Structure (Reference)

```sql
-- Federations table
CREATE TABLE federations (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255),
    country_name VARCHAR(100)
);

-- Streams table
CREATE TABLE streams (
    id UUID PRIMARY KEY,
    federation_code VARCHAR(10) REFERENCES federations(code),
    stream_code VARCHAR(50),
    stream_display VARCHAR(100),
    discipline VARCHAR(50)
);

-- Levels table
CREATE TABLE levels (
    id UUID PRIMARY KEY,
    stream_id UUID REFERENCES streams(id),
    level_name VARCHAR(100),
    display_name VARCHAR(150),
    level_order INTEGER,
    is_adult BOOLEAN  -- KEY FIELD for age-gating
);
```

**Example Data:**
```sql
-- Canada Pairs has 3 streams:
SELECT s.stream_display, COUNT(l.id) as level_count
FROM streams s
LEFT JOIN levels l ON l.stream_id = s.id
WHERE s.federation_code = 'CAN' AND s.discipline = 'Pairs'
GROUP BY s.stream_display;

-- Results:
-- Podium Pathway: 5 levels (is_adult=false)
-- STARSkate: 2 levels (is_adult=false)
-- Adult: 2 levels (is_adult=true)
```

---

## Summary

All reported issues have been fixed:

✅ **Multiple Streams:** All streams now shown (not just one)
✅ **Clean Labels:** Removed redundant prefixes
✅ **Age Filtering:** Adult levels only shown when both athletes >= 18
✅ **UI Organization:** Levels grouped by stream for clarity

The team level selection now works correctly with proper age-gating and comprehensive stream coverage.
