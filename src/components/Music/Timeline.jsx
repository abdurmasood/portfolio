import React from 'react';
import { motion } from "framer-motion";

const Timeline = ({ events = [] }) => {
  if (!events || events.length === 0) {
    return <p className="text-center">No timeline events to display.</p>;
  }

  const lineVariants = {
    hidden: { scaleY: 0 },
    visible: { scaleY: 1, transition: { duration: 1.5, ease: "easeInOut" } }
  };

  const eventVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (custom) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 1 + custom * 0.2, duration: 0.5, ease: "easeOut" }
    })
  };

  return (
    <div className="relative max-w-4xl mx-auto">
      <motion.div 
        className="absolute left-[calc(50%-2px)] top-0 h-full w-1 bg-gradient-to-b from-[#4ADE80]/50 via-[#4ADE80]/30 to-transparent rounded-full origin-top"
        variants={lineVariants}
        initial="hidden"
        animate="visible"
      />
      {events.map((event, index) => {
        const isRightSide = index % 2 === 1;
        return (
          <motion.div 
            key={index} 
            className="mb-16 flex items-center relative"
            variants={eventVariants}
            initial="hidden"
            animate="visible"
            custom={index}
          >
            <div className={`w-1/2 ${isRightSide ? 'invisible' : 'text-right pr-8'}`}>
              {!isRightSide && (
                <>
                  <span className="text-lg font-semibold text-[#4ADE80]">{event.year}</span>
                  <p className="text-white mt-2">{event.event}</p>
                </>
              )}
            </div>
            <div className="absolute left-1/2 top-1/2 w-7 h-7 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <motion.div 
                className="w-full h-full rounded-full bg-[#4ADE80] shadow-lg relative"
                whileHover={{ scale: 1.2 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <motion.div
                  className="absolute inset-0 rounded-full bg-[#4ADE80] opacity-50 blur-sm"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-[#4ADE80] opacity-30 blur-md"
                  animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                />
              </motion.div>
            </div>
            <div className={`w-1/2 pl-8 ${isRightSide ? 'visible' : 'invisible'}`}>
              {isRightSide && (
                <>
                  <span className="text-lg font-semibold text-[#4ADE80]">{event.year}</span>
                  <p className="text-white mt-2">{event.event}</p>
                </>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default Timeline;