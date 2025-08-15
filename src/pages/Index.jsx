import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import TransactionEntry from '@/components/TransactionEntry';
import TransactionHistory from '@/components/TransactionHistory';
import BankUpload from '@/components/BankUpload';
import Reports from '@/components/Reports';
import Alerts from '@/components/Alerts';
import Profile from '@/components/Profile';
import { useAuthContext } from "@/context/AuthProvider";
import { useLocation } from "react-router-dom";

const tabMap = {
  '/dashboard': 'dashboard',
  '/AddTransaction': 'entry',
  '/TransactionHistory': 'history',
  '/BankUpload': 'upload',
  '/Reports': 'reports',
  '/Alerts': 'alerts',
  '/profile': 'profile',
};

const Index = ({ defaultTab = 'dashboard' }) => {
  const { user, loading } = useAuthContext();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Update activeTab when route changes
  useEffect(() => {
    const tab = tabMap[location.pathname] || defaultTab;
    setActiveTab(tab);
  }, [location.pathname, defaultTab]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'entry':
        return <TransactionEntry />;
      case 'history':
        return <TransactionHistory />;
      case 'upload':
        return <BankUpload />;
      case 'reports':
        return <Reports />;
      case 'alerts':
        return <Alerts />;
      case 'profile':
        return <Profile setActiveTab={setActiveTab} />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 lg:ml-64">
        <div className="p-4 lg:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Index;
