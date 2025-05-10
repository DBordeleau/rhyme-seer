'use client';

import { useEffect, useState } from 'react';
import { preloadPhonemesAsync } from '@/lib/pronunciation';

interface PhonemePreloaderProps {
    text: string;
}

export default function PhonemePreloader({ text }: PhonemePreloaderProps) {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!text) return;

        const extractWords = (text: string): string[] => {
            const words = new Set<string>();
            const regex = /\b([a-zA-Z0-9']+(-[a-zA-Z0-9']+)*)\b/g;
            const matches = text.match(regex) || [];

            matches.forEach(word => {
                const cleaned = word.toLowerCase().trim().replace(/[.,!?;:'"]/g, '');
                if (cleaned.length > 1) {
                    words.add(cleaned);
                }
            });

            return Array.from(words);
        };

        const preloadPhonemes = async () => {
            const words = extractWords(text);
            if (words.length === 0) return;

            setIsLoading(true);
            try {
                await preloadPhonemesAsync(words);
            } finally {
                setIsLoading(false);
            }
        };

        // Debounce to avoid too many requests while typing
        const timeoutId = setTimeout(preloadPhonemes, 500);
        return () => clearTimeout(timeoutId);

    }, [text]);

    return isLoading ? (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-md text-sm z-50">
            Loading pronunciations...
        </div>
    ) : null;
}