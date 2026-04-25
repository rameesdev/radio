import React from 'react';
import { Helmet } from 'react-helmet-async';
import './LegalPage.css';

const About = () => {
  return (
    <div className="legal-container">
      <Helmet>
        <title>About Us - Virtual Radio</title>
        <meta name="description" content="Learn more about Virtual Radio, our vision, and the team behind the platform." />
      </Helmet>
      <h1>About Virtual Radio</h1>
      <p>
        Welcome to Virtual Radio, a cutting-edge platform designed to redefine the way we experience and share audio. 
        Our mission is to bring people together through the power of real-time audio broadcasting, creating a space 
        where anyone can be a host and everyone can be a listener.
      </p>
      
      <h2>Our Vision</h2>
      <p>
        We believe that audio is one of the most intimate and powerful forms of communication. Whether it's music, 
        talk shows, live events, or just sharing thoughts, Virtual Radio provides the tools to broadcast high-quality 
        audio with minimal latency, directly from your browser.
      </p>

      <h2>Key Features</h2>
      <ul>
        <li><strong>Real-time Broadcasting:</strong> Low-latency audio streaming for a seamless experience.</li>
        <li><strong>Interactive Chat:</strong> Engage with your audience and other listeners in real-time.</li>
        <li><strong>Visualizers:</strong> Beautiful, dynamic audio visualizers that bring the sound to life.</li>
        <li><strong>Easy Setup:</strong> No complex software required—just your browser and a microphone.</li>
      </ul>

      <h2>Who We Are</h2>
      <p>
        Virtual Radio was built by a team of audio enthusiasts and developers who wanted to create a simpler, 
        more accessible way to host digital radio stations. We are constantly innovating and adding new features 
        to make your experience even better.
      </p>

      <p>
        Thank you for being part of our community. Let's make some noise together!
      </p>
    </div>
  );
};

export default About;
