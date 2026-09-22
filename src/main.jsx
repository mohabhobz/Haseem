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

/* ★ الموبايل: القوايم المنسدلة بتطلع درج من تحت وخلفيتها معتّمة. الضغط على
   الخلفية لازم يقفل الدرج بس — من غير ما الضغطة توصل للي تحتها (زرار/حقل/كارت). */
const DROPS = '.ob-menu, .rmenu__p, .perpage__p, .dr__pop, .selx__p, .datep, .pfilter__pop'
const isMobile = () => window.matchMedia('(max-width: 599px)').matches
let swallow = 0
const outsideDrop = (e) => isMobile() && document.querySelector(DROPS) && !(e.target.closest && e.target.closest(DROPS))
document.addEventListener('pointerdown', (e) => { if (outsideDrop(e)) swallow = Date.now() }, true)
const eat = (e) => { if (swallow && Date.now() - swallow < 800) { e.preventDefault(); e.stopPropagation(); if (e.type === 'click') swallow = 0 } }
document.addEventListener('mousedown', (e) => { if (swallow && Date.now() - swallow < 800) e.preventDefault() }, true)
document.addEventListener('click', eat, true)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
