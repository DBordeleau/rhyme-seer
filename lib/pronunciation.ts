// eslint-disable-next-line @typescript-eslint/no-var-requires
const cmuModule = require('cmu-pronouncing-dictionary');
const cmudict = cmuModule.dictionary || cmuModule;

// API results cache
const apiPhonesCache: Record<string, string[]> = {};

// Python API -- Not useful rn but can be used to make requests to a ML model in the future
const API_URL = process.env.NEXT_PUBLIC_G2P_API_URL || 'http://localhost:5000';
console.log(`G2P API URL: ${API_URL}`);
console.log("CMU module loaded:", typeof cmudict, Object.keys(cmudict).slice(0, 5));

/**
 * Returns the CMU phoneme array for a given word, or undefined if not found.
 * Includes caching for performance improvement.
 */
export const getWordPhones = (word: string): string[] | undefined => {
    // Check CMU with apostrophe
    const normalizedWord = word.trim().toLowerCase();
    let phones = cmudict[normalizedWord];

    // If not found, try without apostrophe
    if (!phones && normalizedWord.includes("'")) {
        const withoutApostrophe = normalizedWord.replace(/'/g, '');
        phones = cmudict[withoutApostrophe];
    }

    if (!phones) return undefined;
    if (Array.isArray(phones)) {
        return phones[0].split(' ');
    }
    if (typeof phones === 'string') {
        return phones.split(' ');
    }
    return undefined;
};

/**
 * Fetch phonemes from the G2P API
 */
async function fetchPhonemesFromApi(word: string): Promise<string[] | undefined> {
    try {
        // Check cache first
        if (apiPhonesCache[word]) {
            console.log(`[API-CACHE] Using cached phonemes for "${word}": ${apiPhonesCache[word]}`);
            return apiPhonesCache[word];
        }

        console.log(`[API] Fetching phonemes for "${word}"...`);
        const response = await fetch(`${API_URL}/api/v1/g2p?text=${encodeURIComponent(word)}&in-lang=eng&out-lang=eng-arpabet`);

        if (!response.ok) {
            console.error(`API request failed for "${word}": ${response.status} ${response.statusText}`);
            return undefined;
        }

        const data = await response.json();

        if (data && data["output-text"] !== undefined) {
            const phonemesStr = data["output-text"].trim(); // Remove trailing whitespace

            if (!phonemesStr) {
                console.warn(`[API] Empty phoneme string for "${word}"`);
                return undefined;
            }

            const phonemes = phonemesStr.split(' ').filter((p: string) => p.length > 0);

            // Normalize phonemes to match CMU format
            const normalizedPhonemes = normalizePhonemes(phonemes, word);

            // Cache the result
            apiPhonesCache[word] = normalizedPhonemes;
            console.log(`[API] Received phonemes for "${word}": ${normalizedPhonemes.join(' ')}`);
            return normalizedPhonemes;
        }

        console.error(`Invalid API response for "${word}":`, data);
        return undefined;
    } catch (error) {
        handleApiError(error, word);
        return undefined;
    }
}

/**
 * Normalizes phonemes from G2P API to match CMU dictionary format
 */
function normalizePhonemes(phonemes: string[], word: string): string[] {
    // Check if any vowel has a stress marker
    const hasStressMarkers = phonemes.some(p =>
        /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)[0-2]$/.test(p)
    );

    if (!hasStressMarkers) {
        console.log(`[API-NORMALIZE] Adding stress markers to phonemes for "${word}"`);
        return addStressMarkers(phonemes);
    }

    // Already has stress markers, return as is
    return phonemes;
}

/**
 * Add stress markers to vowels in phonemes that don't have them
 * This is a simple heuristic - put primary stress on the first vowel
 * and unstressed on the rest
 */
function addStressMarkers(phonemes: string[]): string[] {
    const vowels = ['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW'];
    let foundFirstVowel = false;

    return phonemes.map(p => {
        if (vowels.includes(p)) {
            if (!foundFirstVowel) {
                foundFirstVowel = true;
                return p + '1';
            }
            return p + '0';
        }
        return p;
    });
}

