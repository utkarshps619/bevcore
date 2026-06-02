import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { ShiftNotesPage } from './pages/ShiftNotesPage';
import { RecipesPage } from './pages/RecipesPage';
import { POSMappingPage } from './pages/POSMappingPage';
import { RecipeImportPage } from './pages/RecipeImportPage';
import { IngredientImportPage } from './pages/IngredientImportPage';
import { IngredientsPage } from './pages/IngredientsPage';
import { PourCostDashboard } from './pages/PourCostDashboard';
import VarianceDashboard from './pages/VarianceDashboard';
import OpenItemCalculator from './pages/OpenItemCalculator';
import { StockAdjustmentsPage } from './pages/StockAdjustmentsPage';
import { MultiOutletDashboard } from './pages/MultiOutletDashboard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="shift-notes" element={<ShiftNotesPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="pos-mapping" element={<POSMappingPage />} />
        <Route path="ingredients" element={<IngredientsPage />} />
        <Route path="recipe-import" element={<RecipeImportPage />} />
        <Route path="ingredient-import" element={<IngredientImportPage />} />
        <Route path="pour-cost" element={<PourCostDashboard />} />
        <Route path="stock-adjustments" element={<StockAdjustmentsPage />} />
        <Route path="variance" element={<VarianceDashboard />} />
        <Route path="multi-outlet" element={<MultiOutletDashboard />} />
        <Route path="open-item" element={<OpenItemCalculator />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
