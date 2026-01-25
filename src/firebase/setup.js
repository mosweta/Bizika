// src/firebase/setup.js
import { db } from "./config";
import { collection, doc, setDoc } from "firebase/firestore";

export const initializeDatabase = async () => {
  try {
    

    const initialCourses = [
      {
        id: "Hiking_Basics_101",
        title: "Introduction to Hiking",
        description: "Learn the fundamentals of hiking, including equipment, safety, and trail navigation.",
        category: "Outdoor Activities",
        level: "Beginner",
        duration: "8 weeks",
        price: 0,
        isFree: true,
        thumbnailUrl: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=300&fit=crop",
        enrolledCount: 0,
        rating: 0,
        lessonsCount: 12,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        published: true,
        tags: ["Outdoor", "beginner", "fitness"]
      }
    ];

    const courseLessons = [
      {
        id: "lesson_1",
        title: "What is Hiking?",
        description: "Introduction to hiking concepts and terminology",
        type: "video",
        duration: "30 minutes",
        videoUrl: "https://youtube.com/shorts/AvcBN3kwAS8?feature=share",
        order: 1,
        createdAt: new Date().toISOString()
      },
      {
        id: "lesson_2",
        title: "Types of Hiking Trails",
        description: "Understanding different hiking trail types and their characteristics",
        type: "article",
        content: "Article content here...",
        order: 2,
        createdAt: new Date().toISOString()
      }
    ];

    // Create admin user
    await setDoc(doc(db, "users", adminUser.uid), adminUser);

    // Create course
    for (const course of initialCourses) {
      await setDoc(doc(db, "courses", course.id), course);
    }

    // Create lessons
    for (const lesson of courseLessons) {
      await setDoc(doc(db, "courses", "Hiking_Basics_101", "lessons", lesson.id), lesson);
    }

    console.log("Database initialization completed successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
};
