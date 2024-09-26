import React, { useState, useEffect } from 'react';
import './Terminal.css';
import { aboutDescription, educationDescription, experienceDescription, projectDescription, originDescription, chatDescription, musicDescription, readMeDescription } from '../../utls/descriptions';
import Jarvis from './../Jarvis/Jarvis.jsx'

const Terminal = () => {
  const initialMessages = [
    "<span class='grey'>Welcome to Rafey's portfolio.</span>",
    "<span class='grey'>----</span>",
    "<span class='grey'>My name is Jarvis, Rafey's personal AI assistant.</span>",
    "",
    "<span class='grey'>Soon I'll be able to answer any of your questions in natural language.</span>",
    "<span class='grey'>But until then, you can type the commands below for details.</span>",
    "<span class='grey'>----</span>"
  ];

  const executableCommands = [
    'about', 'education', 'experience', 'projects', 'origins', 'music', 'help', 'chat', 'cat about.txt', 'cat education.txt', 'cat experience.txt', 'cat projects.txt', 'cat origins.txt', 'cat music.txt', 'cat README.txt'
  ];

  const visibleCommands = executableCommands.filter(cmd => !cmd.startsWith('cat'));

  const commandDescriptions = [
    "<span class='command-keyword'>about</span>        - about Abdur Rafey Masood",
    "<span class='command-keyword'>education</span>    - education background",
    "<span class='command-keyword'>experience</span>   - work experience",
    "<span class='command-keyword'>projects</span>     - projects he's worked on",
    "<span class='command-keyword'>origins</span>      - where he was born & raised",
    "<span class='command-keyword'>music</span>        - Rafey's journey as a producer/artist",
    "<span class='command-keyword'>help</span>         - display all the commands",
    "<span class='command-keyword'>chat</span>         - ask me anything else",
    "",
    "Tab          => autocompletes the command",
    "Up Arrow     => go back to previous command",
    "clear        => clear the terminal",
    ""
  ];

  const [history, setHistory] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showTypewriterMessage, setShowTypewriterMessage] = useState(true);
  const [input, setInput] = useState('');
  const [possibleMatches, setPossibleMatches] = useState([]);
  const [lastCommand, setLastCommand] = useState('');
  const [tabPressCount, setTabPressCount] = useState(0);
  const [commandHistory, setCommandHistory] = useState([]); // Store the command history
  const [historyIndex, setHistoryIndex] = useState(-1); // To navigate through the command history

  useEffect(() => {
    const fullMessage = initialMessages.join('\n') + '\n';
    setHistory(fullMessage);
  }, []);

  const updateInitialMessageWithCommands = () => {
    const execCommands = commandDescriptions.join('\n') + '\n';
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
          setPossibleMatches([]);
          return;
        
        case 'cat about.txt':
        case 'about':
          output = aboutDescription;
          break;

        case 'cat education.txt':
        case 'education':
          output = educationDescription;
          break

        case 'cat experience.txt':
        case 'experience':
          output = experienceDescription;
          break;
        
        case 'cat projects.txt':
        case 'projects':
          output = projectDescription;
          break;
        
        case 'cat origins.txt':
        case 'origins':
          output = originDescription;
          break;

        case 'cat music.txt':
        case 'music':
          output = musicDescription;
          break;
        
        case 'chat':
          output = chatDescription;
          break;

        case 'cat README.txt':
          output = readMeDescription;
          break;

        case 'ls':
          output = 'about.txt   education.txt   experience.txt    projects.txt\norigins.txt   music.txt   README.txt';
          break;

        case '':
          output = '';
          break;
          
        default:
          output = `'${command}' is not a recognized command.`;
      }

      if (output === '') {
        setHistory((prevHistory) => `${prevHistory}<span class='brown'>visitor</span><span class='base-color'>@</span><span class='green'>rafey.ai</span><span class='base-color'>:~$</span> ${command}${output}\n`);
      } else {
        setHistory((prevHistory) => `${prevHistory}<span class='brown'>visitor</span><span class='base-color'>@</span><span class='green'>rafey.ai</span><span class='base-color'>:~$</span> ${command}\n${output}\n`);
      }

      // Add the command to the history
      setCommandHistory(prevHistory => [...prevHistory, command]);
      setHistoryIndex(-1); // Reset the index
      setInput('');
      setPossibleMatches([]);
      setTabPressCount(0);
      setLastCommand('');
    }

    // Handle Tab for autocompletion
    if (e.key === 'Tab') {
      e.preventDefault(); // Prevent default tab behavior

      // If the input is exactly 'cat', do nothing
      if (input === 'cat') {
        setTabPressCount(0);
        return;
      }

      if (input !== lastCommand) {
        setTabPressCount(0);
      }

      const matchingCommands = executableCommands.filter((cmd) => cmd.startsWith(input));

      if (matchingCommands.length === 1) {
        setInput(matchingCommands[0]);
        setPossibleMatches([]);
      } else if (matchingCommands.length > 1) {
        setPossibleMatches(matchingCommands);
        setLastCommand(input);

        // Filter out commands starting with 'cat' for display
        const visibleMatches = matchingCommands.filter(cmd => !cmd.startsWith('cat'));

        // Display all possible completions only if tab is pressed twice
        if (tabPressCount === 1) {
          if (visibleMatches.length > 0) {
            const output = visibleMatches.join('    ');
            setHistory((prevHistory) => `${prevHistory}<span class='brown'>visitor</span><span class='base-color'>@</span><span class='green'>rafey.ai</span><span class='base-color'>:~$</span> ${input}\n${output}\n`);
          }
          setTabPressCount(0); // Reset the tab count
        } else {
          setTabPressCount((prevCount) => prevCount + 1);
        }
      } else {
        setPossibleMatches([]);
      }
    }

    // Handle Up Arrow for command history
    if (e.key === 'ArrowUp') {
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    }

    // Handle Down Arrow for command history
    if (e.key === 'ArrowDown') {
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? 0 : Math.min(commandHistory.length - 1, historyIndex + 1);
        setHistoryIndex(newIndex);
        setInput(newIndex === commandHistory.length ? '' : commandHistory[newIndex]);
      }
    }
  };

  return (
    <div className="terminal">
      <div className="terminal-output">
        {history && showTypewriterMessage && (
          <Jarvis
            text={history}
            onComplete={() => {
              setShowPrompt(true);
              setShowTypewriterMessage(false);
              updateInitialMessageWithCommands();
              setShowHistory(true);
            }}
            options={{ delay: 60 }}
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
            onChange={(e) => {
              setInput(e.target.value);
              setTabPressCount(0); // Reset tab count on input change
              setPossibleMatches([]); // Reset possible matches on input change
              setHistoryIndex(-1); // Reset history index on input change
            }}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
      )}
    </div>
  );
};

export default Terminal;
