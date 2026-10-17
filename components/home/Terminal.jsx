'use client'

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './Terminal.css';
import {readMeDescription, catDescription, bioDescription, skillsDescription } from '../../lib/descriptions.js';
import { useTerminal } from './TerminalProvider';
import LoadingBar from './LoadingBar';
import { loadProjects } from '../../lib/loadProjects';
import { loadRafeyOS } from '../../lib/loadRafeyOS';
import { forgetDesktop } from '../rafeyos/session/sessionStore';
import { sessionStorageOrNull } from '../rafeyos/services/browserStorage';
import { BlogArticle, BlogPicker } from './BlogOutput';
import { getPostBySlug, getPublishedPosts } from '../../app/blog/posts';
import { MusicPlayer, MusicStory } from './MusicOutput';
import { getFeaturedTrack, ARTIST_BLURB } from '../../lib/music';
import { EMAIL, LINKEDIN_URL, LINKEDIN_NAME, DEFAULT_MAIL, mailtoHref } from '../../lib/contact';
import { HOME_HELP_LINES, HELP_HINT } from '../../lib/help';
import { ProjectPicker } from './ProjectsOutput';

const COMMAND_PROMPT = "<span class='brown'>visitor</span><span class='base-color'>@</span><span class='green'>rafey.ai</span><span class='base-color'>:~$</span>";
const TYPING_IDLE_MS = 500;
// Long enough to read 'starting rafeyOS…' while the chunk prefetches
const RAFEYOS_ROUTE_DELAY_MS = 450;
// Offered as ghost text until the visitor runs their first command
const STARTER_SUGGESTION = 'help';

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
    `<span class='grey'>${escapeHtml(ARTIST_BLURB)}</span>`,
  ].join('\n');
};

