import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from "firebase/firestore";
import { db, isFirebaseConfigured, sanitizeData, handleFirebaseError } from "@/lib/firebase";
import { useAuthContext } from "@/context/AuthProvider";

export const EntriesContext = createContext();

export const EntriesProvider = ({ children }) => {
  const { user } = useAuthContext();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entriesWithStatus, setEntriesWithStatus] = useState([]);
  // Global state for bank upload and matching
  const [bankEntries, setBankEntries] = useState([]);
  const [matchResults, setMatchResults] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [bankUploadError, setBankUploadError] = useState("");

  useEffect(() => {
    if (!user || !isFirebaseConfigured || !db) {
      setEntries([]);
      setLoading(false);
      setError(null);
      return;
    }
    
    const q = query(
      collection(db, "entries"),
      where("uid", "==", user.uid),
      orderBy("date", "desc")
    );
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        try {
          const entriesData = snapshot.docs.map(doc => {
            const data = doc.data();
            // Sanitize data before setting state
            return { 
              id: doc.id, 
              ...sanitizeData(data)
            };
          });
          setEntries(entriesData);
          setLoading(false);
          setError(null);
        } catch (error) {
          const errorMessage = handleFirebaseError(error, 'Data processing');
          setError(errorMessage);
          setLoading(false);
        }
      },
      (error) => {
        const errorMessage = handleFirebaseError(error, 'Fetching entries');
        setError(errorMessage);
        setLoading(false);
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [user, db]);

  // Enhanced CRUD methods with better error handling and data protection
  const addEntry = async (entry) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }
    
    if (!entry || typeof entry !== 'object') {
      setError('Invalid entry data');
      return;
    }
    
    try {
      // Sanitize and validate entry data
      const sanitizedEntry = sanitizeData({
        ...entry, 
        uid: user.uid,
        createdAt: new Date().toISOString()
      });
      
      // Validate required fields
      if (!sanitizedEntry.date || !sanitizedEntry.amount || !sanitizedEntry.type) {
        setError('Missing required fields: date, amount, and type are required');
        return;
      }
      
      // Validate amount
      const amount = parseFloat(sanitizedEntry.amount);
      if (isNaN(amount) || amount > 999999999.99 || amount < -999999999.99) {
        setError('Invalid amount. Must be a number between -999,999,999.99 and 999,999,999.99');
        return;
      }
      
      // Validate date
      const entryDate = new Date(sanitizedEntry.date);
      if (isNaN(entryDate.getTime())) {
        setError('Invalid date format');
        return;
      }
      
      // Check for future dates (optional validation)
      if (entryDate > new Date()) {
        setError('Cannot add entries with future dates');
        return;
      }
      
      const docRef = await addDoc(collection(db, "entries"), sanitizedEntry);
      setError(null); // Clear any previous errors
    } catch (error) {
      const errorMessage = handleFirebaseError(error, 'Adding entry');
      setError(errorMessage);
    }
  };
  
  const updateEntry = async (id, data) => {
    if (!id || !data) {
      setError('Invalid update parameters');
      return;
    }
    
    try {
      // Sanitize update data
      const sanitizedData = sanitizeData(data);
      
      // Validate amount if present
      if (sanitizedData.amount !== undefined) {
        const amount = parseFloat(sanitizedData.amount);
        if (isNaN(amount) || amount > 999999999.99 || amount < -999999999.99) {
          setError('Invalid amount. Must be a number between -999,999,999.99 and 999,999,999.99');
          return;
        }
      }
      
      // Validate date if present
      if (sanitizedData.date) {
        const entryDate = new Date(sanitizedData.date);
        if (isNaN(entryDate.getTime())) {
          setError('Invalid date format');
          return;
        }
      }
      
      await updateDoc(doc(db, "entries", id), {
        ...sanitizedData,
        updatedAt: new Date().toISOString()
      });
      setError(null); // Clear any previous errors
    } catch (error) {
      const errorMessage = handleFirebaseError(error, 'Updating entry');
      setError(errorMessage);
    }
  };
  
  const deleteEntry = async (id) => {
    if (!id) {
      setError('Invalid entry ID');
      return;
    }
    
    try {
      await deleteDoc(doc(db, "entries", id));
      setError(null); // Clear any previous errors
    } catch (error) {
      const errorMessage = handleFirebaseError(error, 'Deleting entry');
      setError(errorMessage);
    }
  };

  // Enhanced error clearing
  const clearError = () => {
    setError(null);
  };

  // Enhanced data validation for bank entries
  const validateBankEntry = (entry) => {
    if (!entry || typeof entry !== 'object') {
      return { valid: false, error: 'Invalid entry data' };
    }
    
    const requiredFields = ['date', 'amount', 'description'];
    for (const field of requiredFields) {
      if (!entry[field]) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }
    
    const amount = parseFloat(entry.amount);
    if (isNaN(amount) || amount > 999999999.99 || amount < -999999999.99) {
      return { valid: false, error: 'Invalid amount' };
    }
    
    const entryDate = new Date(entry.date);
    if (isNaN(entryDate.getTime())) {
      return { valid: false, error: 'Invalid date format' };
    }
    
    return { valid: true };
  };

  return (
    <EntriesContext.Provider value={{
      entries, loading, error, addEntry, updateEntry, deleteEntry, clearError,
      entriesWithStatus, setEntriesWithStatus,
      bankEntries, setBankEntries,
      matchResults, setMatchResults,
      uploadedFile, setUploadedFile,
      bankUploadError, setBankUploadError,
      validateBankEntry
    }}>
      {children}
    </EntriesContext.Provider>
  );
};

export const useEntriesContext = () => useContext(EntriesContext); 