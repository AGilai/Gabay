// Reading mode: what the gabbai says to call each oleh, from "ותגלה" to "יעמדו המגביה והגולל".
// The calling line is never changed; what the call needs on top of it (הכהן / הלוי when the line lacks
// it, the aliyah word, "in place of") comes back separately, so the screen can show it in grey.
import { isTenDays } from './day.js';
                                                    

export const OPENING = 'וְתִגָּלֶה וְתֵרָאֶה מַלְכוּתוֹ עָלֵינוּ בִּזְמַן קָרוֹב, וְיָחֹן פְּלֵיטָתֵנוּ וּפְלֵיטַת עַמּוֹ בֵּית יִשְׂרָאֵל לְחֵן וּלְחֶסֶד וּלְרַחֲמִים וּלְרָצוֹן, וְנֹאמַר אָמֵן. הַכֹּל הָבוּ גֹדֶל לֵאלֹהֵינוּ וּתְנוּ כָבוֹד לַתּוֹרָה.';
export const AFTER_FIRST = 'בָּרוּךְ שֶׁנָּתַן תּוֹרָה לְעַמּוֹ יִשְׂרָאֵל בִּקְדֻשָּׁתוֹ.';
export const CLOSING = 'יַעַמְדוּ הַמַּגְבִּיהַּ וְהַגּוֹלֵל';

                                                                   

const CALL = 'יַעֲמֹד';
const ORDINAL                                    = { Y2: 'שני', Y3: 'שלישי', Y4: 'רביעי' };
const endsWith = (line        , word        ) => new RegExp(`(^|\\s)${word}$`).test(line);

export function callFor(role          , callLine        )       {
  const line = callLine.trim();
  const unless = (word        ) => (endsWith(line, word) ? '' : word);
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
                                                   
export const TORAH_BLESSINGS         = [
  { who: 'העולה', text: 'בָּרְכוּ אֶת יְהֹוָה הַמְּבֹרָךְ:' },
  { who: 'הקהל והעולה', text: 'בָּרוּךְ יְהֹוָה הַמְּבֹרָךְ לְעוֹלָם וָעֶד:' },
  { who: 'העולה, לפני הקריאה', text: 'בָּרוּךְ אַתָּה יְהֹוָה אֱלֺהֵֽינוּ מֶֽלֶךְ הָעוֹלָם אֲשֶׁר בָּֽחַר בָּֽנוּ מִכָּל הָעַמִּים וְנָֽתַן לָֽנוּ אֶת תּוֹרָתוֹ: בָּרוּךְ אַתָּה יְהֹוָה נוֹתֵן הַתּוֹרָה:' },
  { who: 'העולה, אחרי הקריאה', text: 'בָּרוּךְ אַתָּה יְהֹוָה אֱלֺהֵֽינוּ מֶֽלֶךְ הָעוֹלָם אֲשֶׁר נָֽתַן לָֽנוּ תּוֹרַת אֱמֶת וְחַיֵּי עוֹלָם נָטַע בְּתוֹכֵֽנוּ: בָּרוּךְ אַתָּה יְהֹוָה נוֹתֵן הַתּוֹרָה:' },
];
export const GOMEL         = [
  { who: 'המברך, אחרי ברכה אחרונה', text: 'בָּרוּךְ אַתָּה יְהֹוָה אֱלֺהֵֽינוּ מֶֽלֶךְ הָעוֹלָם הַגּוֹמֵל לְחַיָּבִים טוֹבוֹת שֶׁגְּמָלַֽנִי כָּל טוֹב:' },
  { who: 'הקהל', text: 'מִי שֶׁגְּמָלְךָ טוֹב הוּא יִגְמָלְךָ כָּל־טוֹב סֶֽלָה:' },
];
// Half kaddish after the reading, before המגביה והגולל. Nusach Sfard.
export function halfKaddish(date         )         {
  const above = isTenDays(date) ? 'לְעֵלָּא וּלְעֵלָּא מִכָּל' : 'לְעֵלָּא מִן כָּל';
  return [
    { who: 'ש״ץ', text: 'יִתְגַּדַּל וְיִתְקַדַּשׁ שְׁמֵהּ רַבָּא. (אָמֵן) בְּעָלְמָא דִּי בְרָא כִרְעוּתֵהּ, וְיַמְלִיךְ מַלְכוּתֵהּ, וְיַצְמַח פֻּרְקָנֵהּ וִיקָרֵב מְשִׁיחֵהּ. (אָמֵן) בְּחַיֵּיכוֹן וּבְיוֹמֵיכוֹן וּבְחַיֵּי דְכָל בֵּית יִשְׂרָאֵל, בַּעֲגָלָא וּבִזְמַן קָרִיב, וְאִמְרוּ אָמֵן:' },
    { who: 'הקהל והש״ץ', text: 'אָמֵן. יְהֵא שְׁמֵהּ רַבָּא מְבָרַךְ לְעָלַם וּלְעָלְמֵי עָלְמַיָּא, יִתְבָּרַךְ.' },
    { who: 'ש״ץ', text: `יִתְבָּרַךְ וְיִשְׁתַּבַּח וְיִתְפָּאַר וְיִתְרוֹמַם וְיִתְנַשֵּׂא וְיִתְהַדָּר וְיִתְעַלֶּה וְיִתְהַלָּל שְׁמֵהּ דְּקֻדְשָׁא בְּרִיךְ הוּא. (בְּרִיךְ הוּא) ${above} בִּרְכָתָא וְשִׁירָתָא, תֻּשְׁבְּחָתָא וְנֶחֱמָתָא, דַּאֲמִירָן בְּעָלְמָא, וְאִמְרוּ אָמֵן:` },
    { who: 'הקהל', text: 'אָמֵן.' },
  ];
}

export const SIDDUR_CREDIT = 'סידור ספרד, הוצאת מצודה (CC-BY, ספריא)';
