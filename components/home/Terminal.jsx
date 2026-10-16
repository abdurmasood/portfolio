'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './Terminal.css';
import {readMeDescription, catDescription, bioDescription, skillsDescription } from '../../lib/descriptions.js';
import Typewriter from './Typewriter'
import { useTerminal } from './TerminalProvider';
import LoadingBar from './LoadingBar';
import { loadProjects } from '../../lib/loadProjects';
import { BlogArticle, BlogPostList } from './BlogOutput';
import { getPostBySlug, getPublishedPosts } from '../../app/blog/posts';
import { MusicPlayer, MusicStory } from './MusicOutput';
import { getFeaturedTrack } from '../../lib/music';

const COMMAND_PROMPT = "<span class='brown'>visitor</span><span class='base-color'>@</span><span class='green'>rafey.ai</span><span class='base-color'>:~$</span>";
const TYPING_IDLE_MS = 500;

// History is rendered with dangerouslySetInnerHTML, so anything the visitor typed must be escaped
const escapeHtml = (text) => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const nextEntry = (entry) => ({ id: crypto.randomUUID(), ...entry });

const musicUsage = () => {
  const track = getFeaturedTrack();
  return [
    'Usage: music &lt;command&gt;',
    '',
    '  story      his journey as a producer',
    `  play       play ${escapeHtml(track.title)}`,
    '  journey    open the full visual journey',
    '',
    `<span class='grey'>Rafey releases music as ${escapeHtml(track.artist)}. He founded a record label and set up a recording studio in East London.</span>`,
  ].join('\n');
};

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
  // Local, not in the provider: a player must never resume after navigating away and back
  const [activePlayerId, setActivePlayerId] = useState(null);

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
    "  blog        Rafey's latest thoughts",
    "  skills      tools he's worked with",
    "  music       his journey as a producer",
    "  contact     get in touch",
    "",
    "<span class='grey'>Use ↑ for history, tab to autocomplete, 'clear' to reset.</span>",
  ];

  const executableCommands = [
    'bio', 'blog', 'projects', 'skills', 'music', 'music story', 'music play', 'music journey', 'help', 'contact', 'cat bio.txt', 'cat projects.txt', 'cat music.txt', 'cat README.txt',
    ...getPublishedPosts().map((post) => `cat blog/${post.slug}.md`),
  ];

  const nonExecutableCommands = [
    'pwd', 'cd', 'mkdir', 'grep', 'rm', 'exit', 
  ];

  const visibleCommands = executableCommands.filter(cmd => !cmd.startsWith('cat'));

  useEffect(() => {
    if (history.length === 0 && !hasShownTypewriter) {
      setInitialMessage(initialMessages.join('\n'));
      setShowTypewriterMessage(true);
      setHasShownTypewriter(true);
    } else if (history.length > 0 && !showTypewriterMessage) {
      setShowHistory(true);
      setShowPrompt(true);
    }
  }, [history, hasShownTypewriter, showTypewriterMessage]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history, activePlayerId]);

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

  const stopPlayer = (entryId, { at, duration }) => {
    setHistory((prevHistory) => prevHistory.map((entry) => (
      entry.id === entryId ? { ...entry, stoppedAt: at, duration } : entry
    )));
    setActivePlayerId(null);
  };

  const focusInputOnClick = () => {
    // Don't steal focus while the visitor is selecting text to copy
    if (window.getSelection()?.isCollapsed) {
      inputRef.current?.focus();
    }
  };

  const runCommand = (command) => {
    const safeCommand = escapeHtml(command);
    let output = '';
    let isError = false;
    let panel = null;

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
      const markdownFile = command.match(/^cat\s+blog\/(\S+)\.md$/i);
      const musicCommand = command.match(/^music(?:\s+(\S+))?$/i);

      if (musicCommand) {
        const subcommand = (musicCommand[1] || '').toLowerCase();
        if (subcommand === '') {
          output = musicUsage();
        } else if (subcommand === 'story') {
          panel = { type: 'music-story' };
        } else if (subcommand === 'play') {
          panel = { type: 'music-player', trackId: getFeaturedTrack().id };
        } else if (subcommand === 'journey') {
          router.push('/journey');
        } else {
          output = `music: unknown command '${escapeHtml(musicCommand[1])}'. Type 'music' for usage.`;
          isError = true;
        }
      } else if (markdownFile) {
        const slug = markdownFile[1];
        const post = getPostBySlug(slug);
        if (post) {
          panel = { type: 'article', slug: post.slug };
        } else {
          output = `cat: blog/${escapeHtml(slug)}.md: No such file`;
          isError = true;
        }
      } else switch (command) {
        case 'help':
        case 'Help':
          output = commandDescriptions.join('\n');
          break;

        case 'clear':
        case 'Clear':
          setHistory([]);
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
          panel = { type: 'posts' };
          break;

        case 'cat music.txt':
          output = 'Use the command "music" to explore Rafey\'s music';
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
          output = 'bio.txt   blog/   projects.txt   music.txt   README.txt';
          break;

          case 'contact':
          case 'Contact':
            output = `email: abdurrafeym@gmail.com
linkedin: A. Rafey Masood

Usage: open &lt;contact-option&gt; (e.g. open email)`;
            break;

          case 'open linkedin':
          case 'Open linkedin':
          case 'Open Linkedin':
            window.open('https://www.linkedin.com/in/arafeymasood/', '_blank');
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
    const html = `${commandOutput}\n${formattedOutput ? formattedOutput + '\n' : ''}`;
    const entries = [nextEntry({ type: 'html', html })];
    if (panel) {
      const panelEntry = nextEntry(panel);
      entries.push(panelEntry);
      if (panel.type === 'music-player') {
        setActivePlayerId(panelEntry.id);
      }
    }

    setHistory((prevHistory) => [...prevHistory, ...entries]);
    setCommandHistory(prevHistory => [...prevHistory, command]);
    setHistoryIndex(-1);
    setInput('');
    setPossibleMatches([]);
    setTabPressCount(0);
    setLastCommand('');
  };

  const handleKeyDown = (e) => {
    markTyping();

    if (e.key === 'Enter') {
      runCommand(input.trim());
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
            setHistory((prevHistory) => [...prevHistory, nextEntry({
              type: 'html',
              html: `${COMMAND_PROMPT} ${escapeHtml(input)}\n${output}\n`,
            })]);
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
                  setHistory([nextEntry({ type: 'html', html: initialMessage })]);
                  setShowTypewriterMessage(false);
                  setShowHistory(true);
                  setShowPrompt(true);
                }}
                options={{ delay: 60 }}
              />
            )}
            {showHistory && !showTypewriterMessage && history.map((item) => {
              if (item.type === 'posts') {
                return <BlogPostList key={item.id} onOpen={(slug) => runCommand(`cat blog/${slug}.md`)} />;
              }
              if (item.type === 'article') {
                return <BlogArticle key={item.id} slug={item.slug} />;
              }
              if (item.type === 'music-story') {
                return <MusicStory key={item.id} />;
              }
              if (item.type === 'music-player') {
                return (
                  <MusicPlayer
                    key={item.id}
                    trackId={item.trackId}
                    active={item.id === activePlayerId}
                    stoppedAt={item.stoppedAt}
                    duration={item.duration}
                    onStop={(stop) => stopPlayer(item.id, stop)}
                  />
                );
              }
              return (
                <div
                  key={item.id}
                  className="terminal-output"
                  dangerouslySetInnerHTML={{ __html: item.html }}
                />
              );
            })}
          </div>

          {/* A playing track owns the terminal, like a foreground process */}
          {showPrompt && !showTypewriterMessage && !activePlayerId && (
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