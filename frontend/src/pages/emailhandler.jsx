import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { auth, db } from '../firebase/config'
import { verifyPasswordResetCode, applyActionCode, checkActionCode } from 'firebase/auth'
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import { CheckCircle, XCircle, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { httpsCallable } from "firebase/functions";
// import { functions } from "../firebase/config"; // Your Firebase config file
 import { getFunctions} from "firebase/functions";
import app from '../firebase/config';



export default function EmailActionHandler() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionCompleted, setActionCompleted] = useState(false)
  const [actionType, setActionType] = useState('')
  const [actionDetails, setActionDetails] = useState({})
  
  const mode = searchParams.get('mode')
  const oobCode = searchParams.get('oobCode')
  
  // Use refs for cleanup
  const abortControllerRef = useRef(new AbortController())
  const executionTracker = useRef({
    hasProcessed: false,
    processingPromise: null
  })

 const handleAction = useCallback(async () => {
  const signal = abortControllerRef.current.signal;
  
  if (signal.aborted || executionTracker.current.hasProcessed) {
    return;
  }
  
  executionTracker.current.hasProcessed = true;
  setLoading(true);
  setError('');
  
  if (!mode || !oobCode) {
    setError('Invalid email link. Please use the link from your email.');
    setLoading(false);
    return;
  }

  try {
    switch (mode) {
      case 'resetPassword':
        setActionType('resetPassword');
        await handleResetPassword(oobCode, signal);
        // handleResetPassword navigates away, so no need to setLoading(false)
        break;
        
      case 'verifyEmail':
        setActionType('verifyEmail');
        await handleVerifyEmail(oobCode, signal);
        // handleVerifyEmail will handle setLoading(false) in its finally block
        break;
        
      default:
        setError(`Unsupported action: ${mode}`);
        setLoading(false);
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    
    console.error('Action error:', error);
    setError(`Action failed: ${error.message}`);
    // Don't setLoading(false) here - the individual handlers do it
  }
}, [mode, oobCode, navigate]);

const handleResetPassword = async (code, signal) => {
    try {
      const email = await verifyPasswordResetCode(auth, code)
      
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      
      sessionStorage.setItem('resetPasswordData', JSON.stringify({
        oobCode: code,
        email,
        timestamp: Date.now()
      }))
      
      setLoading(false)
      
      navigate(`/reset-password?oobCode=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}`, {
        replace: true
      })
      
    } catch (error) {
      if (error.name === 'AbortError') throw error
      console.error('Reset password error:', error)
      throw new Error(`Reset link is invalid or has expired. ${error.message}`)
    }
  }



// In your React component (EmailActionHandler.jsx)
const handleVerifyEmail = async (code, signal) => {
  try {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    console.log("📧 Verifying email...");

    // 1️⃣ VERIFY on CLIENT (this is the key fix!)
    // Check and apply action code using CLIENT SDK
    const info = await checkActionCode(auth, code);
    const email = info.data.email;
    
    console.log(`✅ Action code valid for: ${email}`);
    
    // Apply the verification
    await applyActionCode(auth, code);
    console.log("✅ Email verified in Auth");

    // 2️⃣ SYNC to Firestore via Cloud Function
    const functions = getFunctions(app, "africa-south1");
    const syncVerification = httpsCallable(functions, "syncEmailVerification");

    const result = await Promise.race([
      syncVerification({ email }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Sync timeout")), 15000)
      ),
    ]);



    // 3️⃣ Update UI and auth state
    setActionDetails({
      email: email,
      message: result.data.message,
    });

    setActionCompleted(true);

    // Refresh user auth state
    const currentUser = auth.currentUser;
    if (currentUser) {
      await currentUser.reload();
      console.log("🔄 Auth state refreshed");
    }

  } catch (error) {
    console.error("❌ Verification failed:", error);

    if (error.name === "AbortError") throw error;

    // User-friendly error messages
    let userMessage = "Failed to verify email. Please try again.";

    if (error.code === "auth/invalid-action-code" || error.code === "auth/expired-action-code") {
      userMessage = "This verification link is invalid or has expired.";
    } else if (error.code === "auth/user-disabled") {
      userMessage = "This account has been disabled.";
    } else if (error.code === "functions/not-found") {
      userMessage = "No account found for this email.";
    } else if (error.message?.includes("timeout")) {
      userMessage = "Verification took too long. Please try again.";
    }

    throw new Error(userMessage);
  } finally {
    setLoading(false);
  }
};
// Optional: Keep this helper if you need it for other purposes,
// but it won't be used for email verification anymore
const updateFirestoreEmailStatus = async (email, signal) => {
  console.warn("⚠️ This function is deprecated. Use the Cloud Function instead.");
  throw new Error("Please use the verifyEmailAndUpdateStatus Cloud Function");
};


// Error handler utility
const getVerificationErrorMessage = (error) => {
  switch (error.code) {
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return 'This verification link has expired or has already been used. Please request a new one.'
    
    case 'auth/user-not-found':
      return 'No user found for this verification link.'
    
    default:
      return error.message || 'Failed to verify email. Please try again.'
  }
}

  const handleRedirectToLogin = () => {
    navigate('/login', { 
      state: { 
        message: actionDetails.message || 'Email verified successfully!',
        type: 'success',
        email: actionDetails.email
      },
      replace: true 
    })
  }

  // Clean effect to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clean up on unmount
      executionTracker.current.hasProcessed = false;
    };
  }, []);
  // Single, clean useEffect
  useEffect(() => {
    const controller = abortControllerRef.current
    const { signal } = controller
    
    if (mode && oobCode && !executionTracker.current.hasProcessed) {
      const timeoutId = setTimeout(() => {
        if (!signal.aborted) {
          handleAction()
        }
      }, 100)
      
      return () => {
        clearTimeout(timeoutId)
        controller.abort()
      }
    } else if ((!mode || !oobCode) && loading) {
      setError('Invalid email link. Missing required parameters.')
      setLoading(false)
    }
    
    return () => {
      // Cleanup on unmount or dependency change
      controller.abort()
    }
  }, [mode, oobCode]) // Removed unnecessary dependencies

  // Proper cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current.abort()
      // Reset for potential future mounts
      abortControllerRef.current = new AbortController()
      executionTracker.current.hasProcessed = false
      executionTracker.current.processingPromise = null
    }
  }, [])


  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="h-24 w-24 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Mail className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            {mode === 'verifyEmail' ? 'Verifying Your Email' : 
             mode === 'resetPassword' ? 'Processing Password Reset' :
             'Processing Your Request'}
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Please wait while we process your email action...
          </p>
          
          {/* Debug info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-gray-600 font-mono">
              Code: {oobCode ? `${oobCode.substring(0, 10)}...` : 'None'}
            </p>
            <p className="text-sm text-gray-600">
              Action: {mode || 'None'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Action Failed</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
          
          <div className="space-y-3">
            {mode === 'resetPassword' && (
              <button
                onClick={() => navigate('/forgot-password')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition"
              >
                Request New Reset Link
              </button>
            )}
            
            {mode === 'verifyEmail' && (
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-3 px-4 rounded-lg transition"
              >
                Try Logging In Anyway
              </button>
            )}
            
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg transition"
            >
              Go to Login
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full text-blue-600 hover:text-blue-800 font-medium py-2"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show success state
  if (actionCompleted && actionType === 'verifyEmail') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Email Verified!</h2>
          
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full mb-4">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-medium">Verification Successful</span>
            </div>
            
            <p className="text-gray-600 mb-2">
              ✅ Your email has been successfully verified!
            </p>
            
            {actionDetails.email && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-blue-800 font-medium">
                  Account verified: <span className="text-blue-600">{actionDetails.email}</span>
                </p>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleRedirectToLogin}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition"
            >
              Proceed to Login
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full text-blue-600 hover:text-blue-800 font-medium py-2"
            >
              Go to Homepage
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              You can now log in with your verified email address.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show success state for password reset
  if (actionCompleted && actionType === 'resetPassword') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-blue-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Reset Password</h2>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              ✅ Your reset link has been verified. You can now set a new password.
            </p>
          </div>
          
          <button
            onClick={() => navigate('/reset-password')}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition"
          >
            Set New Password
          </button>
        </div>
      </div>
    )
  }

  // Default return (should not reach here in normal flow)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
        <p className="text-gray-500 mt-2">Processing completed</p>
      </div>
    </div>
  )
}
