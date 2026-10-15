'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './Terminal.css';
import {readMeDescription, catDescription, bioDescription, skillsDescription } from '../../lib/descriptions.js';
import Typewriter from './Typewriter'
import { useTerminal } from './TerminalProvider';
import LoadingBar from './LoadingBar';
import { loadProjects } from '../../lib/loadProjects';

const COMMAND_PROMPT = "<span class='brown'>visitor</span><span class='base-color'>@</span><span class='green'>rafey.ai</span><span class='base-color'>:~$</span>";
const TYPING_IDLE_MS = 500;

// History is rendered with dangerouslySetInnerHTML, so anything the visitor typed must be escaped
const escapeHtml = (text) => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const Terminal = () => {
  const router = useRouter();
  const { history, setHistory, commandHistory, setCommandHistory, input, setInput } = useTerminal();
  const terminalRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [caretIndex, setCaretIndex] = useState(0);
  const [inputScrollLeft, setInputScrollLeft] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

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
    "",
    "<span class='grey'>Rafey is a full-stack developer with a focus on Artificial Intelligence.</span>",
    "<span class='grey'>Type 'help' to learn more about him.</span>",
    "",
    ""
  ];

  const commandDescriptions = [
    "Available commands:",
    "",
    "  bio         background &amp; education",
    "  projects    body of work",
    // "  blog        Rafey's latest thoughts",
    "  skills      tools he's worked with",
    "  music       his journey as a producer",
    "  contact     get in touch",
    "",
    "<span class='grey'>Use ↑ for history, tab to autocomplete, 'clear' to reset.</span>",
  ];

  const executableCommands = [
    'bio', 'projects', 'skills', 'music', 'help', 'contact', 'cat bio.txt', 'cat projects.txt', 'cat music.txt', 'cat README.txt'
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

  // Programmatic input changes (history, tab completion) move the native caret to the end
  useEffect(() => {
    if (inputRef.current) {
      syncCursor(inputRef.current);
    }
  }, [input]);

  useEffect(() => () => clearTimeout(typingTimeoutRef.current), []);

  const syncCursor = (inputElement) => {
    setCaretIndex(inputElement.selectionStart ?? inputElement.value.length);
    setInputScrollLeft(inputElement.scrollLeft);
  };

  const markTyping = () => {
    setIsTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), TYPING_IDLE_MS);
  };

  const focusInputOnClick = () => {
    // Don't steal focus while the visitor is selecting text to copy
    if (window.getSelection()?.isCollapsed) {
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    markTyping();

    if (e.key === 'Enter') {
      const command = input.trim();
      const safeCommand = escapeHtml(command);
      let output = '';
      let isError = false;
      
      if (nonExecutableCommands.some(cmd => command.startsWith(cmd))) {
        if (command === 'pwd' || command === 'exit') {
          output = `${safeCommand}: Permission denied`;
          isError = true;
        } else if (command.startsWith('cd') || command.startsWith('mkdir') || command.startsWith('grep') || command.startsWith('rm')) {
          output = `${safeCommand}: Permission denied`;
          isError = true;
        } else if (command.startsWith('pwd ') || command.startsWith('exit ')) {
          const invalidCommand = escapeHtml(command.split(' ')[1]);
          output = `${invalidCommand} : The term ${invalidCommand} is not recognized as the name of a cmdlet, function, script file, or operable program.`;
          isError = true;
        }
      } else {
        switch (command) {
          case 'help':
          case 'Help':
            output = commandDescriptions.join('\n');
            break;

          case 'clear':
          case 'Clear':
            setHistory('');
            setInput('');
            setPossibleMatches([]);
            setShowHistory(true);
            setShowPrompt(true);
            return;
          
          case 'cat bio.txt':
          case 'bio':
          case 'Bio':
            output = bioDescription;
            break;

          case 'cat projects.txt':
            output = 'Use the command "projects" for all project details';
            break;
            
          case 'projects':
          case 'Projects':
            setShowLoadingBar(true);
            loadProjects();
            setTimeout(() => {
              router.push('/projects');
            }, 5500);
            break;

          case 'blog':
          case 'Blog':
            router.push('/blog')
            break;

          case 'cat music.txt':
            output = 'Use the command "music" for Rafey\'s journey as a producer';
            break;

          case 'music':
          case 'Music':
            router.push('/journey');
            break;

          case 'skills':
          case 'Skills':
            output = skillsDescription;
            break

          case 'cat':
          case 'Cat':
            output = catDescription;
            break;

          case 'cat README.txt':
            output = `<span class='ascii'>${readMeDescription}</span>`;
            break;

          case 'ls':
            output = 'bio.txt   projects.txt   music.txt   README.txt';
            break;

            case 'contact':
            case 'Contact':
              output = `email: abdurrafeym@gmail.com
linkedin: Abdur Rafey M.

Usage: open &lt;contact-option&gt; (e.g. open email)`;
              break;
    
            case 'open linkedin':
            case 'Open linkedin':
            case 'Open Linkedin':
              window.open('https://www.linkedin.com/in/abdur-rafey-masood/', '_blank');
              output = 'Opening LinkedIn profile in a new tab...';
              break;

            case 'open email':
            case 'Open email':
            case 'Open Email':
              window.location.href = `mailto:abdurrafeym@gmail.com?subject=Hi👋&body=Hi Rafey, i'm ___ and I work in ___. Would love to chat!`
              output = 'Opening email application...';
              break;

          case '':
            // For empty command, we'll just add the prompt
            output = '';
            break;
            
          default:
            output = `Command not found: '${safeCommand}'`;
            isError = true;
        }
      }

      const commandOutput = `${COMMAND_PROMPT} ${safeCommand}`;
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
            setHistory((prevHistory) => `${prevHistory}${COMMAND_PROMPT} ${escapeHtml(input)}\n${output}\n`);
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
      // Stop the browser jumping the caret to the start of the input
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? 0 : Math.min(commandHistory.length - 1, historyIndex + 1);
        setHistoryIndex(newIndex);
        setInput(newIndex === commandHistory.length ? '' : commandHistory[newIndex]);
      }
    }
  };

  return (
    <div className="terminal" ref={terminalRef} onClick={focusInputOnClick}>
      {showLoadingBar ? (
        <LoadingBar />
      ) : (
        <>
          <div className="terminal-output">
            {showTypewriterMessage && (
              <Typewriter
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
              <span className="terminal-input-field">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  aria-label="terminal input"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  onChange={(e) => {
                    setInput(e.target.value);
                    setTabPressCount(0);
                    setPossibleMatches([]);
                    setHistoryIndex(-1);
                    syncCursor(e.target);
                  }}
                  onSelect={(e) => syncCursor(e.target)}
                  onKeyUp={(e) => syncCursor(e.target)}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <span
                  className={`terminal-cursor${isTyping ? ' is-typing' : ''}${isInputFocused ? '' : ' is-unfocused'}`}
                  style={{ left: `calc(${caretIndex}ch - ${inputScrollLeft}px)` }}
                  aria-hidden="true"
                />
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Terminal;