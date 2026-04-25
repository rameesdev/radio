import React from 'react';
import { Helmet } from 'react-helmet-async';
import './LegalPage.css';

const TermsConditions = () => {
  return (
    <div className="legal-container">
      <Helmet>
        <title>Terms and Conditions - Virtual Radio</title>
        <meta name="description" content="Read our terms and conditions for using the Virtual Radio platform." />
      </Helmet>
      <h1>Terms and Conditions</h1>
      <p>Last updated: April 25, 2026</p>

      <h2>1. Agreement to Terms</h2>
      <p>
        By accessing or using Virtual Radio, you agree to be bound by these Terms and Conditions. 
        If you do not agree with any part of these terms, you may not access the service.
      </p>

      <h2>2. Intellectual Property Rights</h2>
      <p>
        Unless otherwise indicated, the Site is our proprietary property and all source code, databases, 
        functionality, software, website designs, audio, video, text, photographs, and graphics on the Site 
        (collectively, the "Content") are owned or controlled by us or licensed to us.
      </p>

      <h2>3. User Representations</h2>
      <p>
        By using the Site, you represent and warrant that:
      </p>
      <ul>
        <li>You have the legal capacity and you agree to comply with these Terms and Conditions.</li>
        <li>You are not a minor in the jurisdiction in which you reside.</li>
        <li>You will not access the Site through automated or non-human means.</li>
        <li>You will not use the Site for any illegal or unauthorized purpose.</li>
      </ul>

      <h2>4. Prohibited Activities</h2>
      <p>
        You may not access or use the Site for any purpose other than that for which we make the Site available. 
        The Site may not be used in connection with any commercial endeavors except those that are specifically 
        endorsed or approved by us.
      </p>

      <h2>5. Limitation of Liability</h2>
      <p>
        In no event will we or our directors, employees, or agents be liable to you or any third party for any 
        direct, indirect, consequential, exemplary, incidental, special, or punitive damages, including lost profit, 
        lost revenue, loss of data, or other damages arising from your use of the site.
      </p>

      <h2>6. Modifications and Interruptions</h2>
      <p>
        We reserve the right to change, modify, or remove the contents of the Site at any time or for any reason 
        at our sole discretion without notice. We also reserve the right to modify or discontinue all or part 
        of the Site without notice at any time.
      </p>

      <h2>7. Contact Us</h2>
      <p>
        In order to resolve a complaint regarding the Site or to receive further information regarding use of the Site, 
        please contact us at: <a href="mailto:legal@virtualradio.com">legal@virtualradio.com</a>
      </p>
    </div>
  );
};

export default TermsConditions;
