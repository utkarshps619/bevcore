import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  FileText,
  Wine,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useUserOutlets } from '../hooks/useOutlets';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Shift Notes', href: '/shift-notes', icon: FileText },
  { name: 'Recipes', href: '/recipes', icon: Wine },
];

export function Layout() {
  const { user, signOut } = useAuth();
  const { outlets } = useUserOutlets();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [outletDropdownOpen, setOutletDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 transform bg-[#111113] border-r border-[#1e1e21] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-[#1e1e21]">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Wine className="h-5 w-5 text-black" />
              </div>
              <span className="text-xl font-semibold text-white tracking-tight">BevCore</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-zinc-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Outlet selector */}
          <div className="px-4 py-4 border-b border-[#1e1e21]">
            <div className="relative">
              <button
                onClick={() => setOutletDropdownOpen(!outletDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#1a1a1d] hover:bg-[#1e1e21] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-sm font-medium text-white">
                    {outlets.length > 0 ? outlets[0].name : 'Select Outlet'}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-zinc-400 transition-transform ${outletDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {outletDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 py-2 rounded-xl bg-[#1a1a1d] border border-[#2e2e31] shadow-xl z-50">
                  {outlets.map((outlet) => (
                    <button
                      key={outlet.id}
                      onClick={() => setOutletDropdownOpen(false)}
                      className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-[#2a2a2d] hover:text-white transition-colors"
                    >
                      {outlet.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-400 border border-amber-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1d]'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="px-4 py-4 border-t border-[#1e1e21]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">Account</span>
                  <span className="text-xs text-zinc-500 truncate max-w-[140px]">
                    {user?.email}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1a1a1d] transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 h-16 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-[#1e1e21] lg:hidden">
          <div className="flex h-full items-center justify-between px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1a1a1d] transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Wine className="h-4 w-4 text-black" />
              </div>
              <span className="text-lg font-semibold text-white">BevCore</span>
            </div>
            <div className="w-10" />
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
