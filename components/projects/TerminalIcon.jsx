import React from 'react';
import { Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

const TerminalIcon = ({ onClick }) => {
  return (
    <motion.button
      type="button"
      aria-label="Back to terminal"
      onClick={onClick}
      className="absolute top-1.5 left-1.5 w-11 h-11 flex items-center justify-center p-0 m-0 border-0 bg-transparent rounded-none text-[#8E8E8E] hover:text-[#D0D0D0] transition-colors cursor-pointer focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#8E8E8E]"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
    >
      <Terminal size={20} strokeWidth={1.75} aria-hidden="true" />
    </motion.button>
  );
};

export default TerminalIcon;