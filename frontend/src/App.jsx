// src/App.jsx
import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { auth, db } from './firebase/config';
import { 
  doc, 
  getDoc,
  collection, 
  query, 
  where, 
  getDocs, 
  limit,
  addDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import Login from './pages/login.jsx'
import Signup from './pages/signup.jsx'
import AdminDashboard from './pages/admin.jsx'
import CourseCatalog from './pages/catalog.jsx'
import CoursePage from './pages/coursepage.jsx'
import StudentDashboard from './pages/student.jsx';
import CourseDetails from "./pages/coursedetails.jsx";
import EmailActionHandler from './pages/emailhandler.jsx';
import ForgotPassword from './pages/forgotpassword.jsx';
import PasswordReset from './pages/resetpassword.jsx';
import TakeQuiz from './pages/takequiz.jsx';
import QuizResults from './pages/quizresults.jsx';
import QuizManager from './pages/quizmanager.jsx';
import CreateQuiz from './pages/createquiz.jsx';
import QuizDetails from './pages/quizdetails.jsx';
import TermsConditions from './pages/terms.jsx';
import PrivacyPolicy from './pages/privacy.jsx';
import ContactForm from './pages/contact.jsx';
import Home from './pages/home/home.jsx';
import AdminLearnDashboard from './pages/adminlearn.jsx';
import CourseHome from './pages/coursehome.jsx';

// In your router configuration
import ArchivedLesson from "./pages/archivedlesson.jsx";

// Add this route



// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);
// // Add to main.jsx or App.jsx
// const animateFavicon = () => {
//   const favicon = document.querySelector('link[rel="icon"]');
//   if (!favicon) return;
  
//   let scale = 1;
//   let direction = 0.05;
  
//   const animate = () => {
//     // Create a canvas to manipulate favicon
//     const canvas = document.createElement('canvas');
//     canvas.width = 32;
//     canvas.height = 32;
//     const ctx = canvas.getContext('2d');
    
//     // Draw logo with scale effect
//     const img = new Image();
//     img.src = '/logo.png';
//     img.onload = () => {
//       ctx.clearRect(0, 0, 32, 32);
//       ctx.save();
//       ctx.translate(16, 16);
//       ctx.scale(scale, scale);
//       ctx.drawImage(img, -16, -16, 32, 32);
//       ctx.restore();
      
//       // Update favicon
//       favicon.href = canvas.toDataURL('image/png');
//     };
    
//     // Update scale for next frame
//     scale += direction;
//     if (scale > 1.2 || scale < 0.8) direction *= -1;
    
//     requestAnimationFrame(animate);
//   };
  
//   // Run for 3 seconds
//   animate();
//   setTimeout(() => {
//     // Reset to original favicon
//     favicon.href = '/logo.png';
//   }, 3000);
// };

// // Call when app loads
// animateFavicon();





// Private Route wrapper
const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        setUser(authUser);
        // Get user role from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", authUser.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          }
        } catch (error) {
          console.error("Error getting user role:", error);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Redirect based on user role
    if (userRole === 'admin') {
      return <Navigate to="/admin" />;
    } else {
      return <Navigate to="/student" />;
    }
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/courses" element={<CourseCatalog />} />
        <Route path="/course-details/:courseId" element={<CourseDetails />} />
        <Route path="/emails" element={<EmailActionHandler />} />
        <Route path="/reset-password" element={<PasswordReset />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/course/:courseId/quiz" element={<TakeQuiz />} />
        <Route path="/course/:courseId/quiz-results" element={<QuizResults />} />
        <Route path="/course/:courseId/quiz/:quizId" element={<TakeQuiz />} />
        <Route path="/contact" element={<ContactForm />} />



        {/* Protected admin routes */}
        <Route path="/admin/*" element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </PrivateRoute>
        } />
        // Add these routes

<Route path="/admin/quizzes" element={<QuizManager />} />
<Route path="/admin/create-quiz" element={<CreateQuiz />} />
<Route path="/admin/create-quiz/:courseId" element={<CreateQuiz />} />
<Route path="/admin/quiz-details/:courseId/:userId" element={<QuizDetails />} />
<Route path="/admin/learn" element={<AdminLearnDashboard />} />
        
        
        {/* Protected student/tutor routes */}
        <Route path="/student/*" element={
          <PrivateRoute allowedRoles={['student']}>
            <StudentDashboard />
          
          </PrivateRoute>
        } />

        


          <Route path="/course/:courseId" element={
          <PrivateRoute allowedRoles={['student', 'admin']}>
            <CourseHome />
          </PrivateRoute>
        } />
<Route path="/course/:courseId/archived/:lessonId" element={
          <PrivateRoute allowedRoles={['student', 'admin']}>
            <ArchivedLesson  />
          </PrivateRoute>
        } />

        <Route path="/course/:courseId/lesson/:lessonId" element={
          <PrivateRoute allowedRoles={['student', 'admin']}>
            <CoursePage />
          </PrivateRoute>
        } />
        {/* Catch all route - redirect to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
