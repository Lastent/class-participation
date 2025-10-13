// Firebase service layer - equivalent to your FirebaseManager in Kotlin

import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  onSnapshot, 
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Class, Student, Question } from '../types';

export class FirebaseService {
  
  /**
   * Creates a new class document
   */
  async createClass(classCode: string, className: string): Promise<void> {
    const classRef = doc(db, 'classes', classCode);
    await setDoc(classRef, {
      id: classCode,
      name: className,
      createdAt: Timestamp.now()
    });
  }

  /**
   * Checks if a class exists
   */
  async classExists(classCode: string): Promise<boolean> {
    const classRef = doc(db, 'classes', classCode);
    const classSnap = await getDoc(classRef);
    return classSnap.exists();
  }

  /**
   * Gets class information
   */
  async getClass(classCode: string): Promise<Class | null> {
    const classRef = doc(db, 'classes', classCode);
    const classSnap = await getDoc(classRef);
    
    if (classSnap.exists()) {
      const data = classSnap.data();
      return {
        id: data.id,
        name: data.name
      };
    }
    return null;
  }

  /**
   * Adds a student to a class
   */
  async addStudent(classCode: string, studentName: string): Promise<string> {
    const studentsRef = collection(db, 'classes', classCode, 'students');
    const studentDoc = await addDoc(studentsRef, {
      name: studentName,
      handRaised: false,
      joinedAt: Timestamp.now()
    });
    
    // We don't need to update the document with its ID since we use doc.id in listeners
    // This avoids the permission denied error on the update operation
    // await updateDoc(studentDoc, { id: studentDoc.id });
    
    return studentDoc.id;
  }

  /**
   * Updates student's hand raised status
   */
  async updateHandRaised(classCode: string, studentId: string, handRaised: boolean): Promise<void> {
    const studentRef = doc(db, 'classes', classCode, 'students', studentId);
    await updateDoc(studentRef, { handRaised });
  }

  /**
   * Updates question status (pending/answered)
   */
  async updateQuestionStatus(classCode: string, questionId: string, status: 'pending' | 'answered'): Promise<void> {
    const questionRef = doc(db, 'classes', classCode, 'questions', questionId);
    await updateDoc(questionRef, { status });
  }

  /**
   * Adds a question to a class
   */
  async addQuestion(classCode: string, questionText: string, studentId: string): Promise<string> {
    const questionsRef = collection(db, 'classes', classCode, 'questions');
    const questionDoc = await addDoc(questionsRef, {
      text: questionText,
      studentId,
      createdAt: Timestamp.now(),
      status: 'pending' // New questions start as pending
    });
    
    // We don't need to update the document with its ID since we use doc.id in listeners
    // This avoids the permission denied error on the update operation
    // await updateDoc(questionDoc, { id: questionDoc.id });
    
    return questionDoc.id;
  }

  /**
   * Listens for real-time updates to students in a class
   */
  onStudentsUpdate(classCode: string, callback: (students: Student[]) => void): () => void {
    const studentsRef = collection(db, 'classes', classCode, 'students');
    // Order by name for consistent display
    const q = query(studentsRef, orderBy('name', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
      const students: Student[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        students.push({
          id: doc.id,
          name: data.name,
          handRaised: data.handRaised
        });
      });
      callback(students);
    }, (error) => {
      console.error('Error in students listener:', error);
    });
  }

  /**
   * Listens for real-time updates to questions in a class
   */
  onQuestionsUpdate(classCode: string, callback: (questions: Question[]) => void): () => void {
    const questionsRef = collection(db, 'classes', classCode, 'questions');
    
    // Use simple query without orderBy to avoid permission issues
    return onSnapshot(questionsRef, (snapshot) => {
      const questions: Question[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        questions.push({
          id: doc.id,
          text: data.text,
          studentId: data.studentId,
          createdAt: data.createdAt ? data.createdAt.toDate() : undefined,
          status: data.status || 'pending' // Default to 'pending' for backward compatibility
        });
      });
      // Sort by createdAt in JavaScript (newest first)
      questions.sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      callback(questions);
    }, (error) => {
      console.error('Error in questions listener:', error);
    });
  }

  /**
   * Removes a student from a class
   */
  async removeStudent(classCode: string, studentId: string): Promise<void> {
    const studentRef = doc(db, 'classes', classCode, 'students', studentId);
    await deleteDoc(studentRef);
  }

  /**
   * Removes a question from a class
   */
  async removeQuestion(classCode: string, questionId: string): Promise<void> {
    const questionRef = doc(db, 'classes', classCode, 'questions', questionId);
    await deleteDoc(questionRef);
  }
}

// Export a singleton instance
export const firebaseService = new FirebaseService();