/**
 * Fallback pronunciations for common words that might be missing from the dictionary -- Generated with LOGIOS
 */
const fallbackPronunciations: Record<string, string[]> = {
    "voice": ["V", "OY1", "S"],
    "moist": ["M", "OY1", "S", "T"],
    "heard": ["HH", "ER1", "D"],
    "nerd": ["N", "ER1", "D"],
    "emcee": ["EH1", "M", "S", "IY0"],
    "mc": ["EH1", "M", "S", "IY0"],
    "nigga": ["N", "IH1", "G", "AH1"],
    "yo": ["Y", "OW1"],
    "dope": ["D", "OW1", "P"],
    "homie": ["HH", "OW1", "M", "IY0"],
    "homies": ["HH", "OW1", "M", "IY0", "Z"],
    "ain't": ["EY1", "N", "T"],
    "aint": ["EY1", "N", "T"],
    "brot": ["B", "R", "AO1", "T"],

    "addy": ["AE1", "D", "IY0"],
    "amps": ["AE1", "M", "P", "S"],
    "bando": ["B", "AE1", "N", "D", "OW0"],
    "blicky": ["B", "L", "IH1", "K", "IY0"],
    "conversate": ["K", "AA1", "N", "V", "ER0", "S", "EY1", "T"],
    "blocka": ["B", "L", "AA1", "K", "AH0"],
    "basin": ["B", "EY1", "S", "IH0", "N"],
    "bettin": ["B", "EH1", "T", "IH0", "N"],
    "chefin": ["SH", "EH1", "F", "IH0", "N"],
    "pourin": ["P", "AO1", "R", "IH0", "N"],
    "ceilin": ["S", "IY1", "L", "IH0", "N"],
    "cryin": ["K", "R", "AY1", "IH0", "N"],
    "lightnin": ["L", "AY1", "T", "N", "IH0", "N"],
    "flyin": ["F", "L", "AY1", "IH0", "N"],
    "lyin": ["L", "AY1", "IH0", "N"],
    "tryin": ["T", "R", "AY1", "IH0", "N"],
    "callin": ["K", "AE", "L", "IH0", "N"],
    "chokin": ["CH", "OW1", "K", "IH0", "N"],
    "soakin": ["S", "OW1", "K", "IH0", "N"],
    "hopin": ["HH", "OW1", "P", "IH0", "N"],
    "dre": ["D", "R", "EY1"],
    "dyin": ["D", "AY1", "IH0", "N"],
    "elopin": ["IY1", "L", "OW0", "P", "IH0", "N"],
    "erasin": ["IH0", "R", "EY1", "S", "IH0", "N"],
    "tellin": ["T", "EH1", "L", "IH0", "N"],
    "holdin": ["HH", "OW1", "L", "D", "IH0", "N"],
    "stretchin": ["S", "T", "R", "EH1", "CH", "IH0", "N"],
    "collectin": ["K", "AH0", "L", "EH1", "K", "T", "IH0", "N"],
    "masseuse": ["M", "AH0", "S", "UW1", "Z"],
    "lettin": ["L", "EH1", "T", "IH0", "N"],
    "skatin": ["S", "K", "EY1", "T", "IH0", "N"],
    "niggas": ["N", "IH1", "G", "AH0", "Z"],
    "prolly": ["P", "R", "AA1", "L", "IY0"],
    "weaklings": ["W", "IY1", "K", "L", "IH0", "NG", "Z"],
    "mohicans": ["M", "OW0", "HH", "IY1", "K", "AH0", "N", "Z"],
    "livin": ["L", "IH1", "V", "IH0", "N"],
    "choppa": ["CH", "AA1", "P", "AH0"],
    "crodie": ["K", "R", "OW1", "D", "IY0"],
    "cack": ["K", "AE1", "K"],
    "holla": ["HH", "AA1", "L", "AH0"],
    "shoppa": ["SH", "AA1", "P", "AH0"],
    "shootin": ["SH", "UW1", "T", "IH0", "N"],
    "toppa": ["T", "AA1", "P", "AH0"],
    "chakra": ["CH", "AA1", "K", "R", "AH0"],
    "cred": ["K", "R", "EH1", "D"],
    "empty": ["EH1", "M", "P", "T", "IY0"],
    "with": ["W", "IH1", "TH"],
    "teacher": ["T", "IY1", "CH", "ER0"],
    "preacher": ["P", "R", "IY1", "CH", "ER0"],
    "reefer": ["R", "IY1", "F", "ER0"],
    "ether": ["IY1", "TH", "ER0"],
    "calculus": ["K", "AE1", "L", "K", "Y", "AH0", "L", "AH0", "S"],
    "laughin": ["L", "AE1", "F", "IH0", "N"],
    "demon": ["D", "IY1", "M", "AH0", "N"],
    "drip": ["D", "R", "IH1", "P"],
    "drippy": ["D", "R", "IH1", "P", "IY0"],
    "fam": ["F", "AE1", "M"],
    "finna": ["F", "IH1", "N", "AH0"],
    "flossin": ["F", "L", "AO1", "S", "IH0", "N"],
    "flexin": ["F", "L", "EH1", "K", "S", "IH0", "N"],
    "gangsta": ["G", "AE1", "NG", "S", "T", "AH0"],
    "glizzy": ["G", "L", "IH1", "Z", "IY0"],
    "gotta": ["G", "AA1", "T", "AH0"],
    "grindin": ["G", "R", "AY1", "N", "D", "IH0", "N"],
    "goin": ["G", "OW1", "IH0", "N"],
    "guap": ["G", "W", "AA1", "P"],
    "hitta": ["H", "IH1", "T", "AH0"],
    "icy": ["AY1", "S", "IY0"],
    "kickin": ["K", "IH1", "K", "IH0", "N"],
    "lowkey": ["L", "OW1", "K", "IY0"],
    "mobbin": ["M", "AA1", "B", "IH0", "N"],
    "opp": ["AA1", "P"],
    'ima': ["AY1", "M", "AH0"],
    "inflictin": ["IH2", "N", "F", "L", "IH1", "K", "T", "IH0", "N"],
    "perkies": ["P", "ER1", "K", "IY0", "Z"],
    "poppin": ["P", "AA1", "P", "IH0", "N"],
    "pullup": ["P", "UH1", "L", "AH0", "P"],
    'probly': ["P", "R", "AA1", "B", "L", "IY2"],
    "rack": ["R", "AE1", "K"],
    "readin": ["R", "IY1", "D", "IH0", "N"],
    "realer": ["R", "IY1", "L", "ER0"],
    "ridin": ["R", "AY1", "D", "IH0", "N"],
    "rollie": ["R", "OW1", "L", "IY0"],
    "roley": ["R", "OW1", "L", "IY0"],
    "runnin": ["R", "AH1", "N", "IH0", "N"],
    "reminiscin": ["R", "EH2", "M", "AH0", "N", "IH1", "S", "IH0", "N"],
    "shawty": ["SH", "AO1", "T", "IY0"],
    "sippin": ["S", "IH1", "P", "IH0", "N"],
    "slime": ["S", "L", "AY1", "M"],
    "slippin": ["S", "L", "IH1", "P", "IH0", "N"],
    "sleepin": ["S", "L", "IY1", "P", "IH0", "N"],
    "sittin": ["S", "IH1", "T", "IH0", "N"],
    "spitta": ["S", "P", "IH1", "T", "AH0"],
    "stoppa": ["S", "T", "AA1", "P", "AH0"],
    "stunna": ["S", "T", "AH1", "N", "AH0"],
    "sniffin": ["S", "N", "IH1", "F", "IH0", "N"],
    "steelo": ["S", "T", "IY1", "L", "OW1"],
    "swole": ["S", "W", "OW1", "L"],
    "thot": ["TH", "AA1", "T"],
    "thuggin": ["TH", "AH1", "G", "IH0", "N"],
    "trill": ["T", "R", "IH1", "L"],
    "tryna": ["T", "R", "AY1", "N", "AH0"],
    "twin": ["T", "W", "IH1", "N"],
    "wanna": ["W", "AA1", "N", "AH0"],
    "woo": ["W", "UW1"],
    "ye": ["Y", "EY1"],
    "yoself": ["Y", "OW1", "S", "EH0", "L", "F"],
    "zooted": ["Z", "UW1", "T", "IH0", "D"],
    "zirconia": ["Z", "ER0", "K", "OW1", "N", "IY0", "AH0"],
    "quesadilla": ["K", "EY1", "S", "AH0", "D", "IY1", "AH0"],
    "quesadillas": ["K", "EY1", "S", "AH0", "D", "IY1", "AH0", "Z"],
    "shrooms": ["SH", "R", "UW1", "M", "Z"],
    "trayvon": ["T", "R", "EY1", "V", "AH0", "N"],
    "sow": ["S", "OW1"],
    "xhosa": ["Z", "OW1", "Z", "AH0"],
    "piru": ["P", "AY1", "R", "UW1"],
    "pirus": ["P", "AY1", "R", "UW1", "Z"],
    "xannies": ["Z", "AE1", "N", "IY0", "Z"],
    "xan": ["Z", "AE1", "N"],
};

