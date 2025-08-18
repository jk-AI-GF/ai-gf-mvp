import './index.css';
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import './i18n'; // i18next 설정 파일 import

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <Suspense fallback="Loading...">
      <AppProvider>
        <App />
      </AppProvider>
    </Suspense>
  );
}
