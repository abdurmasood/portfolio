import React from 'react';
import { Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

const TerminalIcon = ({ onClick }) => {
  return (
    <motion.div
      className="absolute top-4 left-4 cursor-pointer"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
    >
      <Terminal
        size={32}
        color="#FFFFFF"
        onClick={onClick}
        className="hover:text-[#39FF14] transition-colors duration-200"
      />
    </motion.div>
  );
};

export default TerminalIcon;