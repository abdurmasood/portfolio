import React, { useState, useEffect } from 'react';
import './Terminal.css';
import Typewriter from 'typewriter-effect';

const Terminal = () => {
  const initialMessages = [
    "Welcome to Rafey's portfolio.",
    "----",
    "My name is Jarvis, Rafey's personal AI assistant.",
    "",
    "Soon I'll be able to answer any of your questions in natural language.",
    "But until then, you can type the commands below for details.",
    "----"
  ];

  const executableCommands = [
    "<span class='command-keyword'>about</span>        <span class='base-color'>- about Abdur Rafey Masood</span>",
    "<span class='command-keyword'>education</span>    <span class='base-color'>- education background</span>",
    "<span class='command-keyword'>experience</span>   <span class='base-color'>- work experience</span>",
    "<span class='command-keyword'>projects</span>     <span class='base-color'>- projects he's worked on</span>",
    "<span class='command-keyword'>origins</span>      <span class='base-color'>- where he was born & raised</span>",
    "<span class='command-keyword'>music</span>        <span class='base-color'>- Rafey's journey as a producer/artist</span>",
    "<span class='command-keyword'>chat</span>         <span class='base-color'>- ask me anything else",
    "",
    "<span class='base-color'>Tab          => autocompletes the command</span>",
    "<span class='base-color'>Up Arrow     => go back to previous command</span>",
    "<span class='base-color'>clear        => clear the terminal</span>"
  ];


  const [history, setHistory] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showTypewriterMessage, setShowTypewriterMessage] = useState(true);
  const [input, setInput] = useState('');

  useEffect(() => {
    const fullMessage = initialMessages.join('\n') + '\n';
    setHistory(fullMessage);
  }, []);

  const updateInitialMessageWithCommands = () => {
    const execCommands = executableCommands.join('\n') + '\n';
    const fullMessage = history.concat(execCommands);
    setHistory(fullMessage);
  };


  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const command = input.trim();
      let output = '';

      switch (command) {
        case 'help':
          output = 'Available commands: help, clear, about';
          break;

        case 'clear':
          setHistory('');
          setInput('');
          return;

        case 'about':
          output = 'This is Rafey\'s about section.';
          break;

        case 'experiences':
          output = 'This is a list of my experiences...';
          break;

        case 'projects':
          output = 'projects he\'s worked on'
          break;

        default:
          output = `'${command}' is not a recognized command.`;
      }

      setHistory((prevHistory) => `${prevHistory}\n<span class='brown'>visitor</span><span class='base-color'>@</span><span class='green'>rafey.ai</span><span class='base-color'>:~$</span> ${command}\n${output}\n`);
      setInput('');
    }
  };

  return (
    <div className="terminal">
      <div className="terminal-output">
        {history && showTypewriterMessage && (
          <Typewriter
            options={{
              delay: 60,
              cursor: '_',
            }}
            onInit={(typewriter) => {
              typewriter
                .typeString(history)
                .pauseFor(600)
                .callFunction(() => {
                  setShowPrompt(true);
                  setShowTypewriterMessage(false);
                  updateInitialMessageWithCommands()
                  setShowHistory(true);
                })
                .start();
            }}
          />
        )}

        {showHistory && (
          <div
            className='terminal-output'
            dangerouslySetInnerHTML={{ __html: history }}
          />
        )}
      </div>

      {showPrompt && (
        <div className="terminal-input">
          <span className="prompt">
            visitor
            <span className='base-color'>@</span>
            <span className='hostname'>rafey.ai</span>
            <span className='base-color'>:~$</span>
          </span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
      )}
    </div>
  );
};

export default Terminal;
