# גבאי

אפליקציה לגבאי בית הכנסת: עליות לתורה בימי חול (שני, חמישי, ראש חודש, חול המועד, תעניות).
עברית, עובדת בלי אינטרנט, מותקנת מהדפדפן בטלפון אנדרואיד. הנתונים נשמרים רק בטלפון.

A Hebrew offline web app (PWA) for a synagogue gabbai: weekday Torah-reading call-ups, a fair order of
who is called next, prayer texts with names filled in, and a one-time import of a WhatsApp log.

- Try it with example data: open the app with `?demo=1`.
- Install on Android: open the site in Chrome → ⋮ → "Install app" (התקן אפליקציה).
- Develop: Node ≥ 22.18, no dependencies. `npm test`, `npm run build`, `npm run serve` (port 8090).

Design: [docs/UX-DESIGN.md](docs/UX-DESIGN.md). License: GPL-2.0-or-later (uses @hebcal/core).
