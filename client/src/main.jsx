import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import { OfflineProvider } from './context/OfflineContext'
import { NotificationProvider } from './context/NotificationContext'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider>
      <NotificationProvider>
        <OfflineProvider>
          <App />
        </OfflineProvider>
      </NotificationProvider>
    </ChakraProvider>
  </React.StrictMode>,
)

