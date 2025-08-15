import React, { useState, useEffect } from 'react';
import { useAuthContext } from "@/context/AuthProvider";
import { doc, getDoc, updateDoc, deleteDoc, getDocs, query, where, collection, setDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, isFirebaseConfigured, sanitizeData, handleFirebaseError } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Trash2, Shield, Lock } from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";


const Profile = ({ setActiveTab }) => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState({ type: '', text: '' });
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    dateOfBirth: '',
    bio: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [photoURL, setPhotoURL] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadProfileData();
      setPhotoURL(user.photoURL || '');
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setProfileData(prev => ({ ...prev, email: user.email || '' }));
      if (!db || !user?.uid || !isFirebaseConfigured) {
        setLoading(false);
        return;
      }
      
      if (user.photoURL) {
        setPhotoURL(user.photoURL);
      }

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        // Sanitize data before setting state
        const sanitizedData = sanitizeData(data);
        setProfileData(prev => ({
          ...prev,
          firstName: sanitizedData.firstName || '',
          lastName: sanitizedData.lastName || '',
          phone: sanitizedData.phone || '',
          address: sanitizedData.address || '',
          city: sanitizedData.city || '',
          state: sanitizedData.state || '',
          country: sanitizedData.country || '',
          dateOfBirth: sanitizedData.dateOfBirth || '',
          bio: sanitizedData.bio || ''
        }));
      } else {
        // Initialize a minimal profile document if it doesn't exist yet
        const initialData = sanitizeData({
          uid: user.uid,
          email: user.email || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(userRef, initialData, { merge: true });
      }
    } catch (error) {
      const errorMessage = handleFirebaseError(error, 'Loading profile data');
      setToastMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setToastMessage({ type: '', text: '' });
    
    if (!user?.uid || !db) {
      setToastMessage({ type: 'error', text: 'User not authenticated or database not available' });
      return;
    }

    try {
      setLoading(true);
      
      // Sanitize and validate profile data
      const sanitizedData = sanitizeData({
        uid: user.uid,
        email: user.email,
        firstName: profileData.firstName,
        lastName: profileData.lastName || '',
        phone: profileData.phone || '',
        address: profileData.address || '',
        city: profileData.city || '',
        state: profileData.state || '',
        country: profileData.country || '',
        dateOfBirth: profileData.dateOfBirth || '',
        bio: profileData.bio || '',
        updatedAt: serverTimestamp()
      });
      
      // Validate required fields
      if (!sanitizedData.firstName || !sanitizedData.firstName.trim()) {
        setToastMessage({ type: 'error', text: 'First name is required' });
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (sanitizedData.email && !emailRegex.test(sanitizedData.email)) {
        setToastMessage({ type: 'error', text: 'Invalid email format' });
        return;
      }
      
      // Validate phone format (optional)
      if (sanitizedData.phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(sanitizedData.phone.replace(/[\s\-\(\)]/g, ''))) {
          setToastMessage({ type: 'error', text: 'Invalid phone number format' });
          return;
        }
      }
      
      // Validate bio length
      if (sanitizedData.bio && sanitizedData.bio.length > 1000) {
        setToastMessage({ type: 'error', text: 'Bio must be less than 1000 characters' });
        return;
      }

      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, sanitizedData, { merge: true });
      
      // Update Firebase Auth display name
      if (sanitizedData.firstName || sanitizedData.lastName) {
        const displayName = `${sanitizedData.firstName} ${sanitizedData.lastName}`.trim();
        await updateProfile(user, { displayName });
      }
      
      await loadProfileData(); // Reload data after update
      setToastMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (error) {
      const errorMessage = handleFirebaseError(error, 'Updating profile');
      setToastMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setToastMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setToastMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    try {
      setPhotoLoading(true);
      setToastMessage({ type: '', text: '' });
      
      if (!storage || !user?.uid) {
        setToastMessage({ type: 'error', text: 'Storage not available or user not authenticated' });
        return;
      }

      const storageRef = ref(storage, `profile-photos/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      await updateProfile(user, { photoURL: downloadURL });
      setPhotoURL(downloadURL);
      setToastMessage({ type: 'success', text: 'Profile photo updated successfully!' });
    } catch (error) {
      const errorMessage = handleFirebaseError(error, 'Uploading profile photo');
      setToastMessage({ type: 'error', text: errorMessage });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handlePhotoRemove = async () => {
    try {
      setPhotoLoading(true);
      setToastMessage({ type: '', text: '' });
      
      await updateProfile(user, { photoURL: null });
      setPhotoURL('');
      setToastMessage({ type: 'success', text: 'Profile photo removed successfully!' });
    } catch (error) {
      const errorMessage = handleFirebaseError(error, 'Removing profile photo');
      setToastMessage({ type: 'error', text: errorMessage });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setToastMessage({ type: '', text: '' });

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setToastMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }

    // Enhanced password validation
    if (passwordData.newPassword.length < 8) {
      setToastMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }
    
    // Check for password complexity
    const hasUpperCase = /[A-Z]/.test(passwordData.newPassword);
    const hasLowerCase = /[a-z]/.test(passwordData.newPassword);
    const hasNumbers = /\d/.test(passwordData.newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      setToastMessage({ type: 'error', text: 'Password must contain uppercase, lowercase, number, and special character' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setToastMessage({ type: 'error', text: 'New password and confirmation do not match' });
      return;
    }

    try {
      setPasswordLoading(true);
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordData.newPassword);
      setToastMessage({ type: 'success', text: '✅ Password updated successfully! You can now use your new password to log in.' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // Keep the success message visible for 5 seconds
      setTimeout(() => {
        setToastMessage({ type: '', text: '' });
      }, 5000);
    } catch (error) {
      const errorMessage = handleFirebaseError(error, 'Changing password');
      setToastMessage({ type: 'error', text: errorMessage });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setToastMessage({ type: '', text: '' });
    if (!deletePassword) {
      setToastMessage({ type: 'error', text: 'Please enter your password to confirm deletion' });
      return;
    }

    try {
      setDeleteLoading(true);
      
      // Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);
      
      // Delete Firestore user doc
      try {
        await deleteDoc(doc(db, 'users', user.uid));
      } catch (error) {
        const errorMessage = handleFirebaseError(error, 'Deleting user document');
        console.error(errorMessage);
      }
      
      // Delete all user entries
      try {
        const q = query(collection(db, 'entries'), where('uid', '==', user.uid));
        const snap = await getDocs(q);
        const deletions = snap.docs.map(d => deleteDoc(doc(db, 'entries', d.id)));
        await Promise.all(deletions);
      } catch (error) {
        const errorMessage = handleFirebaseError(error, 'Deleting user entries');
        console.error(errorMessage);
      }
      
      // Delete auth user
      await deleteUser(user);
      
      // Navigate to signup/login after deletion
      navigate('/signup', { replace: true });
    } catch (error) {
      const errorMessage = handleFirebaseError(error, 'Deleting account');
      setToastMessage({ type: 'error', text: errorMessage });
    } finally {
      setDeleteLoading(false);
      setDeletePassword("");
    }
  };

  const calculateProfileCompletion = () => {
    const fields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'country', 'dateOfBirth', 'bio'];
    const completedFields = fields.filter(field => profileData[field] && profileData[field].trim() !== '');
    return Math.round((completedFields.length / fields.length) * 100);
  };

  const getCompletionMessage = () => {
    const completion = calculateProfileCompletion();
    if (completion === 100) return "🎉 Your profile is complete! All features are unlocked.";
    if (completion >= 80) return "Almost there! Just a few more details to complete your profile.";
    if (completion >= 60) return "Good progress! Add more details to unlock additional features.";
    if (completion >= 40) return "Getting started! Complete more fields to enhance your experience.";
    return "Complete your profile to unlock all features and personalize your experience.";
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-600 mb-4">Loading Profile...</h2>
        <p className="text-gray-500">Please wait while we load your profile information.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-600 mb-4">Authentication Required</h2>
        <p className="text-gray-500">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account information and preferences</p>
        </div>
      </div>

      {/* Toast Messages */}
      {toastMessage.text && (
        <div className={`p-6 rounded-xl shadow-sm mb-6 ${
          toastMessage.type === 'error' ? 'bg-red-100 border border-red-300 text-red-700' :
          toastMessage.type === 'success' ? 'bg-green-100 border border-green-300 text-green-700' :
          'bg-blue-100 border border-blue-300 text-blue-700'
        }`}>
          {toastMessage.text}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
        <Button
          onClick={() => setIsEditing(!isEditing)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isEditing ? "Cancel Editing" : "Edit Profile"}
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your basic profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Enter your first name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={profileData.address}
                    onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="Enter your address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={profileData.city}
                      onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Enter your city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={profileData.state}
                      onChange={(e) => setProfileData(prev => ({ ...prev, state: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Enter your state"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={profileData.country}
                      onChange={(e) => setProfileData(prev => ({ ...prev, country: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Enter your country"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => setProfileData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    maxLength={1000}
                  />
                  <p className="text-sm text-gray-500 mt-1">{profileData.bio.length}/1000 characters</p>
                </div>

                {isEditing && (
                  <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </form>

          {/* Delete Account */}
          <Card className="mt-6">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-rose-700">
                <Trash2 className="h-5 w-5" />
                <CardTitle>Delete Account</CardTitle>
              </div>
              <CardDescription>Permanently delete your account and all data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
                <div className="flex items-center font-semibold mb-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 mr-2" />
                  This action cannot be undone
                </div>
                <p className="mb-2">Deleting your account will permanently remove:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>All your transaction history</li>
                  <li>Profile information</li>
                  <li>Financial data and reports</li>
                  <li>Account settings and preferences</li>
                </ul>
              </div>

              <AlertDialog>
                <div className="space-y-3">
                  <AlertDialogTrigger asChild>
                    <Button className="w-full bg-rose-600 hover:bg-rose-700 text-white">
                      <Trash2 className="h-4 w-4 mr-2" /> Delete My Account
                    </Button>
                  </AlertDialogTrigger>
                </div>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm account deletion</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account and associated data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="delete-password">Confirm Password</Label>
                    <Input
                      id="delete-password"
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter your password to confirm"
                      autoComplete="current-password"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading || !deletePassword}
                      className="bg-rose-600 hover:bg-rose-700"
                    >
                      {deleteLoading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                          Deleting...
                        </span>
                      ) : "Delete My Account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Profile Status */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Completion</span>
                    <span className="text-sm text-gray-500">{calculateProfileCompletion()}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${calculateProfileCompletion()}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{getCompletionMessage()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <CardTitle>Security Settings</CardTitle>
              </div>
              <CardDescription>Update your password and security preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    disabled={passwordLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    disabled={passwordLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 8 characters with uppercase, lowercase, number, and special character</p>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    disabled={passwordLoading}
                  />
                </div>
                <Button type="submit" disabled={passwordLoading} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Lock className="h-4 w-4 mr-2" />
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
