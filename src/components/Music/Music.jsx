import React, { useState, useEffect } from 'react';
import './Music.css'; // Assuming you have a CSS file for styling

const artistBackstories = [
    "Artist A started their journey in a small town...",
    "Artist B was discovered while performing in a subway...",
    "Artist C's unique sound comes from their classical training...",
    // Add more backstories as needed
];

const getRandomBackstory = () => {
    const randomIndex = Math.floor(Math.random() * artistBackstories.length);
    return artistBackstories[randomIndex];
};

const Music = () => {
    const [backstory, setBackstory] = useState('');

    useEffect(() => {
        setBackstory(getRandomBackstory());
    }, []);

    return (
        <div className="music-container">
            <div className="music-header">
                <h1>Artist Name</h1>
                <p>{backstory}</p>
            </div>
            <div className="music-player">
                {/* Add your music player controls here */}
            </div>
        </div>
    );
};

export default Music;