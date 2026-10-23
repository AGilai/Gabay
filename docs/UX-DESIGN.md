# Gabbai app: UX design (draft 3, 2026-10-22)

Status: draft for review. No implementation choices yet: platform, storage and calendar library are
discussed after this is approved. Mockup: `design/mockups/ux-screens.html` (published as an artifact).

## Decisions from the gabbai's review of draft 1
1. **No hints on the main page.** Someone may look at the phone. Hints and nicknames appear only on
   the choosing page and the person card.
2. **3 or 4 aliyot is a manual switch** on the main page. The calendar only sets the default
   (Rosh Chodesh / Chol HaMoed = 4).
3. **The choosing page is a main page of its own.** Picking a person sends him straight to his place
   on the main page: Kohen → כהן slot, Levi → לוי slot, Israel → the first free Israel slot.
4. **"אין כהן" is a switch on the main page.** When it is on, the Kohen and Levi slots are off and
   every slot is Israel (the first is "ישראל במקום כהן"). "אין לוי" is a switch next to it.
5. **Regulars are never demoted automatically.** The person card has a "הפסק להציע" (stop suggesting)
   button. A stopped person is left out of the line but search still finds him.
6. **No grey-out.** Someone called recently simply sinks to the end of the line (Kohanim and Leviim
   are a small group and come up almost every week).
7. **The calling line is one free-text line, written in full by the gabbai** ("נחמיה בן ברוך הכהן",
   "הרב דוד בר' אלקנה"). The app adds nothing to it, not even הכהן / הלוי. There are no separate
   Hebrew-name / father-name fields.
8. **Nusach Sfard, Israel calendar.**
9. **Starting data:** import the WhatsApp log the gabbai has kept so far (§7, S8).
10. **Seating chart:** use the Excel chart for its **layout only**. Its names are the Shabbat seating
    and don't apply to weekdays.

## 1. What the app is for

One user: the gabbai, during the weekday morning service, with the phone in one hand. The app has
three jobs:

1. **Call fairly.** Suggest who should get the next aliyah: the person who has waited longest,
   within his group (Kohen / Levi / Israel). It must not keep suggesting people who came once and
   never returned.
2. **Remember people.** On the choosing page, show the name with the gabbai's private hint. On the
   main page, show only the name and the calling line.
3. **Have the texts ready.** Mi Sheberach and the other prayers, with the names already filled in.

All UI is Hebrew and right to left.

## 2. Usage conditions

| Condition | Design consequence |
|---|---|
| Used live, under time pressure | The main screen shows the whole reading on one screen without scrolling. Assigning takes 1–2 taps, marking an aliyah done takes 1. |
| One hand, standing at the bimah | Main actions in the lower 2/3 of the screen. Touch targets ≥ 48 dp. Every swipe also has a button. |
| Other people can see the screen | No hints or nicknames on the main page or in the prayer texts. |
| Dim light, discretion | Dark theme by default (follows the phone). No sounds. The screen stays awake on the main page. |
| Sometimes no reception | Fully offline. |
| Mistakes happen | Everything can be undone. Only aliyot marked "עלה ✓" count. |

## 3. Terms used in the UI

| UI term | Meaning |
|---|---|
| קריאה | Today's Torah reading (one per service) |
| מקום (slot) | One aliyah position: כהן, לוי, שלישי, רביעי |
| תור | The fairness order |
| חיוב | A person with an obligation today: yahrzeit, bar mitzvah, groom, new father, Gomel |
| רמז | The gabbai's private hint for a person (choosing page and card only) |
| שם לקריאה | The calling line, free text written by the gabbai |
| קבוע / מזדמן | Regular / occasional attendee |
| מושהה | "Stop suggesting" is on: left out of the line, still found by search |

## 4. A person

Quick add needs only the fields marked \*.

- Display name\* ("יוסי לוי"), used on the main page and in lists
- Group\*: כהן / לוי / ישראל
- **שם לקריאה**: one free-text line, read out exactly as written, including הכהן / הלוי.
- Hint (nickname, appearance, seat). Private: choosing page and card only.
- Regular / occasional (§8)
- Stop suggesting: on / off
- Yahrzeit dates (Hebrew date + for whom), which make him a חיוב on the right day
- Preferred seat (phase 2 map; a free-text field for now)
- History: his aliyot (date, slot)

## 5. Day types and number of aliyot (Israel calendar)

The calendar sets the **default** number of aliyot and a banner. The 3 / 4 switch on the main page
always wins, and the choice is kept for that day only.

| Day | Default | Banner |
|---|---|---|
| Monday / Thursday | 3 | Parasha of the coming Shabbat |
| Rosh Chodesh | 4 | "ראש חודש ___ · הלל · יעלה ויבוא" |
| Chol HaMoed | 4 | Name of the festival |
| Chanukah (Rosh Chodesh Tevet: 4) | 3 | "חנוכה, נר ___" |
| Purim, fast days, Tisha B'Av | 3 | Name of the day |
| Shabbat / Yom Tov | not shown | |

