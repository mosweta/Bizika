// src/utils/courseRating.js - CORRECTED VERSION
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';

export const updateCourseRating = async (courseId) => {
  try {
    console.log('=== DEBUG: updateCourseRating START ===');
    
    // Check authentication
    const currentUser = auth.currentUser;
    console.log('👤 User UID:', currentUser?.uid || 'NO USER');
    console.log('🔐 User authenticated?', !!currentUser);
    
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    console.log(`📚 Course ID: ${courseId}`);
    
    // Get all reviews for this course
    const reviewsRef = collection(db, 'reviews');
    const q = query(reviewsRef, where('courseId', '==', courseId));
    const snapshot = await getDocs(q);
    
    // Calculate new rating
    let totalRating = 0;
    let reviewCount = 0;
    
    snapshot.forEach((doc) => {
      const rating = doc.data().rating;
      totalRating += rating;
      reviewCount++;
    });
    
    const averageRating = reviewCount > 0 
      ? parseFloat((totalRating / reviewCount).toFixed(1))
      : 0;
    
    console.log(`📊 Rating: ${averageRating} from ${reviewCount} reviews`);
    
    // Prepare update data
    const updateData = {
      averageRating: averageRating,
      totalReviews: reviewCount,
      updatedAt: serverTimestamp()
    };
    
    console.log('📤 Update data:', updateData);
    console.log('📏 Data size:', Object.keys(updateData).length);
    console.log('🔑 Data keys:', Object.keys(updateData));
    
    const courseRef = doc(db, 'courses', courseId);
    
    // Check if course exists
    const courseDoc = await getDoc(courseRef);
    console.log('📄 Course exists?', courseDoc.exists());
    
    if (!courseDoc.exists()) {
      throw new Error(`Course ${courseId} not found`);
    }
    
    console.log('🚀 Attempting Firestore update...');
    
    // SINGLE update call
    await updateDoc(courseRef, updateData);
    
    console.log('✅ Update successful!');
    console.log('=== DEBUG END ===');
    
    return { 
      success: true, 
      averageRating, 
      reviewCount 
    };
    
  } catch (error) {
    console.error('❌ ERROR in updateCourseRating:', {
      name: error.name,
      code: error.code,
      message: error.message,
      stack: error.stack ? error.stack.split('\n')[0] : 'No stack'
    });
    
    // Check if it's a permission error
    if (error.code === 'permission-denied') {
      console.error('🔒 PERMISSION ISSUE DETECTED');
      console.error('Possible causes:');
      console.error('1. Firestore rules blocking update');
      console.error('2. User not properly authenticated');
      console.error('3. Course document path incorrect');
    }
    
    return { 
      success: false, 
      error: error.message,
      averageRating: 0,
      reviewCount: 0
    };
  }
};