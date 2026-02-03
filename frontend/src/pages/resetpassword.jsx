import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { auth } from '../firebase/config'
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'

export default function PasswordReset() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const oobCode = searchParams.get('oobCode')
  const emailParam = searchParams.get('email')
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [verifiedEmail, setVerifiedEmail] = useState('')

  // Use refs to track state without re-renders
  const verificationAttempted = useRef(false)
  const cleanupRef = useRef(null)

  // Memoized verification function
  const verifyCode = useCallback(async () => {
    if (verificationAttempted.current) return
    verificationAttempted.current = true
    
    console.log('🔍 Verifying reset code...')
    
    let finalOobCode = oobCode
    
    // Check sessionStorage first (faster)
    if (!finalOobCode) {
      const storedData = sessionStorage.getItem('resetPasswordData')
      if (storedData) {
        try {
          const data = JSON.parse(storedData)
          finalOobCode = data.oobCode
          if (data.email) setVerifiedEmail(data.email)
        } catch (err) {
          console.error('Error parsing stored data:', err)
        }
      }
    }
    
    if (!finalOobCode) {
      console.error('No oobCode found')
      setError('Invalid reset link. Missing reset code.')
      setVerifying(false)
      return
    }

    try {
      // Add timeout
      const timeoutPromise = new Promise((_, reject) => {
        cleanupRef.current = setTimeout(() => {
          reject(new Error('Verification timed out'))
        }, 8000)
      })

      const verificationPromise = verifyPasswordResetCode(auth, finalOobCode)
      const verifiedEmailResult = await Promise.race([verificationPromise, timeoutPromise])
      
      setVerifiedEmail(verifiedEmailResult)
      setVerifying(false)
      
      // Store for redundancy
      sessionStorage.setItem('resetPasswordData', JSON.stringify({
        oobCode: finalOobCode,
        email: verifiedEmailResult,
        timestamp: Date.now()
      }))
      
    } catch (err) {
      console.error('Verification error:', err)
      setVerifying(false)
      
      // Clean up invalid data
      sessionStorage.removeItem('resetPasswordData')
      
      if (err.code === 'auth/expired-action-code') {
        setError('This reset link has expired. Please request a new password reset.')
      } else if (err.code === 'auth/invalid-action-code') {
        setError('Invalid reset link. Please request a new password reset.')
      } else {
        setError('Failed to verify reset link. Please try again.')
      }
    }
  }, [oobCode])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        clearTimeout(cleanupRef.current)
      }
    }
  }, [])

  // Single verification effect
  useEffect(() => {
    if (oobCode || sessionStorage.getItem('resetPasswordData')) {
      verifyCode()
    } else {
      setVerifying(false)
      setError('Invalid reset link. Please use the link from your email.')
    }
  }, [oobCode, verifyCode])

  // Optimized form handlers
  const handlePasswordChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, password: e.target.value }))
  }, [])

  const handleConfirmPasswordChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    
    // Get oobCode from multiple sources
    let finalOobCode = oobCode
    if (!finalOobCode) {
      const storedData = sessionStorage.getItem('resetPasswordData')
      if (storedData) {
        try {
          const data = JSON.parse(storedData)
          finalOobCode = data.oobCode
        } catch (err) {
          console.error('Error getting stored oobCode:', err)
        }
      }
    }
    
    // Validation
    if (!finalOobCode) {
      setError('Invalid reset link. Please request a new one.')
      return
    }
    
    if (!formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields')
      return
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      console.log('🔄 Confirming password reset...')
      await confirmPasswordReset(auth, finalOobCode, formData.password)
      console.log('✅ Password reset successful')
      
      // Clear data
      sessionStorage.removeItem('resetPasswordData')
      setSuccess(true)
      
      // Debounced redirect
      const redirectTimer = setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: '✅ Password reset successful! Please login with your new password.' 
          },
          replace: true
        })
      }, 3000)
      
      cleanupRef.current = redirectTimer
      
    } catch (err) {
      console.error('Reset error:', err)
      if (err.code === 'auth/expired-action-code') {
        setError('This reset link has expired. Please request a new password reset.')
        sessionStorage.removeItem('resetPasswordData')
      } else if (err.code === 'auth/invalid-action-code') {
        setError('Invalid reset link. Please request a new password reset.')
        sessionStorage.removeItem('resetPasswordData')
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.')
      } else {
        setError('Failed to reset password. Please try again.')
      }
      setLoading(false)
    }
  }, [oobCode, formData, navigate])

  // Loading state
  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifying Reset Link</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Reset Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/forgot-password"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Request New Reset Link
          </Link>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-green-500 text-6xl mb-6">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Password Reset Successful!</h2>
          <p className="text-gray-600 mb-8">Redirecting to login...</p>
          <div className="w-16 h-1 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mx-auto"></div>
        </div>
      </div>
    )
  }

  // Main form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-blue-600 text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Set New Password</h2>
          <p className="text-gray-600">
            {verifiedEmail || emailParam ? `For: ${verifiedEmail || emailParam}` : 'Create a new password'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handlePasswordChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Enter new password"
                required
                minLength={6}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
                disabled={loading}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Must be at least 6 characters</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleConfirmPasswordChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Confirm new password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
                disabled={loading}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 flex items-center">
                <span className="mr-2">⚠️</span>
                {error}
              </p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-6 rounded-xl font-medium transition-colors ${
              loading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></span>
                Resetting...
              </span>
            ) : (
              'Reset Password'
            )}
          </button>
          
          <div className="text-center pt-4">
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}