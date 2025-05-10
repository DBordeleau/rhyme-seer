'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RhymeGroup } from '@/lib/rhymeDetection';

export interface HighlightedTextProps {
    text: string;
    rhymeData: RhymeGroup[];
}

const HighlightedText: React.FC<HighlightedTextProps> = ({ text, rhymeData }) => {
    if (!text) {
        return null;
    }

    if (rhymeData.length === 0) {
        return (
            <motion.div
                className="w-full max-w-2xl mx-auto p-8 rounded-xl bg-white shadow-lg text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className="text-2xl font-bold mb-4 text-slate-700">Highlighted Rhymes</h2>
                <div className="whitespace-pre-wrap font-sans text-lg text-slate-800 leading-relaxed">
                    {text.split('\n').map((line, i) => (
                        <div key={`line-${i}`} className="line my-1">{line || ' '}</div>
                    ))}
                </div>
                <AnimatePresence>
                    <motion.div
                        className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <p className="text-base">
                            No rhymes detected yet. Try adding more lines or different phrases.
                        </p>
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        );
    }

    type HighlightMap = {
        [lineIndex: number]: {
            [charIndex: number]: {
                color: string;
                groupId: string;
            }
        }
    };

    const highlightMap: HighlightMap = {};

    rhymeData.forEach(group => {
        group.words.forEach(word => {
            const { line, startChar, endChar } = word.position;

            if (!highlightMap[line]) {
                highlightMap[line] = {};
            }

            for (let i = startChar; i < endChar; i++) {
                highlightMap[line][i] = {
                    color: group.color,
                    groupId: group.groupId
                };
            }
        });
    });

    const lines = text.split('\n');

    return (
        <motion.div
            className="w-full max-w-2xl mx-auto p-8 rounded-xl bg-white shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <motion.h2
                className="text-2xl font-bold mb-6 text-center text-slate-700"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                Highlighted Rhymes
            </motion.h2>
            <div className="whitespace-pre-wrap font-sans py-0.5 text-lg leading-relaxed">
                {lines.map((line, lineIndex) => {
                    const lineHighlights = highlightMap[lineIndex] || {};
                    const segments: { text: string; color?: string; key: string }[] = [];
                    let currentSegment: { text: string; color?: string; start: number } | null = null;

                    const wordBoundaries: { start: number; end: number; text: string }[] = [];
                    line.replace(/\b(\w+)\b/g, (match, word, offset) => {
                        wordBoundaries.push({
                            start: offset,
                            end: offset + word.length,
                            text: word
                        });
                        return match;
                    });

                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        const highlight = lineHighlights[i];

                        // Find if we're at a word boundary
                        const isWordStart = wordBoundaries.some(w => w.start === i);
                        const isWithinWord = wordBoundaries.some(w => i >= w.start && i < w.end);
                        const wordBoundary = wordBoundaries.find(w => i >= w.start && i < w.end);

                        if (isWordStart && currentSegment) {
                            segments.push({
                                text: currentSegment.text,
                                color: currentSegment.color,
                                key: `${lineIndex}-${currentSegment.start}`
                            });
                            currentSegment = null;
                        }

                        if (!currentSegment) {
                            // Start a new segment
                            currentSegment = {
                                text: char,
                                color: highlight?.color,
                                start: i
                            };
                        } else if (isWithinWord && wordBoundary &&
                            (i === wordBoundary.start ||
                                (highlight?.color === currentSegment.color) ||
                                (!highlight && !currentSegment.color))) {
                            // Continue current segment if in same word and same highlight
                            currentSegment.text += char;
                        } else {
                            // End current segment and start a new one
                            segments.push({
                                text: currentSegment.text,
                                color: currentSegment.color,
                                key: `${lineIndex}-${currentSegment.start}`
                            });

                            currentSegment = {
                                text: char,
                                color: highlight?.color,
                                start: i
                            };
                        }
                    }

                    if (currentSegment) {
                        segments.push({
                            text: currentSegment.text,
                            color: currentSegment.color,
                            key: `${lineIndex}-${currentSegment.start}`
                        });
                    }

                    return (
                        <motion.div
                            key={`line-${lineIndex}`}
                            className="line my-2 text-slate-800"
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.05 * lineIndex }}
                        >
                            {segments.map((segment, segIndex) => (
                                segment.color ? (
                                    <motion.span
                                        key={segment.key}
                                        className="px-0.5 rounded"
                                        style={{
                                            backgroundColor: segment.color,
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                        }}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{
                                            duration: 0.4,
                                            delay: 0.2 + 0.05 * segIndex
                                        }}
                                    >
                                        {segment.text}
                                    </motion.span>
                                ) : (
                                    <span key={segment.key}>{segment.text}</span>
                                )
                            ))}
                        </motion.div>
                    );
                })}
            </div>

            <motion.div
                className="mt-6 pt-5 border-t border-slate-100 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <p className="text-sm text-slate-500">
                    Found {rhymeData.length} rhyme patterns
                </p>
            </motion.div>
        </motion.div>
    );
};

export default HighlightedText;