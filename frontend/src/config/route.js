// src/config/routes.js
export const ROUTES = {
  // Public
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  
  // Student
  STUDENT_DASHBOARD: '/dashboard',
  STUDENT_COURSE: '/course/:courseId',
  STUDENT_LESSON: '/course/:courseId/lesson/:lessonId',
  
  // Instructor
  INSTRUCTOR_DASHBOARD: '/instructor/dashboard',
  INSTRUCTOR_COURSES: '/instructor/courses',
  INSTRUCTOR_COURSE_BUILDER: '/instructor/courses/:courseId/build',
  
  // Admin
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_COURSES: '/admin/courses',
  ADMIN_USERS: '/admin/users',
  ADMIN_SETTINGS: '/admin/settings',
};