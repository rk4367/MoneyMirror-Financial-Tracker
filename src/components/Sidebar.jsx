import { 
  LayoutDashboard, 
  Plus, 
  FileText, 
  Upload, 
  BarChart3, 
  Bell,
  DollarSign,
  Menu,
  X,
  User
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Set tab title and favicon
  useEffect(() => {
    document.title = 'MoneyMirror';
    let favicon = document.getElementById('favicon');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.id = 'favicon';
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.type = 'image/svg+xml';
    favicon.href = '/favicon.svg';
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'entry', label: 'Add Transaction', icon: Plus },
    { id: 'history', label: 'Transaction History', icon: FileText },
    { id: 'upload', label: 'Bank Upload', icon: Upload },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const tabToRoute = {
    dashboard: '/dashboard',
    entry: '/AddTransaction',
    history: '/TransactionHistory',
    upload: '/BankUpload',
    reports: '/Reports',
    alerts: '/Alerts',
    profile: '/profile',
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center border-2"
              style={{
                width: 40,
                height: 40,
                borderColor: '#059669', // emerald-600 hex
              }}
            >
              <span style={{
                fontSize: 24,
                color: 'white',
                fontWeight: 'bold',
                fontFamily: 'sans-serif',
                lineHeight: '40px',
                textAlign: 'center',
                width: '100%'
              }}>₹</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">MoneyMirror</h1>
              <p className="text-xs text-gray-500">Financial Tracker</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                  const route = tabToRoute[item.id];
                  if (route) navigate(route);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === item.id
                    ? 'bg-emerald-50 text-emerald-700 border-r-2 border-emerald-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <IconComponent className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 rounded-lg transition-colors mb-2 font-bold shadow"
            style={{ backgroundColor: '#ef4444', color: 'white'}}
          >
            Log Out
          </button>
          <div className="text-center">
            <p className="text-xs text-gray-500">
              © 2025 MoneyMirror
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
