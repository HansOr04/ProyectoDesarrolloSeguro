
import { AuthProvider } from '@/context/AuthContext';
import AppRoutes from '@/routes/AppRoutes';
import '@/styles/main.css';

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;