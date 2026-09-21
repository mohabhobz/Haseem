import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/tokens.css'
import './styles/app.css'
import './styles/ob.css'
import { applyBrand } from './lib/brand.js'

/* هوية المنشأة بتتطبّق قبل أول رسم عشان مفيش ومضة باللون القديم */
applyBrand()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
