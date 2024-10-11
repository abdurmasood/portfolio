import React, { useState, useEffect, useRef } from 'react';
import './Terminal.css';
import {readMeDescription, catDescription, bioDescription } from '../../utls/descriptions';
import Jarvis from './../Jarvis/Jarvis.jsx'
import { useNavigate } from 'react-router-dom';
import { useTerminal } from './TerminalContext';
import LoadingBar from './../Projects/LoadingBar'; // Import the LoadingBar component

const Terminal = () => {
  const navigate = useNavigate();
  const { history, setHistory, commandHistory, setCommandHistory, input, setInput } = useTerminal();
  const terminalRef = useRef(null);

  const [showHistory, setShowHistory] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showTypewriterMessage, setShowTypewriterMessage] = useState(false);
  const [possibleMatches, setPossibleMatches] = useState([]);
  const [lastCommand, setLastCommand] = useState('');
  const [tabPressCount, setTabPressCount] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [initialMessage, setInitialMessage] = useState('');
  const [hasShownTypewriter, setHasShownTypewriter] = useState(false);
  const [showLoadingBar, setShowLoadingBar] = useState(false);

  const initialMessages = [
    "<span class='grey'>Welcome to Rafey's portfolio.</span>",
    "<span class='grey'>My name is Jarvis, I am Rafey's virtual assistant.</span>",
    "<span class='grey'>----</span>",
    "<span class='grey'>Rafey is a full-stack developer with a focus on Artificial Intelligence.</span>",
    "<span class='grey'>Type 'help' to learn more about him.</span>",
    "<span class='grey'>----</span>",
    ""
  ];

  const commandDescriptions = [
    "<span class='command-keyword'>bio</span>          - background, education and work experience",
    "<span class='command-keyword'>projects</span>     - programs/applications he has built",
    "<span class='command-keyword'>music</span>        - his journey as a producer/artist",
    "<span class='command-keyword'>blog</span>         - Rafey's latest thoughts",
    "<span class='command-keyword'>contact</span>      - get in touch",
    "",
    "<span class='grey'>up arrow     => go back to previous command</span>",
    "<span class='grey'>clear        => clear the terminal</span>",
    "<span class='grey'>help         => display all commands</span>",
  ];

  const executableCommands = [
    'bio', 'projects', 'music', 'help', 'contact', 'cat bio.txt', 'cat projects.txt', 'cat music.txt', 'cat README.txt'
  ];

  const nonExecutableCommands = [
    'pwd', 'cd', 'mkdir', 'grep', 'rm', 'exit', 
  ];

  const visibleCommands = executableCommands.filter(cmd => !cmd.startsWith('cat'));

  useEffect(() => {
    if (history === '' && !hasShownTypewriter) {
      setInitialMessage(initialMessages.join('\n'));
      setShowTypewriterMessage(true);
      setHasShownTypewriter(true);
    } else if (history !== '' && !showTypewriterMessage) {
      setShowHistory(true);
      setShowPrompt(true);
    }
  }, [history, hasShownTypewriter, showTypewriterMessage]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const command = input.trim();
      let output = '';
      let isError = false;
      
      if (nonExecutableCommands.some(cmd => command.startsWith(cmd))) {
        if (command === 'pwd' || command === 'exit') {
          output = `${command}: Permission denied`;
          isError = true;
        } else if (command.startsWith('cd') || command.startsWith('mkdir') || command.startsWith('grep') || command.startsWith('rm')) {
          output = `${command}: Permission denied`;
          isError = true;
        } else if (command.startsWith('pwd ') || command.startsWith('exit ')) {
          const invalidCommand = command.split(' ')[1];
          output = `${invalidCommand} : The term ${invalidCommand} is not recognized as the name of a cmdlet, function, script file, or operable program.`;
          isError = true;
        }
      } else {
        switch (command) {
          case 'help':
            output = commandDescriptions.join('\n');
            break;

          case 'clear':
            setHistory('');
            setInput('');
            setPossibleMatches([]);
            setShowHistory(true);
            setShowPrompt(true);
            return;
          
          case 'cat bio.txt':
          case 'bio':
            output = bioDescription;
            break;

          case 'cat projects.txt':
            output = 'Use the command "projects" for all project details';
            break;
            
          case 'projects':
            setShowLoadingBar(true);
            setTimeout(() => {
              setShowLoadingBar(false);
              navigate('/projects');
            }, 5500);
            break;

          case 'blog':
            navigate('/blog')
            break;

          case 'cat music.txt':
            output = 'Use the command "music" for Rafey\'s journey as a producer';
            break;

          case 'music':
            navigate('/journey');
            break;

          case 'cat':
            output = catDescription;
            break;

          case 'cat README.txt':
            output = readMeDescription;
            break;

          case 'ls':
            output = 'bio.txt   projects.txt   music.txt   README.txt';
            break;

            case 'contact':
              output = `email: abdurrafeym@gmail.com
linkedin: Abdur Rafey M.

Usage: open &lt;contact-option&gt; (e.g. open email)`;
              break;
    
            case 'open linkedin':
              window.open('https://www.linkedin.com/in/abdur-rafey-masood/', '_blank');
              output = 'Opening LinkedIn profile in a new tab...';
              break;

            case 'open email':
              window.location.href = `mailto:abdurrafeym@gmail.com?subject=Hi👋&body=Hi Rafey, i'm ___ and I work in ___. Would love to chat!`
              output = 'Opening email application...';
              break;

          case '':
            // For empty command, we'll just add the prompt
            output = '';
            break;
            
          default:
            output = `Command not found: '${command}'`;
            isError = true;
        }
      }

      const commandPrompt = "<span class='brown'>visitor</span><span class='base-color'>@</span><span class='green'>rafey.ai</span><span class='base-color'>:~$</span>";
      const commandOutput = `${commandPrompt} ${command}`;
      const formattedOutput = isError ? `<span class='error-text'>${output}</span>` : output;

      // Update history for all commands, always adding a new line
      setHistory((prevHistory) => {
        return `${prevHistory}${commandOutput}\n${formattedOutput ? formattedOutput + '\n' : ''}`;
      });

      setCommandHistory(prevHistory => [...prevHistory, command]);
      setHistoryIndex(-1);
      setInput('');
      setPossibleMatches([]);
      setTabPressCount(0);
      setLastCommand('');
    }

    if (e.key === 'Tab') {
      e.preventDefault();

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

        const visibleMatches = matchingCommands.filter(cmd => !cmd.startsWith('cat'));

        if (tabPressCount === 1) {
          if (visibleMatches.length > 0) {
            const output = visibleMatches.join('    ');
            setHistory((prevHistory) => `${prevHistory}<span class='brown'>visitor</span><span class='base-color'>@</span><span class='green'>rafey.ai</span><span class='base-color'>:~$</span> ${input}\n${output}\n`);
          }
          setTabPressCount(0);
        } else {
          setTabPressCount((prevCount) => prevCount + 1);
        }
      } else {
        setPossibleMatches([]);
      }
    }

    if (e.key === 'ArrowUp') {
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    }

    if (e.key === 'ArrowDown') {
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? 0 : Math.min(commandHistory.length - 1, historyIndex + 1);
        setHistoryIndex(newIndex);
        setInput(newIndex === commandHistory.length ? '' : commandHistory[newIndex]);
      }
    }
  };

  return (
    <div className="terminal" ref={terminalRef}>
      {showLoadingBar ? (
        <LoadingBar />
      ) : (
        <>
          <div className="terminal-output">
            {showTypewriterMessage && (
              <Jarvis
                text={initialMessage}
                onComplete={() => {
                  setHistory(initialMessage);
                  setShowTypewriterMessage(false);
                  setShowHistory(true);
                  setShowPrompt(true);
                }}
                options={{ delay: 60 }}
              />
            )}
            {showHistory && !showTypewriterMessage && (
              <div
                className='terminal-output'
                dangerouslySetInnerHTML={{ __html: history }}
              />
            )}
          </div>

          {showPrompt && !showTypewriterMessage && (
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
                  setTabPressCount(0);
                  setPossibleMatches([]);
                  setHistoryIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Terminal;