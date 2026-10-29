// Prayer templates with name slots ({name} / {names}). The shipped texts are placeholders: the
// gabbai pastes his synagogue's nusach Sfard wording in settings.
                                                     

                                                     

const PLACEHOLDER_NAME = 'פלוני בן פלוני';
const OLD_MARK = '(נוסח זמני)';

// Nusach Sfard, from Siddur Sfard (Torat Emet 357, public domain, via Sefaria), in the weekday form:
// the Shabbat / Yom Tov additions are left out, "(פב"פ)" became {name}, and the donor clauses that need a
// second name use the common wording. The plural sick text and the bar mitzvah blessing are not in that
// siddur; they follow the usual siddur wording. The gabbai can change any text in settings.
// Who pledges charity in the yoledet prayer. The siddur has the husband's wording; the grandfather's
// (for an older congregation, where the oleh is often the grandfather) is the gabbai's wording.
const HUSBAND = 'שֶׁבַּעְלָהּ יִתֵּן לִצְדָקָה בַּעֲדָהּ';
export const DONOR = {
  father: { ben: HUSBAND, bat: HUSBAND },
  grandfather: { ben: 'שֶׁהַסַּבָּא יִתֵּן צְדָקָה בַּעֲבוּרָם', bat: 'שֶׁהַסַּבָּא יִתֵּן צְדָקָה בַּעֲבוּרָם' },
};
// Placeholders that hold a person's name, highlighted in the reader; others ({donor}) are plain text.
const NAME_KEYS = new Set(['name', 'names', 'baby']);

const MSB = 'מִי שֶׁבֵּרַךְ אֲבוֹתֵינוּ אַבְרָהָם יִצְחָק וְיַעֲקֹב';
const MSB_LONG = MSB + ' משֶׁה וְאַהֲרֹן דָּוִד וּשְׁלֹמֹה';
const EL_MALEI = 'אֵל מָלֵא רַחֲמִים שׁוֹכֵן בַּמְּרוֹמִים הַמְצֵא מְנוּחָה נְכוֹנָה עַל כַּנְפֵי הַשְּׁכִינָה בְּמַעֲלוֹת קְדוֹשִׁים וּטְהוֹרִים כְּזֹהַר הָרָקִיעַ מַזְהִירִים אֶת נִשְׁמַת {name}';

