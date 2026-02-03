// src/firebase/db-helpers.js
import { db, storage } from "./config";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc,
  updateDoc,
  serverTimestamp,
  increment,
  arrayUnion
} from "firebase/firestore";

import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// User operations
export const getUserData = async (userId) => {
  const userDoc = await getDoc(doc(db, "users", userId));
  return userDoc.exists() ? userDoc.data() : null;
};

export const updateUserProfile = async (userId, data) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
  return true;
};

// Course operations
export const getAllCourses = async () => {
  const coursesRef = collection(db, "courses");
  const q = query(coursesRef, where("published", "==", true), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getCourseById = async (courseId) => {
  const courseDoc = await getDoc(doc(db, "courses", courseId));
  return courseDoc.exists() ? { id: courseDoc.id, ...courseDoc.data() } : null;
};

export const getCourseLessons = async (courseId) => {
  const contentRef = collection(db, "courses", courseId, "lessons");
  const q = query(contentRef, orderBy("order", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Enrollment operations
export const enrollUserInCourse = async (userId, courseId) => {
  const enrollmentRef = collection(db, "enrollments");

  const enrollmentData = {
    userId,
    courseId,
    enrolledAt: serverTimestamp(),
    progress: 0,
    completedLessons: [],
    status: "active",
    lastAccessed: serverTimestamp()
  };

  // Create enrollment with custom ID
  const enrollmentDocRef = doc(enrollmentRef, `${userId}_${courseId}`);
  await setDoc(enrollmentDocRef, enrollmentData);

  // Update user's enrolled courses
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    enrolledCourses: arrayUnion(courseId)
  });

  // Update course enrollment count
  const courseRef = doc(db, "courses", courseId);
  await updateDoc(courseRef, {
    enrolledCount: increment(1)
  });

  return { id: `${userId}_${courseId}`, ...enrollmentData };
};

export const getUserEnrollments = async (userId) => {
  const enrollmentsRef = collection(db, "enrollments");
  const q = query(enrollmentsRef, where("userId", "==", userId));
  const snapshot = await getDocs(q);

  const enrollments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const enrollmentsWithCourses = await Promise.all(
    enrollments.map(async (enrollment) => {
      const course = await getCourseById(enrollment.courseId);
      return { ...enrollment, course };
    })
  );

  return enrollmentsWithCourses;
};

// Admin operations
export const getAllUsers = async () => {
  const usersRef = collection(db, "users");
  const q = query(usersRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateUserRole = async (userId, newRole) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    role: newRole,
    updatedAt: serverTimestamp()
  });
  return true;
};

export const createCourse = async (courseData) => {
  const coursesRef = collection(db, "courses");
  const newCourse = {
    ...courseData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    enrolledCount: 0,
    rating: 0,
    published: false
  };

  const courseDoc = await addDoc(coursesRef, newCourse);
  return { id: courseDoc.id, ...newCourse };
};

// File upload operations
export const uploadFile = async (file, path) => {
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      () => {},
      (error) => reject(error),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};
