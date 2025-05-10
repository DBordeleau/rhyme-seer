'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { samples } from '@/data/samples';

interface LoadSampleButtonProps {
    onSampleSelect: (sample: string) => void;
}

const buttonVariants = {
    rest: { scale: 1, boxShadow: '0 2px 8px rgba(80,0,120,0.07)' },
    hover: { scale: 1.04, boxShadow: '0 4px 16px rgba(80,0,120,0.13)' },
    tap: { scale: 0.98 }
};

const LoadSampleButton: React.FC<LoadSampleButtonProps> = ({ onSampleSelect }) => {
    const handleClick = () => {
        const randomSample = samples[Math.floor(Math.random() * samples.length)];
        onSampleSelect(randomSample);
    };

    return (
        <div className="w-full flex flex-col items-center mt-[2rem]">
            <motion.button
                className="bg-gradient-to-r from-violet-600 to-indigo-500 cursor-pointer text-white font-semibold px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                variants={buttonVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={handleClick}
                type="button"
            >
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
                Load Sample
            </motion.button>
        </div>
    );
};

export default LoadSampleButton;