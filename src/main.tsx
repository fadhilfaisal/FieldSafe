import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './app/router'
import { AuthProvider } from './auth/AuthProvider'
import { initializeFieldSafeData } from './services/demoDataService'
import './styles/globals.css'

async function bootstrap() {
  await initializeFieldSafeData()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </StrictMode>,
  )
}

void bootstrap()