/**
 * Enhanced version of getWordPhones that includes fallbacks
 */
export const getWordPhonesWithFallback = (word: string): string[] | undefined => {
    const normalizedWord = word?.toLowerCase().trim().replace(/[.,!?;:'"]/g, '');
    if (!normalizedWord) return undefined;

    // Always check fallback with normalized (apostrophe-stripped) form
    if (fallbackPronunciations[normalizedWord]) {
        return fallbackPronunciations[normalizedWord];
    }

    // For CMU and API, use the original word (with apostrophe if present)
    const cmuPhones = getWordPhones(word.toLowerCase().trim());
    if (cmuPhones) return cmuPhones;

    if (apiPhonesCache[word.toLowerCase().trim()]) {
        return apiPhonesCache[word.toLowerCase().trim()];
    }

    // If not found, try the normalized form for CMU/API as a last resort
    const cmuPhonesNorm = getWordPhones(normalizedWord);
    if (cmuPhonesNorm) return cmuPhonesNorm;

    if (apiPhonesCache[normalizedWord]) {
        return apiPhonesCache[normalizedWord];
    }

    return undefined;
};

/**
 * Asynchronous version that will try the API
 * This can be used to pre-load phonemes that will then be available
 * via the synchronous getWordPhonesWithFallback function
 */
export const preloadPhonemesAsync = async (words: string[]): Promise<void> => {
    const missingWords = words.filter(word => {
        const normalizedWord = word.toLowerCase().trim();
        return !getWordPhonesWithFallback(normalizedWord) && !apiPhonesCache[normalizedWord];
    });

    if (missingWords.length === 0) return;

    console.log(`[PRELOAD] Fetching phonemes for ${missingWords.length} words...`);

    // Process in small batches to avoid overwhelming the API - I wrote it afterall
    const batchSize = 5;
    for (let i = 0; i < missingWords.length; i += batchSize) {
        const batch = missingWords.slice(i, i + batchSize);
        await Promise.all(batch.map(fetchPhonemesFromApi));
    }
};

/**
 * Gets a single word's phonemes asynchronously
 * Useful when you specifically need phonemes for just one word
 */
export const getWordPhonesAsync = async (word: string): Promise<string[] | undefined> => {
    const normalizedWord = word.toLowerCase().trim();

    const syncResult = getWordPhonesWithFallback(normalizedWord);
    if (syncResult) return syncResult;

    return await fetchPhonemesFromApi(normalizedWord);
};

const handleApiError = (error: any, word: string) => {
    if (error.message && error.message.includes('CORS')) {
        console.error(`CORS error when fetching phonemes for "${word}". Make sure your Flask API allows requests from ${window.location.origin}`);
    } else {
        console.error(`Error fetching phonemes for "${word}":`, error);
    }
};
