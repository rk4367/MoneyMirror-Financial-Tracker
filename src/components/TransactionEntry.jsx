import React, { useState } from "react";
import { useEntriesContext } from "@/context/EntriesProvider";
import { formatDateDDMMYYYY } from "@/lib/utils";

const initialForm = {
  date: "",
  type: "income",
  amount: "",
  category: "",
  description: ""
};

const categories = ["Food", "Rent", "Salary", "Utilities", "Other"];

const TransactionEntry = () => {
  const { entries, addEntry, updateEntry, deleteEntry, loading, error } = useEntriesContext();
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);



  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    const entryWithNumberAmount = { ...form, amount: Number(form.amount) };
    if (editId) {
      updateEntry(editId, entryWithNumberAmount);
      setEditId(null);
    } else {
      addEntry(entryWithNumberAmount);
    }
    setForm(initialForm);
  };

  const handleReset = () => {
    setEditId(null);
    setForm(initialForm);
  };

  const handleEdit = entry => {
    setForm({ ...entry });
    setEditId(entry.id);
  };

  const handleDelete = id => {
    if (window.confirm("Delete this entry?")) deleteEntry(id);
  };

  return (
    <div className="max-w-5xl mx-auto mt-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Add Transaction</h1>
      <p className="text-gray-600 mb-6">Record your income or expense transaction.</p>
      <div className="bg-white rounded-2xl shadow p-6">
        {error && <div className="text-red-600 mb-4">Error: {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Date */}
            <div>
              <label className="block font-semibold mb-4">Date</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            {/* Type */}
            <div>
              <label className="block font-semibold mb-2">Type</label>
              <div className="flex items-center space-x-10 h-full">
                <label className="flex items-center space-x-2">
                  <input type="radio" name="type" value="income" checked={form.type === 'income'} onChange={handleChange} className="accent-emerald-600" />
                  <span className="text-emerald-600 font-medium">Income</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="radio" name="type" value="expense" checked={form.type === 'expense'} onChange={handleChange} className="accent-red-500" />
                  <span className="text-red-500 font-medium">Expense</span>
                </label>
              </div>
            </div>
            {/* Amount */}
            <div>
              <label className="block font-semibold mb-4">Amount (₹)</label>
              <input type="number" name="amount" value={form.amount} onChange={handleChange} placeholder="0.00" required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            {/* Category */}
            <div>
              <label className="block font-semibold mb-4">Category</label>
              <select name="category" value={form.category} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                <option value="">Select a category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {/* Description */}
          <div className="mb-2">
            <label className="block font-semibold mb-4">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Enter a description for this transaction..." rows={3} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none" />
          </div>
          {/* Buttons */}
          <div className="flex space-x-4 mt-4">
            <button type="submit" className="flex items-center px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors">
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Save Transaction
            </button>
            <button type="button" onClick={handleReset} className="flex items-center px-6 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors">
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              Reset
            </button>
          </div>
        </form>
      </div>
      <h3>Entries</h3>
      {loading ? <div>Loading...</div> : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Category</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id}>
                <td>{formatDateDDMMYYYY(entry.date)}</td>
                <td style={{color: entry.type === 'income' ? 'green' : 'red'}}>{entry.type}</td>
                <td>{entry.amount}</td>
                <td>{entry.category}</td>
                <td>{entry.description}</td>
                <td>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="inline-flex items-center px-4 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 text-sm font-medium transition-colors"
                      title="Edit"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6" /></svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="inline-flex items-center px-4 py-1 rounded text-sm font-medium transition-colors"
                      style={{ backgroundColor: '#ef4444', color: 'white' }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = '#dc2626'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = '#ef4444'}
                      title="Delete"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" /></svg>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TransactionEntry;
