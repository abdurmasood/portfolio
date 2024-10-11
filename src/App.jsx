import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { TerminalProvider } from './components/Terminal/TerminalContext.jsx';
import Terminal from './components/Terminal/Terminal.jsx';
import ArtistPage from './components/Music/ArtistPage.jsx';
import ProjectsPage from './components/Projects/ProjectsPage.jsx';
import BlogPage from './components/Blog/BlogPage.jsx';

import './App.css';

function App() {
  return (
    <TerminalProvider>
      <div className="App">
        <Router>
          <Routes>
            <Route path="/" element={<Terminal />} />
            <Route path="/journey" element={<ArtistPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/blog" element={<BlogPage/>}/>
          </Routes>
        </Router>
      </div>
    </TerminalProvider>
  );
}

export default App;