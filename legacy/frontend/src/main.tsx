import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { QueryProvider } from './providers/QueryProvider.tsx'
import { PWAProvider } from './components/PWAProvider.tsx'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryProvider>
        <PWAProvider>
          <App />
          <Toaster 
            position="top-right" 
            toastOptions={{
              duration: 4000,
              style: {
                background: 'white',
                color: 'black',
                border: '1px solid #e5e7eb',
              },
            }}
          />
        </PWAProvider>
      </QueryProvider>
    </ErrorBoundary>
  </StrictMode>,
)
