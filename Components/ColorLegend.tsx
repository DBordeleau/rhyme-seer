'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const ColorLegend: React.FC = () => {
    return (
        <motion.div
            className="w-full max-w-3xl mx-auto mt-8 p-5 bg-white rounded-lg shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
        >
            <h3 className="text-lg text-slate-700 font-semibold mb-3">About Rhyme Seer</h3>
            <p className="text-gray-700 mb-4">
                Rhyme Seer performs phonetic analysis to identify rhyming patterns in text.
                Phonemes are retrieved from the <a href='http://www.speech.cs.cmu.edu/cgi-bin/cmudict/' className='font-bold underline text-blue-600 dark:text-blue-500'>CMU Pronouncing Dictionary</a>.
                Words that belong to the same rhyme group are highlighted with the same color.
                Rhyme-Seer does not use a LLM or any machine learning model. <Link className='text-blue-600 underline font-bold' href="#">Learn more and contribute on GitHub.</Link>
            </p>
        </motion.div>
    );
};

export default ColorLegend;