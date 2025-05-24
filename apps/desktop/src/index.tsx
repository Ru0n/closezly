/**
 * index.tsx
 *
 * Entry point for the renderer process of the Electron application.
 * Renders the React application.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './components/App'

// Create a root element and render the app
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <div className="flex justify-center bg-transparent">
      <App />
    </div>
  </React.StrictMode>
)

console.log('Closezly Electron Renderer Process started')