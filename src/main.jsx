import React from 'react';
import ReactDOM from 'react-dom/client';
import VoyagerProtocol from './VoyagerProtocol.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div style={{ width: '100%', maxWidth: 900 }}>
      <VoyagerProtocol />
    </div>
  </React.StrictMode>
);
