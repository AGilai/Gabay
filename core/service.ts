// Reading mode: what the gabbai says to call each oleh, from "ויעזור" to "יעמדו המגביה והגולל".
// The calling line is never changed; what the call needs on top of it (הכהן / הלוי when the line lacks
// it, the aliyah word, "in place of") comes back separately, so the screen can show it in grey.
import type { SlotRole } from './types.ts';

export const OPENING = 'וְיַעֲזֹר וְיָגֵן וְיוֹשִׁיעַ לְכֹל הַחוֹסִים בּוֹ, וְנֹאמַר אָמֵן. הַכֹּל הָבוּ גֹדֶל לֵאלֹהֵינוּ וּתְנוּ כָבוֹד לַתּוֹרָה.';
export const AFTER_FIRST = 'בָּרוּךְ שֶׁנָּתַן תּוֹרָה לְעַמּוֹ יִשְׂרָאֵל בִּקְדֻשָּׁתוֹ.';
export const CLOSING = 'יַעַמְדוּ הַמַּגְבִּיהַּ וְהַגּוֹלֵל';

export interface Call { lead: string; line: string; added: string }

const CALL = 'יַעֲמֹד';
const ORDINAL: Partial<Record<SlotRole, string>> = { Y2: 'שני', Y3: 'שלישי', Y4: 'רביעי' };
const endsWith = (line: string, word: string) => new RegExp(`(^|\\s)${word}$`).test(line);

export function callFor(role: SlotRole, callLine: string): Call {
  const line = callLine.trim();
  const unless = (word: string) => (endsWith(line, word) ? '' : word);
  switch (role) {
    case 'K': return { lead: 'כֹּהֵן קְרָב, ' + CALL, line, added: unless('הכהן') };
    case 'L': return { lead: CALL, line, added: unless('הלוי') };
    case 'Y_FOR_K': return { lead: 'אֵין כָּאן כֹּהֵן, ' + CALL, line, added: 'בִּמְקוֹם כֹּהֵן' };
    case 'K_FOR_L': return { lead: CALL, line, added: [unless('הכהן'), 'בִּמְקוֹם לֵוִי'].filter(Boolean).join(' ') };
    default: return { lead: CALL, line, added: unless(ORDINAL[role] ?? '') };
  }
}

// Texts for the rare oleh who needs them (the blessings are printed at the bimah). Siddur Sfard, the
// Metsudah siddur (1981, CC-BY, via Sefaria).
export interface Said { who: string; text: string }
export const TORAH_BLESSINGS: Said[] = [
  { who: 'העולה', text: 'בָּרְכוּ אֶת יְהֹוָה הַמְּבֹרָךְ:' },
  { who: 'הקהל והעולה', text: 'בָּרוּךְ יְהֹוָה הַמְּבֹרָךְ לְעוֹלָם וָעֶד:' },
  { who: 'העולה, לפני הקריאה', text: 'בָּרוּךְ אַתָּה יְהֹוָה אֱלֺהֵֽינוּ מֶֽלֶךְ הָעוֹלָם אֲשֶׁר בָּֽחַר בָּֽנוּ מִכָּל הָעַמִּים וְנָֽתַן לָֽנוּ אֶת תּוֹרָתוֹ: בָּרוּךְ אַתָּה יְהֹוָה נוֹתֵן הַתּוֹרָה:' },
  { who: 'העולה, אחרי הקריאה', text: 'בָּרוּךְ אַתָּה יְהֹוָה אֱלֺהֵֽינוּ מֶֽלֶךְ הָעוֹלָם אֲשֶׁר נָֽתַן לָֽנוּ תּוֹרַת אֱמֶת וְחַיֵּי עוֹלָם נָטַע בְּתוֹכֵֽנוּ: בָּרוּךְ אַתָּה יְהֹוָה נוֹתֵן הַתּוֹרָה:' },
];
export const GOMEL: Said[] = [
  { who: 'המברך, אחרי ברכה אחרונה', text: 'בָּרוּךְ אַתָּה יְהֹוָה אֱלֺהֵֽינוּ מֶֽלֶךְ הָעוֹלָם הַגּוֹמֵל לְחַיָּבִים טוֹבוֹת שֶׁגְּמָלַֽנִי כָּל טוֹב:' },
  { who: 'הקהל', text: 'מִי שֶׁגְּמָלְךָ טוֹב הוּא יִגְמָלְךָ כָּל־טוֹב סֶֽלָה:' },
];
export const SIDDUR_CREDIT = 'סידור ספרד, הוצאת מצודה (CC-BY, ספריא)';
