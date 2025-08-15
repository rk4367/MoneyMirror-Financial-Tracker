import React, { useRef } from "react";
import Papa from "papaparse";
import { useEntriesContext } from "@/context/EntriesProvider";
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDateDDMMYYYY } from "@/lib/utils";

const REQUIRED_FIELDS = ["Date", "Description", "Amount", "Type"];

const EXPECTED_HEADERS = ["Date", "Description", "Amount", "Type"];

const COLUMN_ALIASES = {
  Date: ["date", "transaction date", "value date", "posting date"],
  Description: ["description", "narration", "details", "particulars", "transaction details"],
  Amount: ["amount", "transaction amount", "amt", "dr amount", "cr amount", "withdrawal", "deposit", "withdrawal (dr)", "deposit (cr)", "debit", "credit"],
  Type: ["type", "transaction type", "dr/cr", "debit/credit", "drcr", "credit/debit", "withdrawal/deposit"]
};

const getMatchStatus = (entry, bankEntries) => {
  // Simple matching: date, amount, description
  const match = bankEntries.find(b =>
    b.date === entry.date &&
    Number(b.amount) === Number(entry.amount) &&
    b.description === entry.description
  );
  if (match) return "matched";
  if (bankEntries.filter(b => b.date === entry.date && Number(b.amount) === Number(entry.amount)).length > 1) return "duplicate";
  return "missing";
};

const colorMap = {
  matched: "#d1fae5", // green
  duplicate: "#fef9c3", // yellow
  missing: "#fee2e2" // red
};

