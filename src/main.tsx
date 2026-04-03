import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ToastContainer from './components/ui/Toast'
import './index.css'

const ParsePage = lazy(() => import('./pages/ParsePage'))
const BatchPage = lazy(() => import('./pages/BatchPage'))
const MonitorPage = lazy(() => import('./pages/MonitorPage'))
const ParseHistoryPage = lazy(() => import('./pages/ParseHistoryPage'))
const EvaluationList = lazy(() => import('./pages/EvaluationList'))
const EvaluationDetail = lazy(() => import('./pages/EvaluationDetail'))
const EvaluationNew = lazy(() => import('./pages/EvaluationNew'))
const ReportView = lazy(() => import('./pages/ReportView'))
const ApiOverview = lazy(() => import('./pages/ApiOverview'))
const ApiKeys = lazy(() => import('./pages/ApiKeys'))
const ApiUsage = lazy(() => import('./pages/ApiUsage'))

function Root() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>}>
          <Routes>
            {/* Redirects */}
            <Route path="/" element={<Navigate to="/parse" replace />} />
            <Route path="/dashboard" element={<Navigate to="/parse/monitor" replace />} />

            {/* Parse module */}
            <Route path="/parse" element={<ParsePage />} />
            <Route path="/parse/batch" element={<BatchPage />} />
            <Route path="/parse/monitor" element={<MonitorPage />} />
            <Route path="/parse/history" element={<ParseHistoryPage />} />

            {/* Evaluation module */}
            <Route path="/evaluation" element={<EvaluationList />} />
            <Route path="/evaluation/new" element={<EvaluationNew />} />
            <Route path="/evaluation/:id" element={<EvaluationDetail />} />
            <Route path="/evaluation/:id/report" element={<ReportView />} />

            {/* API management module */}
            <Route path="/api" element={<ApiOverview />} />
            <Route path="/api/keys" element={<ApiKeys />} />
            <Route path="/api/usage" element={<ApiUsage />} />
          </Routes>
        </Suspense>
      </AppLayout>
      <ToastContainer />
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
