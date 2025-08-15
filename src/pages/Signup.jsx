import React, { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useNavigate, Link } from "react-router-dom";
import { User, Mail, Phone, MapPin, Calendar, FileText } from 'lucide-react';

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Account, 2: Personal Info, 3: Review & Create
  const navigate = useNavigate();

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    dateOfBirth: '',
    bio: ''
  });

  useEffect(() => {
    document.title = 'MoneyMirror - Sign Up';
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

  const handleAccountDetailsNext = (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setStep(2); // Go to personal info
  };

  const handlePersonalInfoNext = (e) => {
    e.preventDefault();
    setError("");
    if (!profileData.firstName.trim()) {
      setError("First name is required");
      return;
    }
    if (!profileData.lastName.trim()) {
      setError("Last name is required");
      return;
    }
    setStep(3); // Go to review & create
  };

  const handleCreateAccountFinal = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1) Create auth user now
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // 2) Update auth profile
      await updateProfile(cred.user, {
        displayName: `${profileData.firstName} ${profileData.lastName}`.trim(),
      });
      // 3) Persist Firestore profile
      const userRef = doc(db, 'users', cred.user.uid);
      await setDoc(userRef, {
        uid: cred.user.uid,
        email: cred.user.email,
        firstName: profileData.firstName,
        lastName: profileData.lastName || '',
        phone: profileData.phone || '',
        address: profileData.address || '',
        city: profileData.city || '',
        state: profileData.state || '',
        country: profileData.country || '',
        dateOfBirth: profileData.dateOfBirth || '',
        bio: profileData.bio || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 4) Show success page (stay on step 3 but show success) or navigate to login
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const goBack = () => {
    setStep(step - 1);
    setError("");
  };

  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-2">
        <form onSubmit={handleAccountDetailsNext} className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-fade-in">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center border-2 border-emerald-600 shadow-lg animate-bounce-slow" style={{ width: 56, height: 56 }}>
              <span style={{ fontSize: 32, color: 'white', fontWeight: 'bold', fontFamily: 'sans-serif', lineHeight: '56px', textAlign: 'center', width: '100%' }}>₹</span>
            </div>
            <div className="mt-2">
              <h1 className="text-xl font-bold text-gray-900 text-center tracking-tight">MoneyMirror</h1>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-6 text-center text-emerald-700">Create Account</h2>
          <p className="text-gray-600 text-center mb-6">Step 1 of 3: Account Details</p>
          
          {error && <div className="bg-red-100 border border-red-300 text-red-700 rounded-lg px-4 py-2 mb-4 text-center animate-fade-in">{error}</div>}
          
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            required 
            className="w-full mb-4 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" 
            autoComplete="username" 
          />
          
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            required 
            className="w-full mb-4 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" 
            autoComplete="new-password" 
          />
          
          <input 
            type="password" 
            placeholder="Confirm Password" 
            value={confirmPassword} 
            onChange={e=>setConfirmPassword(e.target.value)} 
            required 
            className="w-full mb-6 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" 
            autoComplete="new-password" 
          />
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            Continue
          </button>
          
          <p className="mt-6 text-center text-gray-600 text-sm">
            Already have an account? <Link to="/login" className="text-emerald-600 hover:underline">Login</Link>
          </p>
        </form>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-2 py-8">
        <form onSubmit={handlePersonalInfoNext} className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-fade-in">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center border-2 border-emerald-600 shadow-lg animate-bounce-slow" style={{ width: 56, height: 56 }}>
              <span style={{ fontSize: 32, color: 'white', fontWeight: 'bold', fontFamily: 'sans-serif', lineHeight: '56px', textAlign: 'center', width: '100%' }}>₹</span>
            </div>
            <div className="mt-2">
              <h1 className="text-xl font-bold text-gray-900 text-center tracking-tight">MoneyMirror</h1>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-2 text-center text-emerald-700">Complete Your Profile</h2>
          <p className="text-gray-600 text-center mb-6">Step 2 of 3: Personal Information</p>
          
          {error && <div className="bg-red-100 border border-red-300 text-red-700 rounded-lg px-4 py-2 mb-4 text-center animate-fade-in">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="John"
                />
              </div>
            </div>

            {/* Last Name (required) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={profileData.lastName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Doe"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="flex items-center">
                <Phone className="h-4 w-4 text-gray-400 mr-2" />
                <input
                  type="tel"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>



            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                <input
                  type="date"
                  name="dateOfBirth"
                  value={profileData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  name="address"
                  value={profileData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="123 Main Street"
                />
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={profileData.city}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="New York"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State/Province
              </label>
              <input
                type="text"
                name="state"
                value={profileData.state}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="NY"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <input
                type="text"
                name="country"
                value={profileData.country}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="United States"
              />
            </div>

            {/* Bio */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <div className="flex items-start">
                <FileText className="h-4 w-4 text-gray-400 mr-2 mt-2" />
                <textarea
                  name="bio"
                  value={profileData.bio}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={goBack}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            
            <button 
              type="submit" 
              disabled={loading} 
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step 3 UI
  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-2 py-8">
        <form onSubmit={handleCreateAccountFinal} className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-fade-in">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center border-2 border-emerald-600 shadow-lg" style={{ width: 56, height: 56 }}>
              <span style={{ fontSize: 32, color: 'white', fontWeight: 'bold', fontFamily: 'sans-serif', lineHeight: '56px', textAlign: 'center', width: '100%' }}>₹</span>
            </div>
            <div className="mt-2">
              <h1 className="text-xl font-bold text-gray-900 text-center tracking-tight">MoneyMirror</h1>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2 text-center text-emerald-700">Review & Create</h2>
          <p className="text-gray-600 text-center mb-6">Step 3 of 3: Confirm your details</p>

          {error && <div className="bg-red-100 border border-red-300 text-red-700 rounded-lg px-4 py-2 mb-4 text-center animate-fade-in">{error}</div>}

          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500">Email</div>
                <div className="font-medium">{email}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">First Name</div>
                <div className="font-medium">{profileData.firstName || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Last Name</div>
                <div className="font-medium">{profileData.lastName || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Phone</div>
                <div className="font-medium">{profileData.phone || '-'}</div>
              </div>
            </div>
            <div className="text-xs text-gray-500">You can edit the rest later in Profile.</div>
          </div>

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    );
  }
};

export default Signup;