const BankUpload = () => {
  const {
    entries,
    bankEntries, setBankEntries,
    matchResults, setMatchResults,
    uploadedFile, setUploadedFile,
    bankUploadError, setBankUploadError,
  } = useEntriesContext();
  const [loading, setLoading] = React.useState(false);
  const fileInput = useRef();
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [csvHeaders, setCsvHeaders] = React.useState([]);
  const [fieldMapping, setFieldMapping] = React.useState({});
  const [rawCsvRows, setRawCsvRows] = React.useState([]);
  const [debugNormalized, setDebugNormalized] = React.useState({ app: [], bank: [] });
  const error = bankUploadError;
  const setError = setBankUploadError;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setUploadedFile(file);
      }
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedFile(files[0]);
    }
  };

  const validateHeaders = (headers) => {
    // Check if all expected headers are present (case-insensitive)
    return EXPECTED_HEADERS.every(h => headers.some(col => col.trim().toLowerCase() === h.toLowerCase()));
  };

  const normalizeBankData = (data) => {
    // Only keep expected fields, trim, and normalize
    return data.map(row => ({
      date: formatDateDDMMYYYY(row.Date || row.date || ""),
      description: (row.Description || row.description || "").trim(),
      amount: (row.Amount || row.amount || "").toString().trim(),
      type: (row.Type || row.type || "").trim(),
    })).filter(row => row.date && row.description && row.amount && row.type);
  };

  function autoMapFields(headers) {
    const map = {};
    REQUIRED_FIELDS.forEach(field => {
      // Try all aliases for this field
      const aliases = COLUMN_ALIASES[field] || [field];
      let found = null;
      for (const alias of aliases) {
        found = headers.find(h => h.trim().toLowerCase() === alias.toLowerCase());
        if (found) break;
        found = headers.find(h => h.toLowerCase().includes(alias.toLowerCase()));
        if (found) break;
        found = headers.find(h => h.replace(/\s+/g, '').toLowerCase().includes(alias.replace(/\s+/g, '').toLowerCase()));
        if (found) break;
      }
      if (found) map[field] = found;
    });
    // Debug output

    return map;
  }

  const handleCSV = file => {
    setError("");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setRawCsvRows(results.data);
        const autoMap = autoMapFields(headers);
        setFieldMapping(autoMap);
        if (!REQUIRED_FIELDS.every(f => autoMap[f])) {
          setError('Could not find columns for: ' + REQUIRED_FIELDS.filter(f => !autoMap[f]).join(', ') + '\nDetected headers: ' + headers.join(', '));
          setBankEntries([]);
          setMatchResults([]);
          return;
        }
        // If all fields are mapped, process immediately
        const normalized = results.data.map(row => {
          let amount = row[autoMap["Amount"]];
          let type = row[autoMap["Type"]] || "";
          // If there are separate Withdrawal/Deposit columns, handle sign
          if (autoMap["Amount"] && autoMap["Amount"].toLowerCase().includes("withdrawal")) {
            amount = -Math.abs(Number(amount));
            type = "Debit";
          } else if (autoMap["Amount"] && autoMap["Amount"].toLowerCase().includes("deposit")) {
            amount = Math.abs(Number(amount));
            type = "Credit";
          } else {
            // Try to infer sign from type if possible
            if (typeof type === "string" && type.toLowerCase().includes("debit")) amount = -Math.abs(Number(amount));
            if (typeof type === "string" && type.toLowerCase().includes("credit")) amount = Math.abs(Number(amount));
          }
          return {
            date: row[autoMap["Date"]] || "",
            description: row[autoMap["Description"]] || "",
            amount: amount,
            type: (type || "").trim(),
          };
        }).filter(row => row.date && row.description && row.amount !== undefined && row.type);
        setBankEntries(normalized);
        matchWithEntries(normalized);
      },
      error: err => {
        setError("CSV parsing error: " + err.message);
        setBankEntries([]);
        setMatchResults([]);
      }
    });
  };

  const handlePDF = async file => {
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      let data;
      let isJson = false;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
        isJson = true;
      } else {
        const text = await res.text();
        setError("PDF parsing error: " + (text || "Unknown error from server."));
        setBankEntries([]);
        setMatchResults([]);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError("PDF parsing error: " + (data && data.error ? data.error : "Unknown error from server."));
        setBankEntries([]);
        setMatchResults([]);
        setLoading(false);
        return;
      }
      const headers = Object.keys((data.entries && data.entries[0]) || { Date: '', Description: '', Amount: '', Type: '' });
      setCsvHeaders(headers);
      setRawCsvRows(data.entries);
      const autoMap = autoMapFields(headers);
      setFieldMapping(autoMap);
      if (!REQUIRED_FIELDS.every(f => autoMap[f])) {
        setError('Could not find columns for: ' + REQUIRED_FIELDS.filter(f => !autoMap[f]).join(', ') + '\nDetected headers: ' + headers.join(', '));
        setBankEntries([]);
        setMatchResults([]);
        setLoading(false);
        return;
      }
      // If all fields are mapped, process immediately
      const normalized = data.entries.map(row => ({
        date: row[autoMap["Date"]] || "",
        description: row[autoMap["Description"]] || "",
        amount: row[autoMap["Amount"]],
        type: row[autoMap["Type"]] || "",
      })).filter(row => row.date && row.description && row.amount !== undefined && row.type);
      setBankEntries(normalized);
      matchWithEntries(normalized);
    } catch (err) {
      if (err && err.message) {
        setError("PDF parsing error: " + err.message);
      } else if (err && err.response && err.response.data && err.response.data.error) {
        setError("PDF parsing error: " + err.response.data.error);
      } else {
        setError("PDF parsing error. Please check that your PDF is a text-based bank statement with a table.");
      }
      setBankEntries([]);
      setMatchResults([]);
    }
    setLoading(false);
  };

  // Helper to normalize description
  function normalizeDescription(desc) {
    return (desc || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // Helper to normalize entry for matching
  function normalizeEntry(entry) {
    let type = (entry.type || '').toLowerCase();
    let amount = Number(entry.amount);
    // Handle exported app data: map 'Credit'/'Debit' to type
    if (["credit", "cr"].includes(type)) type = 'credit';
    if (["debit", "dr"].includes(type)) type = 'debit';
    if (type === 'income') type = 'credit';
    if (type === 'expense') type = 'debit';
    // If type is missing, infer from amount sign
    if (!type) type = amount < 0 ? 'debit' : 'credit';
    // Always enforce sign: debit/expense negative, credit/income positive
    if (type === 'debit' && amount > 0) amount = -amount;
    if (type === 'credit' && amount < 0) amount = -amount;
    return {
      date: formatDateDDMMYYYY(entry.date || entry["transaction date"] || entry["value date"] || entry["posting date"] || ''),
      description: normalizeDescription(entry.description || entry.narration || entry.details || entry.particulars || entry["transaction details"] || ''),
      amount: Math.round(amount * 100) / 100,
      type,
      category: (entry.category || '').trim(),
    };
  }

  const matchWithEntries = bankData => {
    // Normalize both app and bank entries
    const normalizedBank = bankData.map(normalizeEntry);
    const normalizedApp = entries.map(normalizeEntry);
    setDebugNormalized({ app: normalizedApp, bank: normalizedBank });
    const results = normalizedApp.map(normEntry => {
      // Find a match in normalized bank entries (allow small tolerance for amount)
      const match = normalizedBank.find(b =>
        b.date === normEntry.date &&
        Math.abs(b.amount - normEntry.amount) < 0.01 &&
        b.description === normEntry.description &&
        b.type === normEntry.type
      );
      const status = match
        ? 'matched'
        : normalizedBank.filter(b => b.date === normEntry.date && Math.abs(b.amount - normEntry.amount) < 0.01).length > 1
        ? 'duplicate'
        : 'missing';
      return { ...normEntry, status };
    });
    setMatchResults(results);
  };

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.name.endsWith(".csv")) handleCSV(file);
    else if (file.name.endsWith(".pdf")) handlePDF(file);
    else setError("Unsupported file type. Please upload a CSV or PDF file.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bank Statement Upload</h1>
        <p className="text-gray-600 mt-1">Upload your bank statement to compare with your transactions.</p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div
          className={`border-2 border-dashed rounded-xl p-12 transition-colors duration-200 ease-in-out flex flex-col items-center justify-center cursor-pointer ${
            isDragOver ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          tabIndex={0}
          role="button"
          aria-label="Upload bank statement"
        >
          <div className="flex flex-col items-center space-y-4 py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center shadow-inner">
              <Upload className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Upload Bank Statement</h3>
              <p className="text-gray-600">Drag and drop your file here, or click to browse</p>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <span>Supported formats:</span>
              <span className="bg-gray-100 px-2 py-1 rounded">CSV</span>
              <span className="bg-gray-100 px-2 py-1 rounded">PDF</span>
            </div>
            <input
              type="file"
              accept=".csv,.pdf"
              ref={fileInput}
              onChange={handleFile}
              className="hidden"
              id="file-upload"
            />
            <div className="mt-4">
              <label
                htmlFor="file-upload"
                className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <Upload className="h-5 w-5" />
                <span>Choose File</span>
              </label>
            </div>
          </div>
        </div>

        {/* File Info */}
        {uploadedFile && (
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-3">
            <FileText className="h-6 w-6 text-emerald-600" />
            <div className="flex-1">
              <p className="font-medium text-emerald-900">{uploadedFile.name}</p>
              <p className="text-sm text-emerald-700">
                {(uploadedFile.size / 1024).toFixed(1)} KB • Ready to process
              </p>
            </div>
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4 flex items-center space-x-3 mt-4">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span><strong>Error:</strong> {error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-32">
          <svg className="animate-spin h-8 w-8 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
          <span className="ml-4 text-gray-500 text-lg">Parsing file...</span>
        </div>
      )}

      {/* Table of Results */}
      {matchResults.length > 0 && !loading && (
        <div className="mt-8">
          <h3 className="font-semibold text-gray-900 mb-2">App Entries Compared to Bank Statement</h3>
          <p className="text-gray-600 mb-4 text-sm">These are your manually entered transactions, compared against the uploaded bank statement.</p>
          <div className="overflow-x-auto rounded-xl shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {matchResults.map((entry, idx) => (
                  <tr key={entry.id || idx} className={`transition-colors ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-emerald-50`}>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDateDDMMYYYY(entry.date)}</td>
                    <td className="px-4 py-3">{entry.type}</td>
                    <td className="px-4 py-3">{entry.amount}</td>
                    <td className="px-4 py-3">{entry.category}</td>
                    <td className="px-4 py-3">{entry.description}</td>
                    <td className="px-4 py-3">
                      {entry.status === 'matched' ? <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">✅ Matched</span> :
                        entry.status === 'duplicate' ? <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">⚠️ Duplicate</span> :
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800">❌ Missing</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State for Table */}
      {matchResults.length === 0 && uploadedFile && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <svg className="mx-auto h-12 w-12 text-gray-200" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 8v4l3 3" /></svg>
          <div className="mt-2 font-medium">No matching results found for this statement.</div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-6 w-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900">How Bank Matching Works</h3>
            <div className="mt-2 text-blue-800 space-y-2">
              <p>1. Upload your bank statement in CSV or PDF format</p>
              <p>2. Our system will parse and analyze your bank transactions</p>
              <p>3. We'll compare them with your manually entered transactions</p>
              <p>4. Mismatches, duplicates, and missing entries will be highlighted</p>
              <p>5. Review the results and take necessary actions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Process Button */}
      {uploadedFile && (
        <div className="flex justify-center">
          <button className="bg-emerald-600 text-white px-8 py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium">
            Process Bank Statement
          </button>
        </div>
      )}

      {/* Sample Format */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Expected CSV Format</h3>
        <div className="bg-white rounded-lg p-4 border">
          <pre className="text-sm text-gray-600">
{`Date,Description,Amount,Type
03-01-2025,Grocery Store,-45.50,Debit
03-01-2025,Salary Deposit,2500.00,Credit
02-01-2025,Rent Payment,-1200.00,Debit`}
          </pre>
        </div>
      </div>

      {/* Bank entries not in app */}
      {bankEntries.length > 0 && entries.length > 0 && (
        (() => {
          // Find bank entries not in app
          const missingInApp = bankEntries.filter(bankEntry => {
            const normBank = normalizeEntry(bankEntry);
            return !entries.some(entry => {
              const normEntry = normalizeEntry(entry);
              return (
                normBank.date === normEntry.date &&
                Math.abs(normBank.amount - normEntry.amount) < 0.01 &&
                normBank.description === normEntry.description &&
                normBank.type === normEntry.type
              );
            });
          });
          if (missingInApp.length === 0) return null;
          return (
            <div className="mt-8">
              <h3 className="font-semibold text-gray-900 mb-2">Bank Statement Entries Not in App (Excel Table)</h3>
              <p className="text-gray-600 mb-4 text-sm">These are transactions found in your uploaded bank statement (Excel/CSV) that are not present in your app records.</p>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {missingInApp.map((entry, idx) => (
                    <tr key={idx} style={{ background: '#fee2e2' }}>
                      <td>{formatDateDDMMYYYY(entry.date)}</td>
                      <td>{entry.type}</td>
                      <td>{entry.amount}</td>
                      <td>{entry.description}</td>
                      <td>❌ Missing in App</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()
      )}

      {process.env.NODE_ENV !== 'production' && debugNormalized.app.length > 0 && debugNormalized.bank.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold text-gray-900 mb-2">Debug: Normalized Values (App vs. Bank)</h3>
          <div className="flex gap-8">
            <div>
              <h4 className="font-bold mb-1">App Entries</h4>
              <table className="text-xs border">
                <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Category</th><th>Description</th></tr></thead>
                <tbody>
                  {debugNormalized.app.map((e, i) => (
                    <tr key={i}><td>{e.date}</td><td>{e.type}</td><td>{e.amount}</td><td>{e.category}</td><td>{e.description}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="font-bold mb-1">Bank Entries</h4>
              <table className="text-xs border">
                <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Category</th><th>Description</th></tr></thead>
                <tbody>
                  {debugNormalized.bank.map((e, i) => (
                    <tr key={i}><td>{e.date}</td><td>{e.type}</td><td>{e.amount}</td><td>{e.category}</td><td>{e.description}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankUpload;
