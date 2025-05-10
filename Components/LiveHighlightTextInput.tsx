'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useRhymeAnalysis from '@/hooks/useRhymeAnalysis';
import { useAnimation } from 'framer-motion';

export interface LiveHighlightTextInputProps {
    text: string;
    onTextChange: (text: string) => void;
}

const LiveHighlightTextInput: React.FC<LiveHighlightTextInputProps> = ({ text, onTextChange }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isMonospace, setIsMonospace] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightLayerRef = useRef<HTMLDivElement>(null);
    const rhymeData = useRhymeAnalysis(text);
    const controls = useAnimation();

    const fontFamily = isMonospace ? 'monospace' : 'Inter, system-ui, sans-serif';
    const fontClass = isMonospace ? 'font-mono' : 'font-sans';

    const sampleText = ``;

    const handleLoadSample = () => {
        onTextChange(sampleText);
    };

    // Toggle font function
    const toggleFont = () => {
        setIsMonospace(prev => !prev);
    };

    // Auto-resize textarea based on content height
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const adjustHeight = () => {
            textarea.style.height = 'auto';
            const newHeight = Math.max(120, textarea.scrollHeight);
            textarea.style.height = `${newHeight}px`;
        };

        adjustHeight();

        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(adjustHeight);
            resizeObserver.observe(textarea);

            return () => resizeObserver.disconnect();
        }

        window.addEventListener('resize', adjustHeight);
        return () => window.removeEventListener('resize', adjustHeight);
    }, []);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = 'auto';
        textarea.style.height = `${Math.max(120, textarea.scrollHeight)}px`;
    }, [text, isMonospace]);

    // Map positions to highlighting info
    type HighlightMap = {
        [lineIndex: number]: {
            [charIndex: number]: {
                color: string;
                groupId: string;
                index: number;
            }
        }
    };

    const highlightMap: HighlightMap = {};

    // Fill the highlight map if we have rhyme data
    if (rhymeData.length > 0 && text) {
        rhymeData.forEach((group, groupIndex) => {
            group.words.forEach((word, wordIndex) => {
                const { line, startChar, endChar } = word.position;

                if (!highlightMap[line]) {
                    highlightMap[line] = {};
                }

                for (let i = startChar; i < endChar; i++) {
                    highlightMap[line][i] = {
                        color: group.color,
                        groupId: group.groupId,
                        index: wordIndex // Add word index for staggering animation
                    };
                }
            });
        });
    }

    const lines = text.split('\n');

    // Generate the highlighted HTML
    const highlightedContent = (
        <pre className={`whitespace-pre-wrap m-0 p-0 h-full ${fontClass} text-lg`}
            style={{ fontFamily }}>
            {lines.map((line, lineIndex) => {
                const lineHighlights = highlightMap[lineIndex] || {};
                const segments: { text: string; color?: string; key: string }[] = [];
                let currentSegment: { text: string; color?: string; start: number } | null = null;

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    const highlight = lineHighlights[i];

                    // New segment if current segment is null or if the highlight changes
                    if (!currentSegment) {
                        currentSegment = {
                            text: char,
                            color: highlight?.color,
                            start: i
                        };
                    } else if ((highlight?.color === currentSegment.color) ||
                        (!highlight && !currentSegment.color)) {
                        // Continue current segment if the highlighting is the same
                        currentSegment.text += char;
                    } else {
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
                    <div key={`line-${lineIndex}`} className="whitespace-pre" style={{ lineHeight: '1.5rem', minHeight: '1.5rem' }}>
                        {segments.map((segment) => (
                            segment.color ? (
                                <motion.span
                                    key={segment.key}
                                    className="text-transparent inline-block"
                                    style={{
                                        backgroundColor: segment.color,
                                        opacity: 0.9,
                                        borderRadius: '3px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                    }}
                                    initial={{ opacity: 0, scale: 0.95, y: 2 }}
                                    animate={{
                                        opacity: 0.9,
                                        scale: 1,
                                        y: 0,
                                        transition: {
                                            duration: 0.5,
                                            ease: "easeOut",
                                            delay: 0.05 * parseInt(segment.key.split('-')[1])
                                        }
                                    }}
                                    whileHover={{
                                        scale: 1.05,
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                                        transition: { duration: 0.2 }
                                    }}
                                >
                                    {segment.text}
                                </motion.span>
                            ) : (
                                <span key={segment.key} className="text-transparent inline-block">{segment.text}</span>
                            )
                        ))}
                        {line === '' && <span className="text-transparent">&nbsp;</span>}
                    </div>
                );
            })}
            {text.endsWith('\n') && <div style={{ lineHeight: '1.5rem', minHeight: '1.5rem' }}><span className="text-transparent">&nbsp;</span></div>}
        </pre>
    );

    const minTextareaHeight = Math.max(
        120,
        (text.split('\n').length + (text.endsWith('\n') ? 1 : 0)) * 24
    );

    return (
        <motion.div
            className="w-full max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="relative rounded-xl shadow-lg bg-white">
                <div className="absolute inset-0 rounded-xl bg-white"></div>

                <motion.button
                    onClick={toggleFont}
                    className={`absolute top-3 right-3 px-2 py-1 rounded cursor-pointer text-xs z-10 transition-all font-mono
                              ${isMonospace
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                >
                    mono
                </motion.button>

                <div
                    ref={highlightLayerRef}
                    className="absolute inset-0 p-6 overflow-hidden pointer-events-none"
                    style={{
                        zIndex: 1,
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        padding: '1.5rem',
                    }}
                >
                    {highlightedContent}
                </div>

                <textarea
                    ref={textareaRef}
                    id="lyrics-input"
                    className={`w-full p-6 rounded-xl bg-transparent border-0 text-slate-800 
                             focus:outline-none focus:ring-2 relative text-lg
                             transition-all duration-300 ease-in-out ${fontClass}`}
                    style={{
                        resize: 'none',
                        caretColor: '#000',
                        position: 'relative',
                        zIndex: 2,
                        lineHeight: '1.5rem',
                        padding: '1.5rem',
                        minHeight: `${minTextareaHeight}px`,
                        overflow: 'hidden',
                        fontFamily,
                    }}
                    value={text}
                    onChange={(e) => {
                        onTextChange(e.target.value);
                        // Autoresizes when needed
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.max(120, e.target.scrollHeight)}px`;
                    }}
                    placeholder="Paste or type lyrics here to see rhyme patterns..."
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    spellCheck={false}
                    autoCorrect="off"
                    autoComplete="off"
                    autoCapitalize="none"
                />
            </div>

            <AnimatePresence>
                {text && rhymeData.length > 0 && (
                    <motion.div
                        className="mt-4 text-center"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <p className="text-sm text-slate-500">
                            Found {rhymeData.length} rhyme patterns
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div className="mt-3 text-center">
                <p className="text-sm text-slate-500">
                    Tip: Try multi-line content for better rhyme detection
                </p>
            </motion.div>
        </motion.div>
    );
};

export default LiveHighlightTextInput;