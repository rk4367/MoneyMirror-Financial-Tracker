import React, { useState } from "react";
import { useEntriesContext } from "@/context/EntriesProvider";
import { Search, Filter, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { formatDateDDMMYYYY } from "@/lib/utils";

const TransactionHistory = () => {
  const { entries, loading } = useEntriesContext();
  const [filter, setFilter] = useState({ type: "", category: "", sort: "date", search: "", startDate: "", endDate: "" });

  const categories = Array.from(new Set(entries.map(e => e.category)));

  const filtered = entries.filter(e => {
    const matchesType = !filter.type || e.type === filter.type;
    const matchesCategory = !filter.category || e.category === filter.category;
    const matchesSearch = !filter.search || (e.description && e.description.toLowerCase().includes(filter.search.toLowerCase()));
    const entryDate = e.date ? e.date.split("T")[0] : "";
    const matchesStart = !filter.startDate || entryDate >= filter.startDate;
    const matchesEnd = !filter.endDate || entryDate <= filter.endDate;
    return matchesType && matchesCategory && matchesSearch && matchesStart && matchesEnd;
  }).sort((a, b) => {
    if (filter.sort === "date") return new Date(b.date) - new Date(a.date);
    if (filter.sort === "amount") return b.amount - a.amount;
    return 0;
  });

  const exportToCSV = () => {
    if (filtered.length === 0) {
      alert('No transactions to export');
      return;
    }

    // Prepare CSV data
    const csvHeaders = ['Date', 'Type', 'Amount', 'Category', 'Description'];
    const csvData = filtered.map(entry => [
      formatDateDDMMYYYY(entry.date),
      entry.type.charAt(0).toUpperCase() + entry.type.slice(1),
      entry.amount,
      entry.category || '',
      entry.description || ''
    ]);

    // Combine headers and data
    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transaction_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
          <p className="text-gray-600 mt-1">View and manage all your financial transactions.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportToCSV}
            disabled={filtered.length === 0 || loading}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <span
              className="absolute left-3 flex items-center pointer-events-none"
              style={{ top: '50%', transform: 'translateY(-50%)', position: 'absolute',  paddingLeft: '0.5rem' }}
            >
              <Search className="text-gray-400 h-5 w-5" />
            </span>
            <input
              type="text"
              placeholder="Search description..."
              className="w-full pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              style={{ boxSizing: 'border-box', paddingLeft: '2.2rem' }}
              value={filter.search}
              onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filter.type}
              onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select
              value={filter.category}
              onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="date"
              value={filter.startDate}
              onChange={e => setFilter(f => ({ ...f, startDate: e.target.value }))}
              className="px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Start date"
            />
            <input
              type="date"
              value={filter.endDate}
              onChange={e => setFilter(f => ({ ...f, endDate: e.target.value }))}
              className="px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="End date"
            />
            <select
              value={filter.sort}
              onChange={e => setFilter(f => ({ ...f, sort: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Total Transactions</h3>
          <p className="text-2xl font-bold text-gray-900">{filtered.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Income Entries</h3>
          <p className="text-2xl font-bold text-emerald-600">
            {filtered.filter(t => t.type === 'income').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600">Expense Entries</h3>
          <p className="text-2xl font-bold text-rose-600">
            {filtered.filter(t => t.type === 'expense').length}
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <svg className="animate-spin h-8 w-8 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
              <span className="ml-4 text-gray-500 text-lg">Loading transactions...</span>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((entry, idx) => (
                  <tr key={entry.id} className={`hover:bg-emerald-50 transition-colors ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDateDDMMYYYY(entry.date)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${
                        entry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                      </span>
                      <span className={`ml-2 font-semibold ${
                        entry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        ₹ {Number(entry.amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {entry.category}
                    </td>
                    <td className="px-6 py-4">
                      {entry.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {filtered.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg className="mx-auto h-12 w-12 text-gray-200" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 8v4l3 3" /></svg>
            <div className="mt-2 font-medium">No transactions found matching your criteria.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
