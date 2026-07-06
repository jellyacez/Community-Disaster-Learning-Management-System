
export default function GoogleOAuthBanner() {
  return (
    <>
      <div className="mb-6 flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="w-5 h-5 flex items-center justify-center bg-red-600 rounded">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <label className="text-sm font-semibold text-gray-700 select-none">
          Signed in with Google Account
        </label>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl text-center shadow-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <h3 className="text-blue-900 font-bold">Google OAuth Account</h3>
        </div>
        <p className="text-sm text-blue-800/80 leading-relaxed max-w-sm mx-auto">
          Since you securely signed in using your Google account, you do not have (or need) a password on our platform. Your account is protected by Google's security!
        </p>
      </div>
    </>
  );
}
