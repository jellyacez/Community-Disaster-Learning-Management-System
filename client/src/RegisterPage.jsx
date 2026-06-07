import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

const BACOLOR_BARANGAYS = [
  'Balas', 'Cabalantian', 'Cabambangan', 'Cabetican', 'Calibutbut',
  'Concepcion', 'Dolores', 'Duat', 'Macabacle', 'Magliman',
  'Maliwalu', 'Mesalipit', 'Parulog', 'Potrero', 'San Antonio',
  'San Isidro', 'San Vicente', 'Santa Barbara', 'Santa Ines',
  'Talba', 'Tinajero'
];

export default function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    barangay: '',
    password: '',
    confirmPassword: '',
  });

  const [showBarangayList, setShowBarangayList] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // placeholder only for frontend demo
    console.log('Register data:', formData);

    // later replace with API call
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-red-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-red-600 font-semibold hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Landing Page
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create Account</h1>
            <p className="text-sm text-gray-500">Register to access the DRRM portal</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter full name"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Barangay
            </label>
            <input
              type="text"
              name="barangay"
              value={formData.barangay}
              onChange={(e) => {
                handleChange(e);
                setShowBarangayList(true);
              }}
              onFocus={() => setShowBarangayList(true)}
              onBlur={() => setTimeout(() => setShowBarangayList(false), 200)}
              placeholder="Search or select barangay"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-500"
              required
              autoComplete="off"
            />
            {showBarangayList && (
              <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-lg">
                {BACOLOR_BARANGAYS.filter((b) =>
                  b.toLowerCase().includes(formData.barangay.toLowerCase())
                ).length > 0 ? (
                  BACOLOR_BARANGAYS.filter((b) =>
                    b.toLowerCase().includes(formData.barangay.toLowerCase())
                  ).map((b) => (
                    <li
                      key={b}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, barangay: b }));
                        setShowBarangayList(false);
                      }}
                      className="px-4 py-2 hover:bg-red-50 cursor-pointer text-gray-700 text-sm"
                    >
                      {b}
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-2 text-gray-500 text-sm">No results found</li>
                )}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
          >
            Register
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Already have an account?{' '}
          <Link to="/signin" className="text-red-600 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}