const Terminal = () => {
  const router = useRouter();
  const { history, setHistory, commandHistory, setCommandHistory, input, setInput } = useTerminal();
  const terminalRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const rafeyosTimeoutRef = useRef(null);
  const [caretIndex, setCaretIndex] = useState(0);
  const [inputScrollLeft, setInputScrollLeft] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const [lastCommand, setLastCommand] = useState('');
  const [tabPressCount, setTabPressCount] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showLoadingBar, setShowLoadingBar] = useState(false);
  // The history entry that owns the keyboard (music player, projects picker, blog picker).
  // Local, not in the provider: it must never resume after navigating away and back
  const [foregroundId, setForegroundId] = useState(null);

  const commandDescriptions = [...HOME_HELP_LINES, HELP_HINT];

  const executableCommands = [
    'bio', 'blog', 'projects', 'projects --3d', 'skills', 'music', 'music story', 'music play', 'music journey', 'help', 'contact', 'rafeyos', 'cat bio.txt', 'cat projects.txt', 'cat music.txt', 'cat README.txt',
    ...getPublishedPosts().map((post) => `cat blog/${post.slug}.md`),
  ];

  const nonExecutableCommands = [
    'pwd', 'cd', 'mkdir', 'grep', 'rm', 'exit', 
  ];

  // commandHistory lives in the provider, so the suggestion stays gone after navigating away and back
  const ghostSuggestion = commandHistory.length === 0
    && caretIndex === input.length
    && input.length < STARTER_SUGGESTION.length
    && STARTER_SUGGESTION.startsWith(input)
    ? STARTER_SUGGESTION.slice(input.length)
    : '';
  const cursorLeft = `calc(${caretIndex}ch - ${inputScrollLeft}px)`;

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history, foregroundId]);

  // Programmatic input changes (history, tab completion) move the native caret to the end.
  // Also re-sync when the prompt remounts after a foreground program, which may exit by tap with no keyup.
  useEffect(() => {
    if (inputRef.current) {
      syncCursor(inputRef.current);
    }
  }, [input, foregroundId]);

  useEffect(() => () => clearTimeout(typingTimeoutRef.current), []);
  useEffect(() => () => clearTimeout(rafeyosTimeoutRef.current), []);

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
    setForegroundId(null);
  };

  const openProjects3d = () => {
    setShowLoadingBar(true);
    loadProjects();
    setTimeout(() => {
      router.push('/projects');
    }, 5500);
  };

  // Clearing the session flag makes the command always boot; only a refresh inside rafeyOS skips it
  const startRafeyOS = () => {
    forgetDesktop(sessionStorageOrNull());
    loadRafeyOS();
    clearTimeout(rafeyosTimeoutRef.current);
    rafeyosTimeoutRef.current = setTimeout(() => {
      router.push('/rafeyos');
    }, RAFEYOS_ROUTE_DELAY_MS);
  };

  const finishPicker = (entryId, { chosenId, view3d }) => {
    setHistory((prevHistory) => prevHistory.map((entry) => (
      entry.id === entryId ? { ...entry, chosenId } : entry
    )));
    setForegroundId(null);
    if (view3d) {
      openProjects3d();
    }
  };

  const finishBlog = (entryId, { slug }) => {
    setHistory((prevHistory) => prevHistory.map((entry) => (
      entry.id === entryId ? { ...entry, slug } : entry
    )));
    setForegroundId(null);
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
      const projectsCommand = command.match(/^projects(?:\s+(\S+))?$/i);

      if (projectsCommand) {
        const option = (projectsCommand[1] || '').toLowerCase();
        if (option === '') {
          panel = { type: 'projects-picker' };
        } else if (option === '--3d') {
          openProjects3d();
        } else {
          output = `projects: unknown option '${escapeHtml(projectsCommand[1])}'. Usage: projects [--3d]`;
          isError = true;
        }
      } else if (musicCommand) {
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
          return;

        case 'rafeyos':
        case 'startx':
          output = 'starting rafeyOS…';
          startRafeyOS();
          break;

        case 'cat bio.txt':
        case 'bio':
        case 'Bio':
          output = bioDescription();
          break;

        case 'cat projects.txt':
          output = 'Use the command "projects" for all project details';
          break;

        case 'blog':
        case 'Blog':
          if (getPublishedPosts().length === 0) {
            output = "<span class='grey'>total 0</span>";
          } else {
            panel = { type: 'blog-picker' };
          }
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
            output = `email: ${EMAIL}
linkedin: ${LINKEDIN_NAME}

Usage: open &lt;contact-option&gt; (e.g. open email)`;
            break;

          case 'open linkedin':
          case 'Open linkedin':
          case 'Open Linkedin':
            window.open(LINKEDIN_URL, '_blank');
            output = 'Opening LinkedIn profile in a new tab...';
            break;

          case 'open email':
          case 'Open email':
          case 'Open Email':
            window.location.href = mailtoHref(DEFAULT_MAIL);
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
      if (panel.type === 'music-player' || panel.type === 'projects-picker' || panel.type === 'blog-picker') {
        setForegroundId(panelEntry.id);
      }
    }

    setHistory((prevHistory) => [...prevHistory, ...entries]);
    setCommandHistory(prevHistory => [...prevHistory, command]);
    setHistoryIndex(-1);
    setInput('');
    setTabPressCount(0);
    setLastCommand('');
  };

  const handleKeyDown = (e) => {
    markTyping();
    const completesGhost = ghostSuggestion && (
      e.key === 'Tab'
      || (e.key === 'ArrowRight' && e.target.selectionStart === input.length)
    );
    if (completesGhost) {
      e.preventDefault();
      setInput(STARTER_SUGGESTION);
      setTabPressCount(0);
      setHistoryIndex(-1);
      return;
    }

    if (e.key === 'Enter') {
      runCommand(ghostSuggestion && input.trim() === '' ? STARTER_SUGGESTION : input.trim());
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
      } else if (matchingCommands.length > 1) {
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
            {history.map((item) => {
              if (item.type === 'blog-picker') {
                return (
                  <BlogPicker
                    key={item.id}
                    active={item.id === foregroundId}
                    slug={item.slug}
                    onDone={(result) => finishBlog(item.id, result)}
                  />
                );
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
                    active={item.id === foregroundId}
                    stoppedAt={item.stoppedAt}
                    duration={item.duration}
                    onStop={(stop) => stopPlayer(item.id, stop)}
                  />
                );
              }
              if (item.type === 'projects-picker') {
                return (
                  <ProjectPicker
                    key={item.id}
                    active={item.id === foregroundId}
                    chosenId={item.chosenId}
                    onDone={(result) => finishPicker(item.id, result)}
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

          {/* A playing track, the projects picker, or the blog picker owns the terminal */}
          {!foregroundId && (
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
                    setHistoryIndex(-1);
                    syncCursor(e.target);
                  }}
                  onSelect={(e) => syncCursor(e.target)}
                  onKeyUp={(e) => syncCursor(e.target)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                {ghostSuggestion && (
                  <button
                    type="button"
                    className="ghost-suggestion"
                    style={{ left: cursorLeft }}
                    aria-label={`Run ${STARTER_SUGGESTION}`}
                    onClick={(e) => {
                      // Keep the terminal's click-to-focus from opening the phone keyboard
                      e.stopPropagation();
                      runCommand(STARTER_SUGGESTION);
                    }}
                  >
                    {ghostSuggestion}
                  </button>
                )}
                {/* Sits on the first ghost character, which shows through inverted like a real block cursor */}
                <span
                  className={`terminal-cursor${isTyping ? ' is-typing' : ''}`}
                  style={{ left: cursorLeft }}
                  aria-hidden="true"
                >
                  {ghostSuggestion.charAt(0)}
                </span>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Terminal;