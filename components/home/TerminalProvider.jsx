'use client'

import { createContext, useState, useContext } from 'react';

const TerminalContext = createContext();

// Plain state, kept across routes by the root layout. No shell imports here: every route renders this provider,
// and only the homepage should pay for the engine.
export const TerminalProvider = ({ children }) => {
  const [entries, setEntries] = useState([]);
  const [input, setInput] = useState('');
  // null until a line runs this visit; until then the homepage restores the saved folder
  const [cwd, setCwd] = useState(null);
  const [env, setEnv] = useState({});
  const [lastCode, setLastCode] = useState(0);
  // Commands run since the page loaded: the ghost `help` shows until the first
  const [ranThisVisit, setRanThisVisit] = useState(0);

  const value = {
    entries,
    setEntries,
    input,
    setInput,
    cwd,
    setCwd,
    env,
    setEnv,
    lastCode,
    setLastCode,
    ranThisVisit,
    setRanThisVisit,
  };

  return (
    <TerminalContext.Provider value={value}>
      {children}
    </TerminalContext.Provider>
  );
};

export const useTerminal = () => {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminal must be used within a TerminalProvider');
  }
  return context;
};