export function defaultPrayers()          {
  return {
    oleh: `${MSB} הוּא יְבָרֵךְ אֶת {name} בַּעֲבוּר שֶׁעָלָה לַתּוֹרָה לִכְבוֹד הַמָּקוֹם וְלִכְבוֹד הַתּוֹרָה, וּבִשְׂכַר זֶה הַקָּדוֹשׁ בָּרוּךְ הוּא יִשְׁמְרֵהוּ וְיַצִּילֵהוּ מִכָּל צָרָה וְצוּקָה וּמִכָּל נֶגַע וּמַחֲלָה וְיִשְׁלַח בְּרָכָה וְהַצְלָחָה בְּכָל מַעֲשֵׂה יָדָיו עִם כָּל יִשְׂרָאֵל אֶחָיו וְנֹאמַר אָמֵן.`,
    sickM: `${MSB_LONG} הוּא יְבָרֵךְ אֶת הַחוֹלֶה {name} בַּעֲבוּר שֶׁכָּל הַקָּהָל מִתְפַּלְּלִים בַּעֲבוּרוֹ, בִּשְׂכַר זֶה הַקָּדוֹשׁ בָּרוּךְ הוּא יְמַלֵּא רַחֲמִים עָלָיו לְהַחֲלִימוֹ וּלְרַפְּאֹתוֹ וּלְהַחֲזִיקוֹ וּלְהַחֲיוֹתוֹ, וְיִשְׁלַח לוֹ מְהֵרָה רְפוּאָה שְׁלֵמָה מִן הַשָּׁמַיִם לְרַמַ"ח אֵבָרָיו וּשְׁסָ"ה גִּידָיו בְּתוֹךְ שְׁאָר חוֹלֵי יִשְׂרָאֵל, רְפוּאַת הַנֶּפֶשׁ וּרְפוּאַת הַגּוּף, הַשְׁתָּא בַּעֲגָלָא וּבִזְמַן קָרִיב. וְנֹאמַר אָמֵן.`,
    sickF: `${MSB_LONG} הוּא יְבָרֵךְ אֶת הַחוֹלַנִּית {name} בַּעֲבוּר שֶׁכָּל הַקָּהָל מִתְפַּלְּלִים בַּעֲבוּרָהּ, בִּשְׂכַר זֶה הַקָּדוֹשׁ בָּרוּךְ הוּא יְמַלֵּא רַחֲמִים עָלֶיהָ לְהַחֲלִימָהּ וּלְרַפְּאֹתָהּ וּלְהַחֲזִיקָהּ וּלְהַחֲיוֹתָהּ, וְיִשְׁלַח לָהּ מְהֵרָה רְפוּאָה שְׁלֵמָה מִן הַשָּׁמַיִם לְכָל אֵבָרֶיה וּלְכָל גִּידֶיהָ בְּתוֹךְ שְׁאָר חוֹלֵי יִשְׂרָאֵל, רְפוּאַת הַנֶּפֶשׁ וּרְפוּאַת הַגּוּף, הַשְׁתָּא בַּעֲגָלָא וּבִזְמַן קָרִיב. וְנֹאמַר אָמֵן.`,
    sickPlural: `${MSB_LONG} הוּא יְבָרֵךְ אֶת הַחוֹלִים {names} בַּעֲבוּר שֶׁכָּל הַקָּהָל מִתְפַּלְּלִים בַּעֲבוּרָם, בִּשְׂכַר זֶה הַקָּדוֹשׁ בָּרוּךְ הוּא יְמַלֵּא רַחֲמִים עֲלֵיהֶם לְהַחֲלִימָם וּלְרַפְּאֹתָם וּלְהַחֲזִיקָם וּלְהַחֲיוֹתָם, וְיִשְׁלַח לָהֶם מְהֵרָה רְפוּאָה שְׁלֵמָה מִן הַשָּׁמַיִם לְכָל אֵבְרֵיהֶם וּלְכָל גִּידֵיהֶם בְּתוֹךְ שְׁאָר חוֹלֵי יִשְׂרָאֵל, רְפוּאַת הַנֶּפֶשׁ וּרְפוּאַת הַגּוּף, הַשְׁתָּא בַּעֲגָלָא וּבִזְמַן קָרִיב. וְנֹאמַר אָמֵן.`,
    barMitzvah: `${MSB} הוּא יְבָרֵךְ אֶת הַנַּעַר {name} שֶׁמָּלְאוּ לוֹ שְׁלֹשׁ עֶשְׂרֵה שָׁנִים וְהִגִּיעַ לְמִצְוֹת, וְעָלָה לַתּוֹרָה לָתֵת שֶׁבַח וְהוֹדָיָה לְהַשֵּׁם יִתְבָּרַךְ עַל כָּל הַטּוֹבָה אֲשֶׁר גָּמַל אִתּוֹ. יִשְׁמְרֵהוּ הַקָּדוֹשׁ בָּרוּךְ הוּא וִיחַיֵּהוּ, וִיכוֹנֵן אֶת לִבּוֹ לִהְיוֹת שָׁלֵם עִם ה' וְלָלֶכֶת בִּדְרָכָיו וְלִשְׁמֹר מִצְוֹתָיו כָּל הַיָּמִים, וְנֹאמַר אָמֵן.\n\nהָאָב מְבָרֵךְ: בָּרוּךְ שֶׁפְּטָרַנִי מֵעָנְשׁוֹ שֶׁל זֶה.`,
    yoledetBen: `${MSB_LONG} הוּא יְבָרֵךְ אֶת הָאִשָּׁה הַיּוֹלֶדֶת {name} וְאֶת בְּנָהּ שֶׁנּוֹלַד לָהּ בְּמַזָּל טוֹב, בַּעֲבוּר {donor}, בִּשְׂכַר זֶה יִזְכּוּ אָבִיו וְאִמוֹ לְהַכְנִיסוֹ בִּבְרִיתוֹ שֶׁל אַבְרָהָם אָבִינוּ בְּעִתּוֹ וּבִזְמַנּוֹ, וּלְגַדְּלוֹ לְתוֹרָה וּלְחֻפָּה וּלְמַעֲשִׂים טוֹבִים. וְנֹאמַר אָמֵן.`,
    yoledetBat: `${MSB_LONG} הוּא יְבָרֵךְ אֶת הָאִשָּׁה הַיּוֹלֶדֶת {name} וְאֶת בִּתָּהּ שֶׁנּוֹלְדָה לָהּ בְּמַזָּל טוֹב, וְיִקָּרֵא שְׁמָהּ בְּיִשְׂרָאֵל {baby}, בַּעֲבוּר {donor}, בִּשְׂכַר זֶה יִזְכּוּ אָבִיהָ וְאִמָהּ לְגַדְּלָה לְתוֹרָה וּלְחֻפָּה וּלְמַעֲשִׂים טוֹבִים. וְנֹאמַר אָמֵן.`,
    azkaraM: `${EL_MALEI} שֶׁהָלַךְ לְעוֹלָמוֹ, בַּעֲבוּר שֶׁבְּלִי נֶדֶר יִתְּנוּ צְדָקָה בְּעַד הַזְכָּרַת נִשְׁמָתוֹ, לָכֵן בַּעַל הָרַחֲמִים יַסְתִּירֵהוּ בְּסֵתֶר כְּנָפָיו לְעוֹלָמִים וְיִצְרֹר בִּצְרוֹר הַחַיִּים אֶת נִשְׁמָתוֹ, ה' הוּא נַחֲלָתוֹ, וְיָנוּחַ בְּשָׁלוֹם עַל מִשְׁכָּבוֹ, וְנֹאמַר אָמֵן.`,
    azkaraF: `${EL_MALEI} שֶׁהָלְכָה לְעוֹלָמָהּ, בַּעֲבוּר שֶׁבְּלִי נֶדֶר יִתְּנוּ צְדָקָה בְּעַד הַזְכָּרַת נִשְׁמָתָהּ, לָכֵן בַּעַל הָרַחֲמִים יַסְתִּירָהּ בְּסֵתֶר כְּנָפָיו לְעוֹלָמִים וְיִצְרֹר בִּצְרוֹר הַחַיִּים אֶת נִשְׁמָתָהּ, ה' הוּא נַחֲלָתָהּ, וְתָנוּחַ בְּשָׁלוֹם עַל מִשְׁכָּבָהּ, וְנֹאמַר אָמֵן.`,
  };
}