## 6. Screen map

```
 ┌──────────────── Bottom bar (4 tabs) ────────────────┐
 │   קריאה        בחירה         חולים          עוד       │
 └─────────────────────────────────────────────────────┘
 קריאה (S1, main page) ◀──pick a person: goes straight into his slot── בחירה (S2, choosing page)
   ├─ tap an empty slot ─▶ S2 on that slot's tab (the pick goes into that slot)
   ├─ tap a filled slot ─▶ slot actions (S3)
   └─ tap a prayer chip ─▶ prayer text (S4)
 S2: long-press a row ─▶ person card (S5) · "+ אדם חדש" ─▶ quick add (S5)
 חולים (S6) · עוד: history (S7), import from WhatsApp (S8), settings (S9)
```

The choosing page is also the people list: its search finds everyone, stopped people included.
The app opens on S1.

## 7. Screens

### S1 · קריאה (main page)

From top to bottom:

1. **App bar:** "קריאת התורה" + weekday · Hebrew date · parasha.
2. **Banner** on special days (Rosh Chodesh etc.).
3. **Control row:** the **3 | 4** segmented switch, then toggle chips **אין כהן** and **אין לוי**.
4. **Slots** (3 or 4 cards). A slot shows **only** the slot label (`כהן`, `לוי`, `שלישי`, `רביעי`,
   `ישראל במקום כהן`…), the display name and the calling line exactly as the gabbai wrote it. No
   hints. A slot can be:
   - **Empty:** "+ בחר ___" and a one-tap suggestion "הבא בתור: דוד פרץ · 47 יום".
   - **Assigned:** name + calling line + the button "עלה ✓".
   - **Done:** green, with the time. Recorded in history at this moment.
   The next slot to act on has a highlighted outline.
5. **Prayer chips:** `מי שברך לעולה` · `לחולים (n)` · `בר מצווה` · `יולדת` · `אזכרה`.
6. Bottom bar.

**אין כהן on:** the כהן and לוי labels are crossed out and every slot becomes Israel: `ישראל במקום
כהן`, `שני`, `שלישי` (and `רביעי`). Anyone already placed as Kohen or Levi is taken out of the
slot, and a snackbar offers "בטל" (undo). **אין לוי on:** the לוי slot becomes `כהן במקום לוי` and
gets the Kohen of the first slot automatically.

### S2 · בחירה (choosing page, second main page)

Reached from the bottom bar (opens on the tab of the next empty slot) or by tapping an empty slot
(opens on that slot's tab).

- **Tabs:** כהנים · לויים · ישראלים, with counts. When "אין כהן" is on, the כהנים and לויים tabs are
  not offered for picking (they can still be browsed by search).
- **Search** (sticky): name, calling line, hint. Finds stopped and inactive people too.
- **List order** (§8): חיוב היום → the line, longest wait first. Each row shows the name · the hint
  · the days since his last aliyah. Someone called recently is just at the end. No grey-out.
- **Tap a row → he goes straight to his place on S1** and S1 is shown:
  - opened from a slot → into that slot;
  - otherwise → his group's slot (Israel: the first free one);
  - the slot is taken → he replaces the person in it if that person isn't marked done yet, with a
    snackbar "הוחלף את ___ · בטל" (replaced ___ · undo). If every Israel slot is done, a snackbar
    says so and nothing changes.
- People already placed today are marked "בקריאה" (in the reading) at the top of the list and can't
  be picked twice.
- **Long-press a row** → person card. **"+ אדם חדש"** → quick add.
- The collapsed section "מזדמנים שלא נראו חצי שנה (n)" sits at the bottom.

### S3 · Slot actions (bottom sheet when a filled slot is tapped)

סמן שעלה / בטל סימון · החלף (→ S2 on that tab) · פנה מקום · כרטיס אישי. The header shows the name
only, no hint.

### S4 · Prayer text (nusach Sfard)

- Full-screen reading view in large serif type, with A− / A+.
- **Mi Sheberach for the oleh:** today's olim to pick from (the default is the last one marked
  done). His **calling line** is inserted.
- **Sick:** names from the sick list (each one free text, e.g. "רפאל בן שרה"). Male, female and plural
  wording are picked from the list. Checkboxes choose who to include this time.
- **Bar mitzvah / new mother / memorial:** type or pick the name at the top.
- The texts are the shul's own nusach Sfard wording, entered once in settings. The app ships with
  placeholders only.

### S5 · Person card / quick add

