import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'  // i18n 초기화
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