// Texts still holding the first version's placeholder wording get the real texts; edited ones are kept.
export function upgradePrayers(p         )          {
  const d = defaultPrayers();
  const out = { ...d, ...p };
  for (const k of Object.keys(d)                     ) if (!p[k] || p[k].includes(OLD_MARK)) out[k] = d[k];
  // The yoledet texts from before the father / grandfather switch: the husband clause becomes {donor}.
  for (const k of ['yoledetBen', 'yoledetBat']         ) out[k] = out[k].replace('בַּעֲבוּר ' + HUSBAND, 'בַּעֲבוּר {donor}');
  // The gabbai's wording: "her daughter who was born to her" (שֶׁנּוֹלְדָה), not הַנּוֹלְדָה.
  out.yoledetBat = out.yoledetBat.replace('בִּתָּהּ הַנּוֹלְדָה לָהּ', 'בִּתָּהּ שֶׁנּוֹלְדָה לָהּ');
  out.yoledetBen = out.yoledetBen.replace('בְּנָהּ הַנּוֹלָד לָהּ', 'בְּנָהּ שֶׁנּוֹלַד לָהּ');
  return out;
}

export function joinNames(names          )         {
  if (names.length < 2) return names[0] ?? '';
  return names.slice(0, -1).join(', ') + ' ו' + names[names.length - 1];
}

// blanks: what an empty name shows (default פלוני בן פלוני; the baby girl פלונית בת פלוני).
export function render(template        , vars                        , blanks                         = {})         {
  const parts         = [];
  let rest = template;
  for (let m = /\{(\w+)\}/.exec(rest); m; m = /\{(\w+)\}/.exec(rest)) {
    if (m.index > 0) parts.push({ text: rest.slice(0, m.index), name: false });
    const isName = NAME_KEYS.has(m[1]);
    const blank = blanks[m[1]] ?? (m[1] === 'baby' ? 'פלונית בת פלוני' : isName ? PLACEHOLDER_NAME : '');
    parts.push({ text: vars[m[1]] || blank, name: isName });
    rest = rest.slice(m.index + m[0].length);
  }
  if (rest) parts.push({ text: rest, name: false });
  return parts;
}

// A sick person is named by his mother: "רפאל בן שרה", "חנה בת רבקה".
export function sickName(name        , mother        , gender           )         {
  const m = mother.trim().replace(/^(בן|בת)\s+/, '');
  return [name.trim(), m ? (gender === 'f' ? 'בת' : 'בן') : '', m].filter(Boolean).join(' ');
}

// "בן" / "בת" in the name decides; the saved switch only when the name has neither.
export const genderOf = (s           )            => {
  const words = s.text.split(/\s+/);
  return words.includes('בת') ? 'f' : words.includes('בן') ? 'm' : s.gender;
};

// The sick: one blessing per person (a man's or a woman's wording), or all together in the plural.
// No names chosen (asked for out loud): `blank` says whose wording to show, a man's, a woman's or several people's.
export function sickBlessings(p         , chosen             , together         , blank                     = 'm')                                       {
  if (!chosen.length) return [{ template: blank === 'many' ? p.sickPlural : blank === 'f' ? p.sickF : p.sickM, name: '' }];
  if (together && chosen.length > 1) return [{ template: p.sickPlural, name: joinNames(chosen.map((s) => s.text)) }];
  return chosen.map((s) => ({ template: genderOf(s) === 'f' ? p.sickF : p.sickM, name: s.text }));
}

// The baby girl is not named this time (the grandfather is called up, or the parents postpone it).
export function withoutNaming(template        )         {
  return template.replace(/וְיִקָּרֵא שְׁמָהּ בְּיִשְׂרָאֵל\s*\{baby\},?\s*/, '');
}
