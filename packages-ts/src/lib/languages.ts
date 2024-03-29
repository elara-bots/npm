import { getKeys } from "@elara-services/utils";

const langs = {
    en: "English",
    fr: "French",
    es: "Spanish",
    pt: "Portuguese",
    tr: "Turkish",
    ru: "Russian",
    ar: "Arabic",
    af: "Afrikaans",
    sq: "Albanian",
    am: "Amharic",
    hy: "Armenian",
    az: "Azerbaijani",
    eu: "Basque",
    be: "Belarusian",
    bn: "Bengali",
    bs: "Bosnian",
    bg: "Bulgarian",
    ca: "Catalan",
    ceb: "Cebuano",
    ny: "Chichewa",
    zh: "Chinese (Simplified)",
    "zh-tw": "Chinese (Traditional)",
    co: "Corsican",
    hr: "Croatian",
    cs: "Czech",
    da: "Danish",
    nl: "Dutch",
    eo: "Esperanto",
    et: "Estonian",
    tl: "Filipino",
    fi: "Finnish",
    fy: "Frisian",
    gl: "Galician",
    ka: "Georgian",
    de: "German",
    el: "Greek",
    gu: "Gujarati",
    ht: "Haitian Creole",
    ha: "Hausa",
    haw: "Hawaiian",
    he: "Hebrew",
    iw: "Hebrew",
    hi: "Hindi",
    hmn: "Hmong",
    hu: "Hungarian",
    is: "Icelandic",
    ig: "Igbo",
    id: "Indonesian",
    ga: "Irish",
    it: "Italian",
    ja: "Japanese",
    jw: "Javanese",
    kn: "Kannada",
    kk: "Kazakh",
    km: "Khmer",
    ko: "Korean",
    ku: "Kurdish (Kurmanji)",
    ky: "Kyrgyz",
    lo: "Lao",
    la: "Latin",
    lv: "Latvian",
    lt: "Lithuanian",
    lb: "Luxembourgish",
    mk: "Macedonian",
    mg: "Malagasy",
    ms: "Malay",
    ml: "Malayalam",
    mt: "Maltese",
    mi: "Maori",
    mr: "Marathi",
    mn: "Mongolian",
    my: "Myanmar (Burmese)",
    ne: "Nepali",
    no: "Norwegian",
    ps: "Pashto",
    fa: "Persian",
    pl: "Polish",
    pa: "Punjabi",
    ro: "Romanian",
    sm: "Samoan",
    gd: "Scots Gaelic",
    sr: "Serbian",
    st: "Sesotho",
    sn: "Shona",
    sd: "Sindhi",
    si: "Sinhala",
    sk: "Slovak",
    sl: "Slovenian",
    so: "Somali",
    su: "Sundanese",
    sw: "Swahili",
    sv: "Swedish",
    tg: "Tajik",
    ta: "Tamil",
    te: "Telugu",
    th: "Thai",
    uk: "Ukrainian",
    ur: "Urdu",
    uz: "Uzbek",
    vi: "Vietnamese",
    cy: "Welsh",
    xh: "Xhosa",
    yi: "Yiddish",
    yo: "Yoruba",
    zu: "Zulu",
};

export const Languages = {
    langs,
    find(name: Lang | LangName) {
        for (const key of getKeys(langs)) {
            if (key === name) {
                return key;
            }
            if (langs[key] === name) {
                return key;
            }
        }
        return null;
    },
};

export type Lang = keyof typeof langs;

export type LangName =
    | "English"
    | "French"
    | "Spanish"
    | "Portuguese"
    | "Turkish"
    | "Russian"
    | "Arabic"
    | "Afrikaans"
    | "Albanian"
    | "Amharic"
    | "Armenian"
    | "Azerbaijani"
    | "Basque"
    | "Belarusian"
    | "Bengali"
    | "Bosnian"
    | "Bulgarian"
    | "Catalan"
    | "Cebuano"
    | "Chichewa"
    | "Chinese (Simplified)"
    | "Chinese (Traditional)"
    | "Corsican"
    | "Croatian"
    | "Czech"
    | "Danish"
    | "Dutch"
    | "Esperanto"
    | "Estonian"
    | "Filipino"
    | "Finnish"
    | "Frisian"
    | "Galician"
    | "Georgian"
    | "German"
    | "Greek"
    | "Gujarati"
    | "Haitian Creole"
    | "Hausa"
    | "Hawaiian"
    | "Hebrew"
    | "Hebrew"
    | "Hindi"
    | "Hmong"
    | "Hungarian"
    | "Icelandic"
    | "Igbo"
    | "Indonesian"
    | "Irish"
    | "Italian"
    | "Japanese"
    | "Javanese"
    | "Kannada"
    | "Kazakh"
    | "Khmer"
    | "Korean"
    | "Kurdish (Kurmanji)"
    | "Kyrgyz"
    | "Lao"
    | "Latin"
    | "Latvian"
    | "Lithuanian"
    | "Luxembourgish"
    | "Macedonian"
    | "Malagasy"
    | "Malay"
    | "Malayalam"
    | "Maltese"
    | "Maori"
    | "Marathi"
    | "Mongolian"
    | "Myanmar (Burmese)"
    | "Nepali"
    | "Norwegian"
    | "Pashto"
    | "Persian"
    | "Polish"
    | "Punjabi"
    | "Romanian"
    | "Samoan"
    | "Scots Gaelic"
    | "Serbian"
    | "Sesotho"
    | "Shona"
    | "Sindhi"
    | "Sinhala"
    | "Slovak"
    | "Slovenian"
    | "Somali"
    | "Sundanese"
    | "Swahili"
    | "Swedish"
    | "Tajik"
    | "Tamil"
    | "Telugu"
    | "Thai"
    | "Ukrainian"
    | "Urdu"
    | "Uzbek"
    | "Vietnamese"
    | "Welsh"
    | "Xhosa"
    | "Yiddish"
    | "Yoruba"
    | "Zulu";
