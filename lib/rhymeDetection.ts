// eslint-disable-next-line @typescript-eslint/no-var-requires
const cmuModule = require('cmu-pronouncing-dictionary');
import { getWordPhonesWithFallback } from './pronunciation';

// Exporteds to livehighlighterinput
export interface RhymeGroup {
    groupId: string;
    color: string;
    words: {
        text: string;
        position: {
            line: number;
            startChar: number;
            endChar: number;
        }
    }[];
    originalIndices?: number[];
}

// Maximum line distance for rhyme groups (2 lines)
const MAX_LINE_DISTANCE = 4;

// CMU vowel phonemes (these are all the vowel sounds in the CMU dictionary)
const CMU_VOWELS = new Set(['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW']);

export const convertNumbersToWords = (text: string): string => {
    // Replace standalone digits with their word equivalents
    return text.replace(/\b(\d+)\b/g, (match) => {
        if (match === '0') return 'zero';
        if (match === '1') return 'one';
        if (match === '2') return 'two';
        if (match === '3') return 'three';
        if (match === '4') return 'four';
        if (match === '5') return 'five';
        if (match === '6') return 'six';
        if (match === '7') return 'seven';
        if (match === '8') return 'eight';
        if (match === '9') return 'nine';
        return match; // Return other numbers as is
    });
};

/**
 * Cleans a word for comparison
 */
