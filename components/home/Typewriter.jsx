'use client'

import TypewriterEffect from 'typewriter-effect';

const Typewriter = ({ text, onComplete, options = {} }) => {
  return (
    <TypewriterEffect
      options={{
        delay: 60,
        cursor: '_',
        ...options, 
      }}
      onInit={(typewriter) => {
        typewriter
          .typeString(text)
          .pauseFor(600)
          .callFunction(() => {
            if (onComplete) {
              onComplete();
            }
          })
          .start();
      }}
    />
  );
};

export default Typewriter;
