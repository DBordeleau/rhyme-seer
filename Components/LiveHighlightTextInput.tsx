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
    const highlightRef = useRef<HTMLPreElement>(null);
    const rhymeData = useRhymeAnalysis(text);
    const controls = useAnimation();

    const fontFamily = isMonospace ? 'monospace' : 'Inter, system-ui, sans-serif';
    const fontClass = isMonospace ? 'font-mono' : 'font-sans';

    // Toggle font function
    const toggleFont = () => setIsMonospace(prev => !prev);

    // Auto-resize textarea and highlight layer
    useEffect(() => {
        const textarea = textareaRef.current;
        const highlight = highlightRef.current;
        if (!textarea || !highlight) return;

        const adjustHeight = () => {
            textarea.style.height = 'auto';
            highlight.style.height = 'auto';
            const newHeight = Math.max(120, textarea.scrollHeight);
            textarea.style.height = `${newHeight}px`;
            highlight.style.height = `${newHeight}px`;
        };

        adjustHeight();

        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(adjustHeight);
            resizeObserver.observe(textarea);
            return () => resizeObserver.disconnect();
        }

        window.addEventListener('resize', adjustHeight);
        return () => window.removeEventListener('resize', adjustHeight);
    }, [text, isMonospace]);

    // Sync scroll position between textarea and highlight layer
    useEffect(() => {
        const textarea = textareaRef.current;
        const highlight = highlightRef.current;
        if (!textarea || !highlight) return;

        const syncScroll = () => {
            highlight.scrollTop = textarea.scrollTop;
            highlight.scrollLeft = textarea.scrollLeft;
        };

        textarea.addEventListener('scroll', syncScroll);
        return () => textarea.removeEventListener('scroll', syncScroll);
    }, []);

    // Build highlight map
    type HighlightMap = {
        [charIndex: number]: { color: string; groupId: string; index: number }
    };
    const highlightMap: HighlightMap = {};
    if (rhymeData.length > 0 && text) {
        const lines = text.split('\n');
        rhymeData.forEach((group, groupIndex) => {
            group.words.forEach((word, wordIndex) => {
                const { line, startChar, endChar } = word.position;
                // Guard: line must be in bounds
                if (typeof line !== 'number' || line < 0 || line >= lines.length) {
                    // eslint-disable-next-line no-console
                    console.warn('Skipping word with out-of-bounds line index:', { word, line, linesLength: lines.length });
                    return;
                }
                const lineText = lines[line];
                // Guard: startChar/endChar must be in bounds
                if (
                    typeof startChar !== 'number' || typeof endChar !== 'number' ||
                    startChar < 0 || endChar > lineText.length || startChar >= endChar
                ) {
                    // eslint-disable-next-line no-console
                    console.warn('Skipping word with invalid char indices:', { word, lineText, startChar, endChar });
                    return;
                }
                // Calculate absolute char index in the whole text
                let absIndex = 0;
                for (let l = 0; l < line; l++) absIndex += lines[l].length + 1; // +1 for '\n'
                for (let i = startChar; i < endChar; i++) {
                    highlightMap[absIndex + i] = {
                        color: group.color,
                        groupId: group.groupId,
                        index: wordIndex
                    };
                }
            });
        });
    }

    // Precompute line start indices for absolute char index calculation
    const lineStartIndices = (() => {
        const lines = text.split('\n');
        const indices = new Array(lines.length).fill(0);
        let total = 0;
        for (let i = 1; i < lines.length; i++) {
            total += lines[i - 1].length + 1; // +1 for '\n'
            indices[i] = total;
        }
        return indices;
    })();

    // Helper to ensure valid absStart value (global, not shadowed)
    const getSafeAbsStart = (absStart: unknown): number => {
        if (typeof absStart === 'number' && isFinite(absStart) && !isNaN(absStart) && absStart >= 0 && absStart <= text.length) {
            return absStart;
        }
        // eslint-disable-next-line no-console
        console.warn('Invalid absStart for highlight segment:', absStart, { textLength: text.length });
        return 0;
    };

    // Generate highlighted HTML by absolute char index
    const highlightedContent = (
        <pre
            ref={highlightRef}
            aria-hidden="true"
            className={`absolute inset-0 w-full h-full p-6 m-0 rounded-xl pointer-events-none select-none overflow-hidden ${fontClass} text-lg whitespace-pre-wrap break-words`}
            style={{
                fontFamily,
                lineHeight: '1.5rem',
                letterSpacing: 'normal',
                wordSpacing: 'normal',
                color: 'transparent',
                background: 'none',
                zIndex: 1,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                boxSizing: 'border-box',
            }}
        >
            {text.split('\n').map((line, lineIndex, arr) => {
                const segments: { text: string; color?: string; key: string; absStart: number }[] = [];
                let currentSegment: { text: string; color?: string; start: number; absStart: number } | null = null;
                for (let i = 0; i < line.length; i++) {
                    const absIndex = lineStartIndices[lineIndex] + i;
                    const highlight = highlightMap[absIndex];
                    const char = line[i];
                    if (!currentSegment) {
                        currentSegment = { text: char, color: highlight?.color, start: i, absStart: getSafeAbsStart(absIndex) };
                    } else if (highlight?.color === currentSegment.color || (!highlight && !currentSegment.color)) {
                        currentSegment.text += char;
                    } else {
                        segments.push({
                            text: currentSegment.text,
                            color: currentSegment.color,
                            key: `${lineIndex}-${currentSegment.start}`,
                            absStart: getSafeAbsStart(currentSegment.absStart),
                        });
                        currentSegment = { text: char, color: highlight?.color, start: i, absStart: getSafeAbsStart(absIndex) };
                    }
                }
                if (currentSegment) {
                    segments.push({
                        text: currentSegment.text,
                        color: currentSegment.color,
                        key: `${lineIndex}-${currentSegment.start}`,
                        absStart: getSafeAbsStart(currentSegment.absStart),
                    });
                }
                // Add newline char except for last line
                const children = segments.map(segment => {
                    const safeAbsStart = getSafeAbsStart(segment.absStart);
                    if (segment.color) {
                        return (
                            <motion.span
                                key={segment.key}
                                style={{
                                    backgroundColor: segment.color,
                                    opacity: 0.9,
                                    borderRadius: '3px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                    color: 'transparent',
                                    display: 'inline',
                                }}
                                initial={{ opacity: 0, scale: 0.95, y: 2 }}
                                animate={{
                                    opacity: 0.9,
                                    scale: 1,
                                    y: 0,
                                    transition: {
                                        duration: 0.5,
                                        ease: "easeOut",
                                        delay: 0.02 * safeAbsStart
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
                        );
                    } else {
                        return <span key={segment.key} style={{ display: 'inline' }}>{segment.text}</span>;
                    }
                });
                return (
                    <React.Fragment key={lineIndex}>
                        {children}
                        {lineIndex < arr.length - 1 ? '\n' : null}
                    </React.Fragment>
                );
            })}
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
            {/* Mono button above input box on mobile only */}
            <motion.button
                onClick={toggleFont}
                className={`block md:hidden mb-2 ml-4 mt-3 px-2 py-1 rounded cursor-pointer text-xs z-10 transition-all font-mono ${isMonospace ? 'bg-violet-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
            >
                mono
            </motion.button>

            <div className="relative rounded-xl shadow-lg bg-white">
                <div className="absolute inset-0 rounded-xl bg-white"></div>

                {/* Mono button inside input box on desktop only */}
                <motion.button
                    onClick={toggleFont}
                    className={`hidden md:block absolute top-3 right-3 px-2 py-1 rounded cursor-pointer text-xs z-10 transition-all font-mono ${isMonospace ? 'bg-violet-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                >
                    mono
                </motion.button>

                <div className="relative w-full">
                    {highlightedContent}
                    <textarea
                        ref={textareaRef}
                        id="lyrics-input"
                        className={`w-full p-6 rounded-xl bg-transparent border-0 text-slate-800 
                             relative text-lg transition-all duration-300 ease-in-out ${fontClass}`}
                        style={{
                            resize: 'none',
                            caretColor: '#000',
                            position: 'relative',
                            zIndex: 2,
                            lineHeight: '1.5rem',
                            minHeight: `${minTextareaHeight}px`,
                            overflow: 'auto',
                            fontFamily,
                            letterSpacing: 'normal',
                            wordSpacing: 'normal',
                            background: 'none',
                            boxSizing: 'border-box',
                            outline: 'none', // Ensure no outline
                        }}
                        value={text}
                        onChange={e => onTextChange(e.target.value)}
                        placeholder="Paste or type lyrics here to see rhyme patterns..."
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        spellCheck={false}
                        autoCorrect="off"
                        autoComplete="off"
                        autoCapitalize="none"
                    />
                </div>
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