- **Quick add:** name\*, group\* (already set from the tab), calling line, hint → "שמור והצב".
- **Card:** every field from §4; "עלה לאחרונה לפני 47 יום · 9 עליות השנה"; the aliyot history; the
  regular / occasional switch; and the **"הפסק להציע"** button. When it is on, the card shows
  "מושהה, נמצא רק בחיפוש" (paused, found only by search) and the button reads "חזור להציע"
  (suggest again).

### S6 · חולים (sick list)

Each entry is one free-text line plus male / female and the date added. Add, remove ("הבריא"). After 30 days the
app asks once whether to keep praying for him or her.

### S7 · היסטוריה

Readings by date. Open one to fix it or to enter a past reading.

### S8 · ייבוא מוואטסאפ (import from WhatsApp, one time)

**What the log looks like** (the export "עליות שני וחמישי", 30/01/2025 – 22/10/2026):
- One message per aliyah: `[dd/mm/yyyy, hh:mm:ss] Asaf: <calling line> (<note>)`. Sometimes several
  lines in one message, a forwarded list from another gabbai, or "deleted" / "pinned" / "." noise.
- 622 aliyot, **139 different people: 17 Kohanim, 18 Leviim, 104 Israel**. Usually 3 per day,
  4 on Rosh Chodesh and Chol HaMoed.
- The group comes from the end of the line: `הכהן` / `הלוי` / neither.
- Text in parentheses is a hint: a family name (`גרינברג`), a nickname (`זלמי`), or a note
  (`בית חולים`, `קביים`, `חתן של הירש`).
- **58 people came up once. 63 have not come up for over 6 months.** This confirms the demotion
  rule: without it, almost half the line would be people who don't come any more.
- Two Kohanim (נחמיה בן ברוך, עזרא בן גבריאל) and two Leviim (אלחנן בן יואב, שלמה בן הרב אברהם
  אליעזר) carry most of their groups. This is a small, repeating group, as the gabbai said.

**What the import does:**
1. Pick the exported `.zip` / `.txt`.
2. The app groups the lines into people. Lines are the same person when they match after ignoring
   the parentheses, extra spaces, `בר'` vs `בן`, and `הרב`. For each person: the calling line (the
   most recent spelling, without the parentheses), group (the majority: `נחמיה בן ברוך` appears 3
   times without `הכהן` and 61 times with it), hints (from the parentheses), number of aliyot, and
   last date.
3. **Review screen**, one card per question, with only the questions that need you:
   - *Same person?* Near-identical spellings: `אליעזר` / `אליעעזר`, `שמאל` / `שמואל`, `דב` / `דוב`,
     `בן` / `ר'`. → Merge / Keep separate.
   - *Which group?* Only a real conflict: Kohen against Levi (`זבולון בן הרב אפרים מנשה`: 45× הלוי, 1× הכהן),
     or mostly Israel with some הכהן / הלוי lines (`שמעיה בן אלישע`: 4× / 2× הלוי, which may be two people).
     A missing הכהן / הלוי is treated as a slip (`נחמיה בן ברוך`: 61× הכהן, 3× without it) and asks nothing.
   - *Is this a hint?* A parenthesis that looks like a name (`(נעמה בת אביגיל)`). → Hint / Remove.
4. "ייבא": people are created, regular when they had 3+ aliyot in the last **12 months**. The log is
   sparse, so 90 days would mark only 4 people as regular. Their aliyot go
   into history, so the line is right from the first day.

The display name defaults to the calling line without `הרב` / `הכהן` / `הלוי` ("נחמיה בן ברוך"). It never
comes from the parentheses, because a hint must not reach the main page. It can be edited later.

### S9 · הגדרות

Prayer texts; the inactivity threshold for occasional people (default 6 months); theme; backup /
export.

## 8. The fairness order

Attendance is inferred from aliyot: "עלה ✓" means he was there, and his last aliyah is his "last
seen".

Inside each tab:

1. **חיוב היום** first.
2. **The line:** everyone who is not stopped and not inactive, by **days since his last aliyah, longest
   first**. Never called = top, by the date he was added. Ties: fewer aliyot in the last 12 months
   first. Someone called last week is simply near the bottom.
3. **Inactive:** only **occasional** people whose last aliyah is over 6 months ago. They sit in the
   collapsed section and are never suggested. One aliyah makes them active again.
4. **Regulars are never inactive automatically.** The gabbai stops one by hand ("הפסק להציע").
   Stopped people appear only in search.
5. An occasional person with 3 aliyot in 90 days → one prompt "להפוך לקבוע?" (make him a regular?).

The S1 one-tap suggestion is the first row of (1)+(2) that isn't already in a slot today.

## 9. Key flows

**A normal Thursday.** Open → S1, 3 slots. Kohen: tap the suggestion. Levi: the suggested man isn't
here → bottom bar "בחירה" → tab לויים → tap someone → back on S1, he is in the לוי slot. Israel:
the suggestion. "עלה ✓" after each aliyah.

