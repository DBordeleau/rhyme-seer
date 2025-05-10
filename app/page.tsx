'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import LiveHighlightTextInput from '@/Components/LiveHighlightTextInput';
import ColorLegend from '@/Components/ColorLegend';
import PhonemePreloader from '@/Components/PhonemePreloader';
import LoadSampleButton from '@/Components/LoadSampleButton';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      duration: 0.6
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5 }
  }
};

const Page = () => {
  const [inputText, setInputText] = useState('');

  return (
    <motion.div
      className="flex flex-col items-center max-w-4xl mx-auto min-h-[80vh] justify-center"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="text-center mb-10 max-w-2xl">
        <h1 className="text-5xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
          Rhyme Seer
        </h1>
        <p className="text-xl text-white mb-[1rem] leading-relaxed">
          Discover and visualize rhyme schemes in your lyrics or poetry.
          See rhymes highlighted as you type.
        </p>
        <LoadSampleButton onSampleSelect={setInputText} />
      </motion.div>
      <PhonemePreloader text={inputText} />
      <span className="font-bold text-gray-300 p-[.2rem] mb-[1rem] text-sm"> Rhyme Seer will never save or share any input text.</span>
      <motion.div variants={itemVariants} className="w-full">
        <LiveHighlightTextInput text={inputText} onTextChange={setInputText} />
      </motion.div>
      <motion.div variants={itemVariants} className="mt-10 w-full">
        <ColorLegend />
      </motion.div>
    </motion.div>
  );
};

export default Page;