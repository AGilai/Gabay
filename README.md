# גבאי

אפליקציה לגבאי בית הכנסת: עליות לתורה בימי חול (שני, חמישי, ראש חודש, חול המועד, תעניות).
עברית, עובדת בלי אינטרנט, מותקנת מהדפדפן בטלפון אנדרואיד. הנתונים נשמרים רק בטלפון.

A Hebrew offline web app (PWA) for a synagogue gabbai: weekday Torah-reading call-ups, a fair order of
who is called next, prayer texts with names filled in, and a one-time import of a WhatsApp log.

- Try it with example data: open the app with `?demo=1`.
- Install on Android: open the site in Chrome → ⋮ → "Install app" (התקן אפליקציה).
- Develop: Node ≥ 22.18, no dependencies. `npm test`, `npm run build`, `npm run serve` (port 8090).

Design: [docs/UX-DESIGN.md](docs/UX-DESIGN.md). License: GPL-2.0-or-later (uses @hebcal/core).

Content licences:
- `web/data/torah.json`: Torah text from *Miqra according to the Masorah* (מקרא על פי המסורה), CC-BY-SA 4.0,
  via [Sefaria](https://www.sefaria.org); the aliyah split is from [Hebcal](https://www.hebcal.com) (`@hebcal/leyning`, BSD-2),
  adjusted to the shul's customs (see `scripts/torah-data.ts`). The data file is shared under CC-BY-SA 4.0.
- Prayer texts: Siddur Sfard, Torat Emet edition (public domain), via Sefaria.
- ברכות התורה, ברכת הגומל: Siddur Sfard, the Metsudah siddur (1981), CC-BY, via Sefaria.
- App icon: the logo of בית הכנסת נריה, פתח תקווה (from the shul's YouTube channel), used with the gabbai's consent.
- Fonts: Assistant, Frank Ruhl Libre, Noto Serif Hebrew (SIL Open Font License).
