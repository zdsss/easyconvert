import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import App from './App.tsx'
import EvaluationList from './pages/EvaluationList'
import EvaluationDetail from './pages/EvaluationDetail'
import EvaluationNew from './pages/EvaluationNew'
import './index.css'

function Root() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-xl">📋</span>
              <span className="text-lg font-semibold text-gray-800">EasyConvert</span>
            </Link>
            <div className="flex gap-6">
              <Link to="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">解析</Link>
              <Link to="/evaluation" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">评测</Link>
            </div>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/evaluation" element={<EvaluationList />} />
          <Route path="/evaluation/new" element={<EvaluationNew />} />
          <Route path="/evaluation/:id" element={<EvaluationDetail />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
