import React from "react";
import { useEntriesContext } from "@/context/EntriesProvider";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle,
  PieChart,
  Calendar,
  Plus,
  Upload
} from 'lucide-react';
import { formatDateDDMMYYYY } from "@/lib/utils";

function getSummary(entries, period) {
  const now = new Date();
  let start;
  if (period === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    const day = now.getDay();
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "year") {
    start = new Date(now.getFullYear(), 0, 1);
  }
  return entries.filter(e => new Date(e.date) >= start);
}

const Dashboard = ({ setActiveTab }) => {
  const { entries, loading, error } = useEntriesContext();
  

  
  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <svg className="animate-spin h-8 w-8 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
      <span className="ml-4 text-gray-500 text-lg">Loading dashboard...</span>
    </div>
  );
  if (error) return <div className="text-center text-red-600 font-semibold py-8">Error: {error}</div>;

  const income = entries.filter(e => e.type === "income").reduce((sum, e) => sum + Number(e.amount), 0);
  const expenses = entries.filter(e => e.type === "expense").reduce((sum, e) => sum + Number(e.amount), 0);
  const balance = income - expenses;

  const today = getSummary(entries, "today");
  const week = getSummary(entries, "week");
  const month = getSummary(entries, "month");
  const year = getSummary(entries, "year");

  const sum = arr => arr.reduce((s, e) => s + Number(e.amount) * (e.type === "income" ? 1 : -1), 0);

  const unmatchedCount = entries.filter(e => e.status === 'unmatched').length;

  const recentTransactions = entries.slice(0, 5);



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your financial overview.</p>
        </div>
        <div className="mt-4 md:mt-0">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>Last updated: {formatDateDDMMYYYY(new Date())}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {/* Total Income */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between min-h-[140px] transition-transform hover:scale-[1.025] hover:shadow-lg focus-within:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-emerald-600">₹ {income.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        {/* Current Balance */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between min-h-[140px] transition-transform hover:scale-[1.025] hover:shadow-lg focus-within:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Balance</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₹ {balance.toFixed(2)}</p>
            </div>
            <div className={`p-3 rounded-full ${balance >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}> 
              <DollarSign className={`h-6 w-6 ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
            </div>
          </div>
        </div>
        {/* Total Expenses */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between min-h-[140px] transition-transform hover:scale-[1.025] hover:shadow-lg focus-within:shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-rose-600">₹ {expenses.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-rose-100 rounded-full">
              <TrendingDown className="h-6 w-6 text-rose-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Today */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today</p>
              <p className="text-2xl font-bold text-emerald-600">₹ {sum(today).toFixed(2)}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        {/* This Week */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-emerald-600">₹ {sum(week).toFixed(2)}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        {/* This Month */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-emerald-600">₹ {sum(month).toFixed(2)}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        {/* This Year */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Year</p>
              <p className="text-2xl font-bold text-emerald-600">₹ {sum(year).toFixed(2)}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>


      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded transition">
              View All
            </button>
          </div>
        </div>
        <div className="p-6">
          <div style={{ maxHeight: 400, overflowY: 'auto' }} className="space-y-4">
            {recentTransactions.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <svg className="mx-auto h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 8v4l3 3" /></svg>
                <div className="mt-2 font-medium">No recent transactions</div>
              </div>
            ) : recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg transition-shadow hover:shadow-md animate-fade-in">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${
                    transaction.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'
                  }`}>
                    {transaction.type === 'income' ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-rose-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500">{transaction.category} • {formatDateDDMMYYYY(transaction.date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}₹ {Number(transaction.amount).toFixed(2)}
                  </p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                    transaction.status === 'matched' ? 'bg-emerald-100 text-emerald-800' : 
                    transaction.status === 'unmatched' ? 'bg-amber-100 text-amber-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {transaction.status || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 rounded-xl text-white cursor-pointer transition-transform hover:scale-[1.025] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-300"
          onClick={() => setActiveTab && setActiveTab('entry')}
        >
          <div className="flex items-center space-x-3">
            <Plus className="h-8 w-8" />
            <div>
              <h3 className="font-semibold">Add Transaction</h3>
              <p className="text-emerald-100 text-sm">Log your income or expense</p>
            </div>
          </div>
        </div>

        <div
          className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white cursor-pointer transition-transform hover:scale-[1.025] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          onClick={() => setActiveTab && setActiveTab('upload')}
        >
          <div className="flex items-center space-x-3">
            <Upload className="h-8 w-8" />
            <div>
              <h3 className="font-semibold">Upload Statement</h3>
              <p className="text-blue-100 text-sm">Compare with bank records</p>
            </div>
          </div>
        </div>

        <div
          className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white cursor-pointer transition-transform hover:scale-[1.025] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
          onClick={() => setActiveTab && setActiveTab('reports')}
        >
          <div className="flex items-center space-x-3">
            <PieChart className="h-8 w-8" />
            <div>
              <h3 className="font-semibold">View Reports</h3>
              <p className="text-purple-100 text-sm">Analyze your spending</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
