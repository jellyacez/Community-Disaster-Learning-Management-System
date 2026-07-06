import { useState, useEffect } from "react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { Link } from "react-router-dom";

export default function PrivacyPolicyPage() {
  useDocumentTitle("Privacy Policy | Bacolor LMS");
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-5xl w-full mb-4">
        <Link to="/" className="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Home
        </Link>
      </div>
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-red-600 px-8 py-6">
          <h1 className="text-3xl font-bold text-white">Data Privacy Policy</h1>
          <p className="text-red-100 mt-2">Community Disaster Learning Management System</p>
        </div>
        
        <div className="w-full flex flex-col items-center bg-white">
          {/* Iframe to load the massive Termly HTML securely without breaking React */}
          <iframe 
            src="/termly-privacy.html" 
            title="Termly Privacy Policy"
            className="w-full border-none"
            scrolling="no"
            style={{ overflow: 'hidden', minHeight: '800px' }}
            onLoad={(e) => {
              try {
                const iframe = e.target;
                const height = iframe.contentWindow.document.documentElement.scrollHeight;
                iframe.style.height = height + 50 + 'px'; // Add a little padding at the bottom
              } catch (err) {
                console.error("Iframe resize error:", err);
              }
            }}
          />
          
          {/* Bottom Navigation for Long Documents */}
          <div className="w-full flex justify-between items-center px-8 py-6 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              Back to Top
            </button>
            
            <Link to="/" className="px-6 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-red-700 transition-colors">
              Return Home
            </Link>
          </div>
        </div>
      </div>
      {/* Floating Back to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 hover:shadow-xl transition-all duration-300 z-50 flex items-center justify-center"
          aria-label="Scroll to top"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
}
