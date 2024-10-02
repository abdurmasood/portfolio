// src/App.jsx
import React from 'react';
import Terminal from './components/Terminal/Terminal.jsx';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ArtistPage from './components/Music/ArtistPage.jsx';
import ProjectsPage from './components/Projects/ProjectsPage.jsx';

import './App.css';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Terminal />} />
          <Route path="/journey" element={<ArtistPage />} />
          <Route path= "/projects" element={<ProjectsPage/>}/>
        </Routes>
      </Router>
    </div>
  );
}

export default App;
