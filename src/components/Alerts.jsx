import React, { useState } from "react";
import { useEntriesContext } from "@/context/EntriesProvider";
import { AlertTriangle, CheckCircle, XCircle, Copy } from 'lucide-react';
import { formatDateDDMMYYYY } from "@/lib/utils";

export const Alerts = () => {
  const { entries } = useEntriesContext();
  const [filter, setFilter] = useState('all');
  const alerts = [];

  // Mismatches and duplicates (assume status is set by matching logic)
  entries.forEach(e => {
    if (e.status === "missing") alerts.push({ type: "missing", msg: `Missing entry: ${e.description} (${e.amount}) on ${formatDateDDMMYYYY(e.date)}` });
    if (e.status === "duplicate") alerts.push({ type: "duplicate", msg: `Duplicate entry: ${e.description} (${e.amount}) on ${formatDateDDMMYYYY(e.date)}` });
  });

  // Large/unusual entries
  entries.forEach(e => {
    if (Number(e.amount) > 1000) alerts.push({ type: "large", msg: `Large entry: ${e.description} (${e.amount}) on ${formatDateDDMMYYYY(e.date)}` });
  });

  if (alerts.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <svg className="mx-auto h-12 w-12 text-gray-200" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 8v4l3 3" /></svg>
      <div className="mt-2 font-medium">No alerts &mdash; everything looks great! 🎉</div>
    </div>
  );

  const getAlertIcon = (type) => {
    switch (type) {
      case 'missing':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'duplicate':
        return <Copy className="h-5 w-5 text-orange-600" />;
      case 'large':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'missing':
        return 'border-red-200 bg-red-50';
      case 'duplicate':
        return 'border-orange-200 bg-orange-50';
      case 'large':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alerts & Notifications</h1>
        <p className="text-gray-600 mt-1">Monitor transaction matching status and discrepancies.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-4">
        {['all', 'missing', 'duplicate', 'large'].map(type => (
          <button
            key={type}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 ${
              filter === type ?
                (type === 'missing' ? 'bg-red-100 text-red-700' :
                 type === 'duplicate' ? 'bg-orange-100 text-orange-700' :
                 type === 'large' ? 'bg-blue-100 text-blue-700' :
                 'bg-gray-200 text-gray-700')
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}
            `}
            onClick={() => setFilter(type)}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Missing</p>
              <p className="text-2xl font-bold text-red-600">{alerts.filter(a => a.type === 'missing').length}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Duplicates</p>
              <p className="text-2xl font-bold text-orange-600">{alerts.filter(a => a.type === 'duplicate').length}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Copy className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Large Entries</p>
              <p className="text-2xl font-bold text-blue-600">{alerts.filter(a => a.type === 'large').length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.filter(a => filter === 'all' || a.type === filter).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 animate-fade-in">
            <svg className="mx-auto h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 8v4l3 3" /></svg>
            <div className="mt-2 font-medium">No {filter !== 'all' ? filter : ''} alerts found.</div>
          </div>
        ) : alerts.filter(a => filter === 'all' || a.type === filter).map((a, i) => (
          <div key={i} className={`rounded-xl border p-6 ${getAlertColor(a.type)} transition-shadow hover:shadow-md animate-fade-in`}>
            <div className="flex items-center space-x-3 mb-4">
              {getAlertIcon(a.type)}
              <h2 className="text-lg font-semibold text-gray-900">{a.msg}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-4">Recommendations</h3>
        <div className="space-y-3 text-blue-800">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
            <p>Upload your latest bank statement to identify new unmatched transactions</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
            <p>Review duplicate entries and remove unnecessary transactions</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
            <p>Set up automatic email notifications for discrepancies</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
