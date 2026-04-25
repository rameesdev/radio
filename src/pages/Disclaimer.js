import React from 'react';
import { Helmet } from 'react-helmet-async';
import './LegalPage.css';

const Disclaimer = () => {
  return (
    <div className="legal-container">
      <Helmet>
        <title>Disclaimer - Virtual Radio</title>
        <meta name="description" content="View the disclaimer for Virtual Radio regarding information and user content." />
      </Helmet>
      <h1>Disclaimer</h1>
      <p>Last updated: April 25, 2026</p>

      <h2>1. Website Disclaimer</h2>
      <p>
        The information provided by Virtual Radio on our website is for general informational purposes only. 
        All information on the Site is provided in good faith, however we make no representation or warranty of any kind, 
        express or implied, regarding the accuracy, adequacy, validity, reliability, availability or completeness 
        of any information on the Site.
      </p>

      <h2>2. External Links Disclaimer</h2>
      <p>
        The Site may contain (or you may be sent through the Site) links to other websites or content belonging 
        to or originating from third parties or links to websites and features in banners or other advertising. 
        Such external links are not investigated, monitored, or checked for accuracy, adequacy, validity, 
        reliability, availability or completeness by us.
      </p>

      <h2>3. Professional Disclaimer</h2>
      <p>
        The Site cannot and does not contain professional advice. Any information provided is for general 
        informational and educational purposes only and is not a substitute for professional advice. 
        Accordingly, before taking any actions based upon such information, we encourage you to consult 
        with the appropriate professionals.
      </p>

      <h2>4. User Content Disclaimer</h2>
      <p>
        Virtual Radio is a platform that allows users to broadcast audio. We do not endorse and are not 
        responsible for the content broadcast by users. Users are solely responsible for the legality 
        and appropriateness of the content they share.
      </p>

      <h2>5. Limitation of Liability</h2>
      <p>
        Under no circumstance shall we have any liability to you for any loss or damage of any kind incurred 
        as a result of the use of the site or reliance on any information provided on the site. 
        Your use of the site and your reliance on any information on the site is solely at your own risk.
      </p>
    </div>
  );
};

export default Disclaimer;