const normalizeWord = (word: string): string => {
    return word.toLowerCase().trim().replace(/[.,!?;:'"]/g, '');
};

// List of common words to exclude from rhyme detection
// These words are often part of schemes, but they are not interesting and can connect otherwise totally distinct schemes
const commonWordsToExclude = new Set([
    'the', 'a', 'an', 'with', 'and', 'is', "i'm",
    'he', 'me', 'be', 'we', 'she', 'no', 'so', 'to', 'of', 'in', 'on', 'for', 'it', 'was', 'your', 'at', 'by', 'as', 'do', 'my', 'or', 'if', 'but', 'not', 'you', 'your'
]);

/**
 * Determines if a word should be excluded from rhyme detection
 */
const shouldExcludeWord = (word: string): boolean => {
    const normalizedWord = normalizeWord(word);
    return commonWordsToExclude.has(normalizedWord) || normalizedWord.length < 2;
};

/**
 * Returns the index of the last stressed vowel in a phoneme array.
 */
function getLastStressedVowelIndex(phones: string[]): number | null {
    for (let i = phones.length - 1; i >= 0; i--) {
        const base = phones[i].replace(/[0-9]$/, '');
        if (CMU_VOWELS.has(base) && /[12]$/.test(phones[i])) {
            return i;
        }
    }
    return null;
}

function getStressedVowelIndices(phones: string[]): number[] {
    const indices: number[] = [];
    for (let i = 0; i < phones.length; i++) {
        const base = phones[i].replace(/[0-9]$/, '');
        if (CMU_VOWELS.has(base) && /[12]$/.test(phones[i])) {
            indices.push(i);
        }
    }
    return indices;
}

/**
 * Returns the base phoneme (without stress number).
 */
function basePhoneme(phone: string): string {
    return phone.replace(/[0-9]$/, '');
}

/**
 * Returns true if two consonant phonemes are similar for slant rhymes.
 */
function areSimilarConsonants(a: string, b: string): boolean {
    if (a === b) return true;
    const SIMILAR_CONSONANTS: Record<string, string[]> = {
        'S': ['Z'],
        'Z': ['S'],
        'F': ['V', 'TH'],
        'V': ['F'],
        'TH': ['DH', 'F'],
        'DH': ['TH'],
        'T': ['D', 'P', 'B'],
        'D': ['T'],
        'K': ['G'],
        'G': ['K'],
        'P': ['B'],
        'B': ['P'],
        'SH': ['ZH'],
        'ZH': ['SH'],
    };
    return SIMILAR_CONSONANTS[a]?.includes(b) || SIMILAR_CONSONANTS[b]?.includes(a);
}

// Similar vowels that can be considered equivalent for rhyming
const SIMILAR_VOWEL_PAIRS: [string, string][] = [
    ['AO', 'AA'],
];

function vowelsRhymeEquivalent(v1: string, v2: string): boolean {
    if (v1 === v2) return true;
    const match = SIMILAR_VOWEL_PAIRS.some(
        ([a, b]) => (v1 === a && v2 === b) || (v1 === b && v2 === a)
    );
    if (match) {
        console.log(`Near rhyme match: ${v1} ~ ${v2}`);
    }
    return match;
}

/**
 * Returns the syllable count of a word based on its phonemes.
 */
function getSyllableCount(phones: string[]): number {
    return phones.filter(p => CMU_VOWELS.has(basePhoneme(p))).length;
}

/**
 * Identifies potential compound words and their parts
 * Returns both the full word and its constituent parts for rhyme checking
 */
function getWordParts(word: string): { text: string, startOffset: number, endOffset: number }[] {
    const normalizedWord = normalizeWord(word);

    // Only process longer words - minimum length 6 to make any meaningful split
    if (normalizedWord.length < 6) return [];

    const result: { text: string, startOffset: number, endOffset: number }[] = [];

    // Common prefixes and suffixes in English - only include ones >= 3 chars
    const prefixes = [
        'anti', 'dis', 'inter', 'mis', 'non', 'out',
        'over', 'post', 'pre', 'self', 'sub',
        'super', 'under', 'ultra'
    ];

    const suffixes = [
        'able', 'ance', 'ation', 'ence', 'eous', 'ful', 'hood', 'ible',
        'ical', 'ious', 'ism', 'ity', 'ize', 'less', 'ment',
        'ness', 'ous', 'ville', 'ware'
    ];

    // Check for compound words
    for (let i = 3; i < normalizedWord.length - 3; i++) {
        const part1 = normalizedWord.substring(0, i);
        const part2 = normalizedWord.substring(i);

        if (part1.length < 3 || part2.length < 3) continue;

        const phones1 = getWordPhonesWithFallback(part1);
        const phones2 = getWordPhonesWithFallback(part2);

        // Additional validation for meaningful parts
        if (phones1 && phones2) {
            // Each part must have at least one vowel sound
            const hasVowelSound1 = phones1.some(p => CMU_VOWELS.has(basePhoneme(p)));
            const hasVowelSound2 = phones2.some(p => CMU_VOWELS.has(basePhoneme(p)));

            if (hasVowelSound1 && hasVowelSound2) {
                result.push({
                    text: part1,
                    startOffset: 0,
                    endOffset: i
                });
                result.push({
                    text: part2,
                    startOffset: i,
                    endOffset: normalizedWord.length
                });
            }
        }
    }

    for (const prefix of prefixes) {
        if (normalizedWord.startsWith(prefix) && normalizedWord.length > prefix.length + 3) {
            const remainder = normalizedWord.substring(prefix.length);

            // Only continue if remainder is at least 3 characters AND has phonetic data
            if (remainder.length >= 3 && getWordPhonesWithFallback(remainder)) {
                result.push({
                    text: remainder,
                    startOffset: prefix.length,
                    endOffset: normalizedWord.length
                });
            }
        }
    }

    for (const suffix of suffixes) {
        if (normalizedWord.endsWith(suffix) && normalizedWord.length > suffix.length + 3) {
            const base = normalizedWord.substring(0, normalizedWord.length - suffix.length);

            // Only continue if base is at least 3 characters AND has phonetic data
            if (base.length >= 3 && getWordPhonesWithFallback(base)) {
                result.push({
                    text: base,
                    startOffset: 0,
                    endOffset: normalizedWord.length - suffix.length
                });
            }
        }
    }

    return result;
}

/**
 * Returns true if two words rhyme according to the new core rules.
 */
export const doWordsRhyme = (word1: string, word2: string): boolean => {
    word1 = convertNumbersToWords(word1);
    word2 = convertNumbersToWords(word2);

    const w1 = normalizeWord(word1);
    const w2 = normalizeWord(word2);

    if (w1 === w2) return false;
    if (shouldExcludeWord(w1) || shouldExcludeWord(w2)) return false;

    const phones1 = getWordPhonesWithFallback(w1);
    const phones2 = getWordPhonesWithFallback(w2);

    if (!phones1 || !phones2) return false;

    const idx1 = getLastStressedVowelIndex(phones1);
    const idx2 = getLastStressedVowelIndex(phones2);

    if (idx1 === null || idx2 === null) return false;

    const vowel1 = basePhoneme(phones1[idx1]);
    const vowel2 = basePhoneme(phones2[idx2]);

    const stressed1 = getStressedVowelIndices(phones1);
    const stressed2 = getStressedVowelIndices(phones2);

    // Helper function to get the last vowel phoneme
    function getLastVowel(phones: string[]): string | null {
        for (let i = phones.length - 1; i >= 0; i--) {
            const base = basePhoneme(phones[i]);
            if (CMU_VOWELS.has(base)) {
                return base;
            }
        }
        return null;
    }

    // Helper function to get all vowel phonemes in order
    function getAllVowels(phones: string[]): string[] {
        return phones
            .map(phone => basePhoneme(phone))
            .filter(phone => CMU_VOWELS.has(phone));
    }

    // Rule 1: Same (or similar) last stressed vowel AND same last phoneme
    if (
        vowelsRhymeEquivalent(vowel1, vowel2) &&
        basePhoneme(phones1[phones1.length - 1]) === basePhoneme(phones2[phones2.length - 1])
    ) {
        if ((w1 === 'eureka' && w2 === 'mtv') || (w1 === 'mtv' && w2 === 'eureka')) {
            console.log("MATCH: Rule 1 - Last stressed vowel and last phoneme");
        }
        return true;
    }

    // Rule 2: Same (or similar) last stressed vowel, and one word ends at the vowel
    // BUT only if the word ending in a vowel is a single syllable word
    if (vowelsRhymeEquivalent(vowel1, vowel2)) {
        const endsAtVowel1 = idx1 === phones1.length - 1;
        const endsAtVowel2 = idx2 === phones2.length - 1;

        // Only one ends at the vowel
        if (endsAtVowel1 !== endsAtVowel2) {
            const singleSyllableCheck = endsAtVowel1 ?
                getSyllableCount(phones1) === 1 :
                getSyllableCount(phones2) === 1;

            if (!singleSyllableCheck) {
                // Not a single syllable word ending in vowel, don't match
                if ((w1 === 'eureka' && w2 === 'mtv') || (w1 === 'mtv' && w2 === 'eureka')) {
                    console.log("Rule 2 rejected - word ending in vowel is not single syllable");
                }
                return false;
            }

            // The word that has something after the vowel
            const afterVowelPhones = endsAtVowel1 ? phones2 : phones1;
            // If it ends with 'L', don't rhyme
            if (basePhoneme(afterVowelPhones[afterVowelPhones.length - 1]) === 'L') {
                return false;
            }

            if ((w1 === 'eureka' && w2 === 'mtv') || (w1 === 'mtv' && w2 === 'eureka')) {
                console.log("MATCH: Rule 2 - One word ends at vowel");
                console.log(`endsAtVowel1: ${endsAtVowel1}, endsAtVowel2: ${endsAtVowel2}`);
                console.log(`Word ending in vowel has syllable count: ${endsAtVowel1 ? getSyllableCount(phones1) : getSyllableCount(phones2)}`);
            }
            return true;
        }
    }

    // Rule 3: Same (or similar) last stressed vowel, and similar ending consonant
    if (vowelsRhymeEquivalent(vowel1, vowel2)) {
        const end1 = phones1[phones1.length - 1];
        const end2 = phones2[phones2.length - 1];
        if (
            !CMU_VOWELS.has(basePhoneme(end1)) &&
            !CMU_VOWELS.has(basePhoneme(end2)) &&
            areSimilarConsonants(basePhoneme(end1), basePhoneme(end2))
        ) {
            if ((w1 === 'eureka' && w2 === 'mtv') || (w1 === 'mtv' && w2 === 'eureka')) {
                console.log("MATCH: Rule 3 - Similar ending consonant");
            }
            return true;
        }
    }

    // Rule 4: Same (or similar) last stressed vowel and same consonant after, and one ends with S or Z
    if (vowelsRhymeEquivalent(vowel1, vowel2)) {
        const after1 = phones1[idx1 + 1] ? basePhoneme(phones1[idx1 + 1]) : null;
        const after2 = phones2[idx2 + 1] ? basePhoneme(phones2[idx2 + 1]) : null;

        if (after1 && after2 && after1 === after2) {
            const end1 = basePhoneme(phones1[phones1.length - 1]);
            const end2 = basePhoneme(phones2[phones2.length - 1]);
            if (
                (end1 === 'S' || end1 === 'Z' || end2 === 'S' || end2 === 'Z')
            ) {
                if ((w1 === 'eureka' && w2 === 'mtv') || (w1 === 'mtv' && w2 === 'eureka')) {
                    console.log("MATCH: Rule 4 - S/Z ending");
                }
                return true;
            }
        }
    }

    // Rule 5: Both end in IY (stressed or unstressed), and share the same first vowel
    if (
        basePhoneme(phones1[phones1.length - 1]) === 'IY' &&
        basePhoneme(phones2[phones2.length - 1]) === 'IY'
    ) {
        // Get all vowels regardless of stress
        const allVowels1 = getAllVowels(phones1);
        const allVowels2 = getAllVowels(phones2);

        if (allVowels1.length >= 2 &&
            allVowels2.length >= 2 &&
            allVowels1[0] === allVowels2[0]) {

            return true;
        }

        if (stressed1.length >= 2 && stressed2.length >= 2) {
            const penultVowel1 = basePhoneme(phones1[stressed1[stressed1.length - 2]]);
            const penultVowel2 = basePhoneme(phones2[stressed2[stressed2.length - 2]]);
            if (penultVowel1 === penultVowel2) {
                return true;
            }
        }
    }

    // Rule 6: Single-syllable words with a stressed "EH" vowel rhyme
    // (e.g., stressed/neck/best/let/bet)
    const isSingleSyllable = (phones: string[]) => {
        // Count vowels (syllables)
        return phones.filter(p => CMU_VOWELS.has(basePhoneme(p))).length === 1;
    };
    const hasStressedEH = (phones: string[]) => {
        return phones.some(p => basePhoneme(p) === 'EH' && /[12]$/.test(p));
    };
    if (
        isSingleSyllable(phones1) &&
        isSingleSyllable(phones2) &&
        hasStressedEH(phones1) &&
        hasStressedEH(phones2)
    ) {
        return true;
    }

    // Rule 7: Single-syllable words with a stressed "IY" vowel rhyme (e.g., feel/these)
    const hasStressedIY = (phones: string[]) => {
        return phones.some(p => basePhoneme(p) === 'IY' && /[12]$/.test(p));
    };
    if (
        isSingleSyllable(phones1) &&
        isSingleSyllable(phones2) &&
        hasStressedIY(phones1) &&
        hasStressedIY(phones2)
    ) {
        return true;
    }

    // General rule: Single-syllable words with the same vowel sound rhyme
    if (isSingleSyllable(phones1) && isSingleSyllable(phones2)) {
        const vowel1 = phones1.find(p => CMU_VOWELS.has(basePhoneme(p)));
        const vowel2 = phones2.find(p => CMU_VOWELS.has(basePhoneme(p)));

        if (vowel1 && vowel2 && basePhoneme(vowel1) === basePhoneme(vowel2)) {
            const endsWithL1 = phones1[phones1.length - 1] && basePhoneme(phones1[phones1.length - 1]) === 'L';
            const endsWithL2 = phones2[phones2.length - 1] && basePhoneme(phones2[phones2.length - 1]) === 'L';
            const endsWithR1 = phones1[phones1.length - 1] && basePhoneme(phones1[phones1.length - 1]) === 'R';
            const endsWithR2 = phones2[phones2.length - 1] && basePhoneme(phones2[phones2.length - 1]) === 'R';
            const endsWithN1 = phones1[phones1.length - 1] && basePhoneme(phones1[phones1.length - 1]) === 'N';
            const endsWithN2 = phones2[phones2.length - 1] && basePhoneme(phones2[phones2.length - 1]) === 'N';
            const endsWithM1 = phones1[phones1.length - 1] && basePhoneme(phones1[phones1.length - 1]) === 'M';
            const endsWithM2 = phones2[phones2.length - 1] && basePhoneme(phones2[phones2.length - 1]) === 'M';

            // Special case 1: EH + L words only rhyme with other EH + L words
            if (basePhoneme(vowel1) === 'EH') {
                // If one ends with L and the other doesn't, they don't rhyme
                if (endsWithL1 !== endsWithL2) {
                    return false;
                }
            }

            // Special case 2: AY + nasal (N/M) vs. non-nasal endings
            if (basePhoneme(vowel1) === 'AY') {
                const nasalEnding1 = endsWithN1 || endsWithM1;
                const nasalEnding2 = endsWithN2 || endsWithM2;
                if (nasalEnding1 !== nasalEnding2) {
                    return false;
                }
            }

            // Special case 3: OW + L words (like "bowl") vs. other OW words
            if (basePhoneme(vowel1) === 'OW') {
                const vowelPos1 = phones1.findIndex(p => basePhoneme(p) === 'OW');
                const vowelPos2 = phones2.findIndex(p => basePhoneme(p) === 'OW');

                const hasLAfterVowel1 = vowelPos1 < phones1.length - 1 &&
                    basePhoneme(phones1[vowelPos1 + 1]) === 'L';
                const hasLAfterVowel2 = vowelPos2 < phones2.length - 1 &&
                    basePhoneme(phones2[vowelPos2 + 1]) === 'L';

                // If one has L after vowel and other doesn't, they don't rhyme
                if (hasLAfterVowel1 !== hasLAfterVowel2) {
                    return false;
                }
            }

            // Special case 4: Words with R before UW (brew/true) vs other UW words (blue/new)
            if (basePhoneme(vowel1) === 'UW') {
                const hasRBeforeVowel1 = phones1.findIndex(p => basePhoneme(p) === 'UW') > 0 &&
                    basePhoneme(phones1[phones1.findIndex(p => basePhoneme(p) === 'UW') - 1]) === 'R';
                const hasRBeforeVowel2 = phones2.findIndex(p => basePhoneme(p) === 'UW') > 0 &&
                    basePhoneme(phones2[phones2.findIndex(p => basePhoneme(p) === 'UW') - 1]) === 'R';
                if (hasRBeforeVowel1 !== hasRBeforeVowel2) {
                    return false;
                }
            }

            // Words with UH or AH vowel that end in R only rhyme with other R-ending words
            if (basePhoneme(vowel1) === 'UH' || basePhoneme(vowel1) === 'AH') {
                // If one ends with R and the other doesn't, they don't rhyme
                if (endsWithR1 !== endsWithR2) {
                    return false;
                }
            }

            // If we passed all the special case checks, the words rhyme
            return true;
        }
    }

    // Rule 8: 2nd last stressed vowel is the same, end in a near vowel pair, and syllable count within 1
    const EXTENDED_SIMILAR_VOWEL_PAIRS: [string, string][] = [
        ...SIMILAR_VOWEL_PAIRS,
        ['AH', 'ER'],
        ['ER', 'AH'],
    ];
    const vowelsNearEquivalent = (v1: string, v2: string) => {
        if (v1 === v2) return true;
        return EXTENDED_SIMILAR_VOWEL_PAIRS.some(
            ([a, b]) => (v1 === a && v2 === b) || (v1 === b && v2 === a)
        );

    };

    if (
        stressed1.length >= 2 &&
        stressed2.length >= 2
    ) {
        const penultVowel1 = basePhoneme(phones1[stressed1[stressed1.length - 2]]);
        const penultVowel2 = basePhoneme(phones2[stressed2[stressed2.length - 2]]);
        const lastVowel1 = getLastVowel(phones1);
        const lastVowel2 = getLastVowel(phones2);

        const isEurekaTeacherPair = (
            (lastVowel1 === 'AH' && lastVowel2 === 'ER') ||
            (lastVowel1 === 'ER' && lastVowel2 === 'AH')
        );

        if (
            penultVowel1 === penultVowel2 &&
            lastVowel1 && lastVowel2 &&
            (
                lastVowel1 === lastVowel2 ||
                isEurekaTeacherPair
            ) &&
            Math.abs(getSyllableCount(phones1) - getSyllableCount(phones2)) <= 1
        ) {
            return true;
        }
    }

    // Special rule for "ING/INE/IN" endings that share the same stressed vowel
    if (vowelsRhymeEquivalent(vowel1, vowel2)) {
        // Get endings after the stressed vowel
        const ending1 = phones1.slice(idx1 + 1);
        const ending2 = phones2.slice(idx2 + 1);

        const hasN1 = ending1.some(p => basePhoneme(p) === 'N');
        const hasN2 = ending2.some(p => basePhoneme(p) === 'N');

        if (hasN1 && hasN2) {
            const endsWithZ1 = basePhoneme(phones1[phones1.length - 1]) === 'Z';
            const endsWithZ2 = basePhoneme(phones2[phones2.length - 1]) === 'Z';

            if (endsWithZ1 && endsWithZ2) {
                // If they both end with Z and have N before that
                return true;
            }
        }
    }

    // Special rule for multi-word phrases with phonetic patterns similar to "-ing/-in/-ion" endings
    if (w1.includes(' ') || w2.includes(' ')) {

        // Get the core vowel sound from the stressed vowel in both words
        const coreVowel1 = vowel1;
        const coreVowel2 = vowel2;

        // If they share the same stressed vowel (typically AY in these cases)
        if (vowelsRhymeEquivalent(coreVowel1, coreVowel2)) {
            const hasN1 = phones1.some(p => basePhoneme(p) === 'N');
            const hasN2 = phones2.some(p => basePhoneme(p) === 'N');

            // If both contain an N sound
            if (hasN1 && hasN2) {
                // Pattern 1: Words with AY sound followed by a nasal ending
                if ((coreVowel1 === 'AY' || coreVowel2 === 'AY') && hasN1 && hasN2) {
                    // Get vowels after AY sound
                    const vowelsAfterAY1 = getAllVowels(phones1.slice(phones1.findIndex(p => basePhoneme(p) === 'AY') + 1));
                    const vowelsAfterAY2 = getAllVowels(phones2.slice(phones2.findIndex(p => basePhoneme(p) === 'AY') + 1));

                    // Check for variation patterns in the ending vowels
                    // Either both have no vowels after AY, or one has AH/IH and the other has AA/IH
                    const validEnding =
                        (vowelsAfterAY1.length === 0 && vowelsAfterAY2.length === 0) ||
                        (vowelsAfterAY1.includes('AH') && vowelsAfterAY2.includes('AA')) ||
                        (vowelsAfterAY1.includes('AA') && vowelsAfterAY2.includes('AH')) ||
                        (vowelsAfterAY1.includes('IH') && vowelsAfterAY2.includes('IH')) ||
                        (vowelsAfterAY1.includes('AH') && vowelsAfterAY2.includes('IH')) ||
                        (vowelsAfterAY1.includes('IH') && vowelsAfterAY2.includes('AH'));

                    if (validEnding) {
                        return true;
                    }
                }
            }
        }
    }

    return false;
};

/**
 * Detects rhyme groups in the text using doWordsRhyme.
 * Returns an array of RhymeGroup objects for highlighting.
 */
export function detectRhymes(text: string): RhymeGroup[] {
    if (!text) return [];

    const lines = text.split('\n');
    type WordInfo = {
        text: string;
        line: number;
        startChar: number;
        endChar: number;
        isMultiWord?: boolean;
        isPartialWord?: boolean;
        parentWord?: string;
    };
    const words: WordInfo[] = [];

    // Add single words first
    lines.forEach((line, lineIndex) => {
        let match;
        const wordRegex = /\b([a-zA-Z0-9']+)\b/g;
        while ((match = wordRegex.exec(line)) !== null) {
            const fullWord = match[1];
            words.push({
                text: fullWord,
                line: lineIndex,
                startChar: match.index,
                endChar: match.index + fullWord.length,
                isMultiWord: false,
                isPartialWord: false
            });

            // Add word parts for compound words
            const wordParts = getWordParts(fullWord);
            for (const part of wordParts) {
                if (!shouldExcludeWord(part.text)) {
                    words.push({
                        text: part.text,
                        line: lineIndex,
                        startChar: match.index + part.startOffset,
                        endChar: match.index + part.endOffset,
                        isPartialWord: true,
                        parentWord: fullWord
                    });
                }
            }
        }
    });

    // Add multi-word combinations (up to 2 words for now)
    lines.forEach((line, lineIndex) => {
        // Find all word positions in this line
        const wordPositions: { word: string, start: number, end: number }[] = [];
        let match;
        const wordRegex = /\b([a-zA-Z0-9']+)\b/g;
        while ((match = wordRegex.exec(line)) !== null) {
            wordPositions.push({
                word: match[1],
                start: match.index,
                end: match.index + match[1].length
            });
        }

        // Create two-word combinations
        for (let i = 0; i < wordPositions.length - 1; i++) {
            const word1 = wordPositions[i].word;
            const word2 = wordPositions[i + 1].word;

            if (shouldExcludeWord(word1) || shouldExcludeWord(word2)) continue;

            if (commonWordsToExclude.has(normalizeWord(word1)) &&
                commonWordsToExclude.has(normalizeWord(word2))) continue;

            words.push({
                text: `${word1} ${word2}`,
                line: lineIndex,
                startChar: wordPositions[i].start,
                endChar: wordPositions[i + 1].end,
                isMultiWord: true
            });
        }
    });

    // Build adjacency list for rhyming words within MAX_LINE_DISTANCE
    const adjacency: number[][] = words.map(() => []);
    for (let i = 0; i < words.length; i++) {
        for (let j = i + 1; j < words.length; j++) {
            // Skip if both are multi-word to avoid excessive matching
            if (words[i].isMultiWord && words[j].isMultiWord) continue;

            // Skip if the parent word of a partial word is already in a rhyme with the other word
            // avoids redundant highlighting
            if ((words[i].isPartialWord && words[i].parentWord === words[j].text) ||
                (words[j].isPartialWord && words[j].parentWord === words[i].text)) {
                continue;
            }

            const overlapping = words[i].line === words[j].line && (
                (words[i].startChar <= words[j].startChar && words[i].endChar >= words[j].startChar) ||
                (words[j].startChar <= words[i].startChar && words[j].endChar >= words[i].startChar)
            );

            // Allow partial words to rhyme even if they overlap with each other
            const bothPartialOverlapping = words[i].isPartialWord && words[j].isPartialWord &&
                words[i].line === words[j].line &&
                words[i].parentWord === words[j].parentWord;

            if (overlapping && !bothPartialOverlapping) continue;

            if (Math.abs(words[i].line - words[j].line) <= MAX_LINE_DISTANCE) {
                if (doWordsRhyme(words[i].text, words[j].text)) {
                    adjacency[i].push(j);
                    adjacency[j].push(i);
                }
            }
        }
    }

    // filter out invalid rhyme connections after adjacency list creation
    const removeInvalidRhymeConnections = () => {
        // helper map to track valid partial pairs
        const validPartialWordPairs = new Set<string>();

        // First pass: identify valid partial word rhymes (like "land" in "landscape")
        for (let i = 0; i < words.length; i++) {
            if (words[i].isPartialWord) {
                if (words[i].text.length < 3) continue;

                for (let j = 0; j < adjacency[i].length; j++) {
                    const rhymeIdx = adjacency[i][j];

                    if (!words[rhymeIdx].isPartialWord || words[rhymeIdx].parentWord !== words[i].parentWord) {
                        const pairKey = i < rhymeIdx ? `${i}-${rhymeIdx}` : `${rhymeIdx}-${i}`;
                        validPartialWordPairs.add(pairKey);
                    }
                }
            }
        }

        // Second pass: remove connections that unnaturally split words
        for (let i = 0; i < words.length; i++) {
            adjacency[i] = adjacency[i].filter(j => {
                // Filter out any partial word less than 3 chars -- prevents nonsense splits
                if ((words[i].isPartialWord && words[i].text.length < 3) ||
                    (words[j].isPartialWord && words[j].text.length < 3)) {
                    return false;
                }

                // Skip checks for valid partial word pairs we identified
                const pairKey = i < j ? `${i}-${j}` : `${j}-${i}`;
                if (validPartialWordPairs.has(pairKey)) return true;

                if (words[i].isPartialWord &&
                    words[j].isPartialWord &&
                    words[i].line === words[j].line) {

                    // Check if they're from the same parent word
                    if (words[i].parentWord === words[j].parentWord) {
                        // Never allow words with 6 or fewer chars to be split
                        const parentWordLength = words[i].parentWord!.length;
                        if (parentWordLength <= 6) {
                            return false;
                        }

                        // Only for longer words, ensure both parts are at least 3 chars -- prevents nonsense splits
                        const part1Length = words[i].endChar - words[i].startChar;
                        const part2Length = words[j].endChar - words[j].startChar;
                        return part1Length >= 3 && part2Length >= 3;
                    }

                    // Different parent words - check for overlap and remove overlapping
                    const overlapping =
                        (words[i].startChar <= words[j].startChar && words[i].endChar > words[j].startChar) ||
                        (words[j].startChar <= words[i].startChar && words[j].endChar > words[i].startChar);

                    return !overlapping;
                }

                return true;
            });
        }
    };

    removeInvalidRhymeConnections();

    const visited = new Array(words.length).fill(false);
    const groups: RhymeGroup[] = [];
    let colorIdx = 0;
    const colorPalette = [
        "#ffe119", // Yellow
        "#e6194B", // Red
        "#bfef45", // Lime green
        "#60a5fa", // Blue
        "#f032e6", // Pink 
        "#00f300", // Green
        "#dcbeff", // Purple/lavender
        "#00ffff",  // Cyan
        "#ffd8b1" // Aprictot
    ];

    for (let i = 0; i < words.length; i++) {
        if (visited[i]) continue;
        // BFS to find all connected words
        const queue = [i];
        const group: number[] = [];
        visited[i] = true;
        while (queue.length > 0) {
            const curr = queue.shift()!;
            group.push(curr);
            for (const neighbor of adjacency[curr]) {
                if (!visited[neighbor]) {
                    visited[neighbor] = true;
                    queue.push(neighbor);
                }
            }
        }
        if (group.length > 1) {
            // Filter out multi word entries if their single words are already in the group
            const finalGroup = group.filter(idx => {
                // Keep single words
                if (!words[idx].isMultiWord) return true;

                // For multi-words, check if all component words are already represented
                const multiWordText = words[idx].text;
                const parts = multiWordText.split(/\s+/);

                // Only keep this multi-word if it adds new connections
                // (not just combining words already in the group) -- this prevents lone words from being bridges to create super groups
                const allPartsAlreadyInGroup = parts.every(part =>
                    group.some(gIdx => !words[gIdx].isMultiWord &&
                        normalizeWord(words[gIdx].text) === normalizeWord(part))
                );

                return !allPartsAlreadyInGroup;
            });

            if (finalGroup.length > 1) {
                groups.push({
                    groupId: `group-${groups.length}`,
                    color: colorPalette[colorIdx % colorPalette.length],
                    words: finalGroup.map(idx => ({
                        text: words[idx].text,
                        position: {
                            line: words[idx].line,
                            startChar: words[idx].startChar,
                            endChar: words[idx].endChar,
                        }
                    })),
                    originalIndices: finalGroup
                });
                colorIdx++;
            }
        }
    }

    // After all groups are created, sort them by average line position
    const groupsWithAvgLine = groups.map(group => {
        const avgLine = group.words.reduce((sum, w) => sum + w.position.line, 0) / group.words.length;
        return { ...group, avgLine };
    });

    groupsWithAvgLine.sort((a, b) => a.avgLine - b.avgLine);

    groupsWithAvgLine.forEach((group, idx) => {
        group.color = colorPalette[idx % colorPalette.length];
    });

    // If there are more groups than colors, try to avoid adjacent groups having the same color
    if (groups.length > colorPalette.length) {
        groups.forEach((group, idx) => {
            // module w/ prime offset strategy to make sure adjacent/nearby groups have different colors
            const colorIndex = (idx * 3) % colorPalette.length;
            group.color = colorPalette[colorIndex];
        });
    }

    return groupsWithAvgLine.map(({ avgLine, ...group }) => group);
}