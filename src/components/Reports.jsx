import React from "react";
import { saveAs } from "file-saver";
import { useEntriesContext } from "@/context/EntriesProvider";
import { formatDateDDMMYYYY } from "@/lib/utils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const Reports = () => {
  const { entries } = useEntriesContext();

  // Calculate summary values
  const income = entries.filter(e => e.type === "income").reduce((sum, e) => sum + Number(e.amount), 0);
  const expenses = entries.filter(e => e.type === "expense").reduce((sum, e) => sum + Number(e.amount), 0);
  const netIncome = income - expenses;
  const savingsRate = income > 0 ? ((netIncome / income) * 100) : 0;
  const avgDailyExpense = expenses > 0 ? (expenses / 30) : 0;

  // Top expense categories
  const expenseCategories = {};
  entries.filter(e => e.type === "expense").forEach(e => {
    if (!expenseCategories[e.category]) expenseCategories[e.category] = 0;
    expenseCategories[e.category] += Number(e.amount);
  });
  const topCategories = Object.entries(expenseCategories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Export to CSV
  const exportCSV = () => {
    const csv = ["Date,Description,Category,Amount,Type"].concat(
      entries.map(e => {
        const isIncome = e.type === "income";
        const typeLabel = isIncome ? "Credit" : "Debit";
        const amount = Math.abs(Number(e.amount)).toFixed(2);
        return `${formatDateDDMMYYYY(e.date)},${e.description},${e.category || ''},${amount},${typeLabel}`;
      })
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    saveAs(blob, "report.csv");
  };

  // Export to PDF
  const exportPDF = async () => {
    const reportSections = document.querySelectorAll('.report-section');
    const doc = new jsPDF({ unit: 'px', format: 'a4' });
    let y = 20;
    for (let i = 0; i < reportSections.length; i++) {
      const section = reportSections[i];
      // Use html2canvas to render each section
      const canvas = await html2canvas(section, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const imgProps = doc.getImageProperties(imgData);
      const pdfWidth = doc.internal.pageSize.getWidth() - 40;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      if (y + pdfHeight > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 20;
      }
      doc.addImage(imgData, 'PNG', 20, y, pdfWidth, pdfHeight);
      y += pdfHeight + 20;
    }
    doc.save('report.pdf');
  };

  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg className="mx-auto h-12 w-12 text-gray-200" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 8v4l3 3" /></svg>
        <div className="mt-2 font-medium">No data available. Add transactions to see reports.</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mt-0 pt-0 px-2">
      {/* Header and Export */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-600 mt-1">Analyze your spending patterns and financial trends.</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <button
            onClick={exportCSV}
            className="flex items-center px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 report-section">
        <div className="bg-white rounded-xl shadow p-6 flex items-center justify-between transition-transform hover:scale-[1.025] hover:shadow-lg focus-within:shadow-lg">
          <div>
            <p className="text-gray-500 font-medium mb-1">Net Income</p>
            <p className="text-2xl font-bold text-emerald-600">₹ {netIncome.toFixed(2)}</p>
          </div>
          <div className="bg-emerald-50 rounded-full p-3">
            <svg className="h-7 w-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex items-center justify-between transition-transform hover:scale-[1.025] hover:shadow-lg focus-within:shadow-lg">
          <div>
            <p className="text-gray-500 font-medium mb-1">Savings Rate</p>
            <p className="text-2xl font-bold text-purple-500">{savingsRate.toFixed(1)}%</p>
          </div>
          <div className="bg-purple-50 rounded-full p-3">
            <svg className="h-7 w-7 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m16-10V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4m18 0H3" /></svg>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex items-center justify-between transition-transform hover:scale-[1.025] hover:shadow-lg focus-within:shadow-lg">
          <div>
            <p className="text-gray-500 font-medium mb-1">Avg. Daily Expense</p>
            <p className="text-2xl font-bold text-orange-500">₹ {avgDailyExpense.toFixed(2)}</p>
          </div>
          <div className="bg-orange-50 rounded-full p-3">
            <svg className="h-7 w-7 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" /></svg>
          </div>
        </div>
      </div>

      {/* Income vs Expenses */}
      <div className="bg-white rounded-xl shadow p-6 report-section mt-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Income vs Expenses</h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-emerald-500"></span>
            <span className="text-gray-700 font-medium" style={{marginLeft: '8px'}}>Income</span>
            <span className="ml-auto text-emerald-600 font-bold" style={{marginLeft: '8px'}}>₹ {income.toFixed(2)}</span>
          </div>
          <div className="w-full h-3 bg-emerald-100 rounded-full mb-2">
            <div className="h-3 bg-emerald-500 rounded-full" style={{ width: income + expenses > 0 ? `${(income / (income + expenses)) * 100}%` : '0%' }}></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-rose-500"></span>
            <span className="text-gray-700 font-medium" style={{marginLeft: '8px'}}>Expenses</span>
            <span className="ml-auto text-rose-600 font-bold" style={{marginLeft: '8px'}}>₹ {expenses.toFixed(2)}</span>
          </div>
          <div className="w-full h-3 bg-rose-100 rounded-full">
            <div className="h-3 bg-rose-500 rounded-full" style={{ width: income + expenses > 0 ? `${(expenses / (income + expenses)) * 100}%` : '0%' }}></div>
          </div>
        </div>
      </div>

      {/* Top Expense Categories */}
      <div className="bg-white rounded-xl shadow p-6 report-section mt-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Expense Categories</h3>
        <div className="divide-y divide-gray-100">
          {topCategories.length === 0 && <div className="text-gray-500">No expense data available.</div>}
          {topCategories.map(([cat, amt]) => (
            <div key={cat} className="flex items-center justify-between py-3">
              <span className="text-gray-800 font-medium">{cat}</span>
              <span className="text-gray-900 font-bold">₹ {amt.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Reports;
