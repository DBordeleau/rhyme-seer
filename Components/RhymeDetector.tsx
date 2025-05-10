'use client';

import React from 'react';
import useRhymeAnalysis from '@/hooks/useRhymeAnalysis';
import type { RhymeGroup } from '@/lib/rhymeDetection';

export interface RhymeDetectorProps {
    inputText: string;
    children: (rhymeData: RhymeGroup[]) => React.ReactNode;
}

const RhymeDetector: React.FC<RhymeDetectorProps> = ({ inputText, children }) => {
    const rhymeData = useRhymeAnalysis(inputText);

    return <>{children(rhymeData)}</>;
};

export default RhymeDetector;