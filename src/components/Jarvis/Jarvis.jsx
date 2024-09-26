import Typewriter from 'typewriter-effect';

const Jarvis = ({ text, onComplete, options = {} }) => {
  return (
    <Typewriter
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

export default Jarvis;
