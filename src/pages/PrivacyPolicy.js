import React from 'react';
import { Helmet } from 'react-helmet-async';
import './LegalPage.css';

const PrivacyPolicy = () => {
  return (
    <div className="legal-container">
      <Helmet>
        <title>Privacy Policy - Virtual Radio</title>
        <meta name="description" content="Read our privacy policy to understand how we handle your personal information." />
      </Helmet>
      <h1>Privacy Policy</h1>
      <p>Last updated: April 25, 2026</p>
      
      <p>
        At Virtual Radio, we take your privacy seriously. This Privacy Policy explains how we collect, use, 
        disclose, and safeguard your information when you visit our website.
      </p>

      <h2>1. Information We Collect</h2>
      <p>
        We may collect information about you in a variety of ways. The information we may collect on the Site includes:
      </p>
      <ul>
        <li><strong>Personal Data:</strong> Personally identifiable information, such as your name and email address, that you voluntarily give to us when you choose to participate in various activities related to the Site.</li>
        <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, and your access times.</li>
      </ul>

      <h2>2. Use of Your Information</h2>
      <p>
        Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. 
        Specifically, we may use information collected about you via the Site to:
      </p>
      <ul>
        <li>Create and manage your account.</li>
        <li>Deliver targeted advertising, coupons, newsletters, and other information regarding promotions and the Site to you.</li>
        <li>Increase the efficiency and operation of the Site.</li>
        <li>Monitor and analyze usage and trends to improve your experience with the Site.</li>
      </ul>

      <h2>3. Disclosure of Your Information</h2>
      <p>
        We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
      </p>
      <ul>
        <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others.</li>
        <li><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, such as payment processing, data analysis, email delivery, hosting services, and customer service.</li>
      </ul>

      <h2>4. Cookies and Web Beacons</h2>
      <p>
        We may use cookies, web beacons, tracking pixels, and other tracking technologies on the Site to help customize the Site 
        and improve your experience.
      </p>

      <h2>5. Contact Us</h2>
      <p>
        If you have questions or comments about this Privacy Policy, please contact us at: 
        <a href="mailto:support@virtualradio.com"> support@virtualradio.com</a>
      </p>
    </div>
  );
};

export default PrivacyPolicy;
