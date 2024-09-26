// src/App.jsx
import React from 'react';
import Terminal from './components/Terminal/Terminal.jsx';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Music from './components/Music/Music.jsx';
import './App.css';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Terminal />} />
          <Route path="/music" element={<Music />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
