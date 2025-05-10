import { useState, useEffect } from 'react';
import { detectRhymes, type RhymeGroup } from '@/lib/rhymeDetection';

const useRhymeAnalysis = (text: string): RhymeGroup[] => {
    const [rhymeData, setRhymeData] = useState<RhymeGroup[]>([]);

    useEffect(() => {
        if (text) {
            const analyzedData = detectRhymes(text);
            setRhymeData(analyzedData);
        } else {
            setRhymeData([]);
        }
    }, [text]);

    return rhymeData;
};

export default useRhymeAnalysis;