**No Kohen.** S1 → "אין כהן" → all slots are Israel → fill as usual.

**Rosh Chodesh came up 3 instead of 4 (or the reverse).** Tap 3 / 4.

**A new face.** בחירה → ישראלים → "+ אדם חדש" → name, hint → "שמור והצב".

**A regular moved away.** Card → "הפסק להציע". Months later he visits: search → tap → he is in.

## 10. Visual and interaction principles

- Hebrew RTL. Hebrew dates in Hebrew numerals. Day counts in digits.
- A colour per group: כהן gold, לוי teal, ישראל violet. Green = done only. Orange = חיוב only.
- A classic Hebrew serif for what is read aloud (names, calling lines, prayers). A clean sans for
  the UI.
- Dark theme first. No confirmation dialogs: undo snackbars instead.

### 10.1 Android sizing (Material 3, in dp / sp)

Portrait only. Design widths are 360 dp (Galaxy A, the smallest that must work), 384 dp (Galaxy S) and
412 dp (Pixel, S+). The mockup is drawn at 1 px = 1 dp, with a width switch.

| Element | Size |
|---|---|
| Status bar / gesture bar | 24 dp / 24 dp (edge to edge, content kept clear of them) |
| Top app bar | 64 dp |
| Control row (3 | 4 switch, toggle chips) | 40 dp high, with 48 dp touch areas |
| Bottom navigation bar | 80 dp, 4 destinations, active indicator 64×32 dp |
| Touch targets | ≥ 48 dp. Main buttons 48 dp, pill shaped |
| Slot card | about 104 dp (3 slots); about 88 dp compact (4 slots) |
| List row (S2) | 72 dp, 40 dp avatar |
| Button for adding a person | 56 dp, bottom left (Material's bottom-end corner in RTL) |
| Bottom sheet rows / text fields | 56 dp |
| Type | body 16 sp, labels 13–14 sp, title 22 sp, slot name 24 sp (21 compact), calling line 19 sp, prayer 24 sp (adjustable) |

**Height budget (worst case, 360×800 dp, 4 slots + banner):** 800 − 24 − 64 − 80 − 24 = 608 dp.
Banner 44 + control row 40 + 4 × 88 + chips 40 + gaps ≈ 530 dp, so it fits with no scrolling. With
the phone's font size at "large" (1.15×), the chips row scrolls sideways first.

## 11. Phase 2: seat map

**Source:** the shul's Shabbat seating chart, an Excel sheet (screenshot in
`Screenshot 2026-10-22 at 21.51.01.png`). **Only its layout is used.** The names are Shabbat seats
and don't apply to weekdays. What it shows:
- 5 blocks of seats: 2 side blocks, 2 centre blocks, and a front block around the **bimah** in the
  middle. Row numbers 1–13 are in a column at the right.
- Each cell is one seat (a coloured cell). Empty cells are aisles.

Plan: redraw the grid's **shape** once from the screenshot (there is no `.xlsx`), so the map keeps
the exact blocks, rows and gaps. The text in the cells is ignored, and weekday seats are
assigned in the app.

Mockup: `design/mockups/phase2-seat-map.html` (frames P2-1 to P2-3).

- **Two levels.** The hall is about 26 seats wide, which is too wide for 48 dp seats on a phone. A
  **mini-map** of the whole hall sits on top (one dot per seat, the bimah shaded, the chosen block
  outlined). Under it, **the chosen block in large tiles** (52 dp high, the full width shared by the
  block's 4–5 columns). Tap a block on the mini-map, or swipe, to change block.
- **P2-1 · Choosing on the map:** a "רשימה | מפה" (list / map) switch on the choosing page, with the same
  group tabs and the same "tap = into the slot". Seats of the chosen group are shaded by waiting time
  (dark = waited longest), other groups are greyed, ✓ = already in today's reading. Unassigned seats are
  dashed.
- **P2-2 · Who is here today (optional):** opened from the main page before the reading. Tap seats to
  mark the people present. The suggestion and the line put the people marked present first. Without
  marks, the order works as in phase 1. The marks reset at the end of the day.
- **P2-3 · Assigning seats (one time):** עוד → סידור מקומות. Tap a seat → search → "שבץ" (assign), or
  "העבר" (move) when the person already has a seat. The person card shows his seat and "בחר במפה" (pick
  on the map). Only people with a seat are on the map. Everyone else is reached by the list and search.
- The layout is stored as data (blocks, rows, columns, bimah) drawn from the chart. No layout editor
  in the app (YAGNI). If the hall changes, the data file is edited.

## 12. Not in phase 1

Shabbat, several gabbaim / sync, selling aliyot, the "two brothers / father and son not one after
the other" warning.

## 13. Open questions

None at the moment.
