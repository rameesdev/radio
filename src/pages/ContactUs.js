import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import './LegalPage.css';

const ContactUs = () => {
  const [formStatus, setFormStatus] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormStatus('Thank you for your message! We will get back to you soon.');
    e.target.reset();
  };

  return (
    <div className="legal-container">
      <Helmet>
        <title>Contact Us - Virtual Radio</title>
        <meta name="description" content="Get in touch with the Virtual Radio team for support, feedback, or inquiries." />
      </Helmet>
      <h1>Contact Us</h1>
      <p>
        Have questions, feedback, or need assistance? We'd love to hear from you. 
        Please fill out the form below or reach out to us directly via email.
      </p>

      <div style={{ marginTop: '30px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="name" style={{ color: '#fff' }}>Name</label>
            <input 
              type="text" 
              id="name" 
              required 
              style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid rgba(255,255,255,0.1)', 
                background: 'rgba(255,255,255,0.05)', 
                color: '#fff' 
              }} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="email" style={{ color: '#fff' }}>Email</label>
            <input 
              type="email" 
              id="email" 
              required 
              style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid rgba(255,255,255,0.1)', 
                background: 'rgba(255,255,255,0.05)', 
                color: '#fff' 
              }} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="message" style={{ color: '#fff' }}>Message</label>
            <textarea 
              id="message" 
              rows="5" 
              required 
              style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid rgba(255,255,255,0.1)', 
                background: 'rgba(255,255,255,0.05)', 
                color: '#fff',
                resize: 'vertical'
              }} 
            ></textarea>
          </div>
          <button 
            type="submit" 
            style={{ 
              padding: '15px', 
              borderRadius: '8px', 
              border: 'none', 
              background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)', 
              color: '#fff', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Send Message
          </button>
        </form>
        {formStatus && (
          <p style={{ marginTop: '20px', color: '#00d2ff', textAlign: 'center', fontWeight: 'bold' }}>
            {formStatus}
          </p>
        )}
      </div>

      <div style={{ marginTop: '40px' }}>
        <h2>Direct Contact</h2>
        <p><strong>Email:</strong> support@virtualradio.com</p>
        <p><strong>Address:</strong> 123 Audio Lane, Digital City, 56789</p>
      </div>
    </div>
  );
};

export default ContactUs;
