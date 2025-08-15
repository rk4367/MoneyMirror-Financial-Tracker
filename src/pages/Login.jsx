import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const navigate = useNavigate();

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setResetMessage("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard"); // Redirect to dashboard
    } catch (err) {
      // Show user-friendly error messages instead of Firebase technical errors
      if (err.code === 'auth/invalid-credential') {
        setError("Invalid email or password. Please check your credentials and try again.");
      } else if (err.code === 'auth/user-not-found') {
        setError("Account does not exist. Please check your email or create a new account.");
      } else if (err.code === 'auth/wrong-password') {
        setError("Incorrect password. Please try again.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed attempts. Please try again later.");
      } else if (err.code === 'auth/user-disabled') {
        setError("This account has been disabled. Please contact support.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setResetMessage("");
    if (!email) {
      setError("Enter your email above, then click Forgot Password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-2">
      <form onSubmit={handleLogin} className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-fade-in">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center border-2 border-emerald-600 shadow-lg animate-bounce-slow" style={{ width: 56, height: 56 }}>
            <span style={{ fontSize: 32, color: 'white', fontWeight: 'bold', fontFamily: 'sans-serif', lineHeight: '56px', textAlign: 'center', width: '100%' }}>₹</span>
          </div>
          <div className="mt-2">
            <h1 className="text-xl font-bold text-gray-900 text-center tracking-tight">MoneyMirror</h1>
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-6 text-center text-emerald-700">Login</h2>
        {error && <div className="bg-red-100 border border-red-300 text-red-700 rounded-lg px-4 py-2 mb-4 text-center animate-fade-in">{error}</div>}
        {resetMessage && <div className="bg-emerald-100 border border-emerald-300 text-emerald-700 rounded-lg px-4 py-2 mb-4 text-center animate-fade-in">{resetMessage}</div>}
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full mb-4 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" autoComplete="username" />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full mb-4 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" autoComplete="current-password" />
        <div className="mb-4 text-right">
          <button type="button" onClick={handleForgotPassword} className="text-sm text-emerald-600 hover:underline">
            Forgot password?
          </button>
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400">
          {loading ? <span className="flex items-center justify-center"><svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>Logging in...</span> : "Login"}
        </button>
        <p className="mt-6 text-center text-gray-600 text-sm">Don't have an account? <Link to="/signup" className="text-emerald-600 hover:underline">Sign up</Link></p>
      </form>
    </div>
  );
};

export default Login;