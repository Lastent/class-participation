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
  Timestamp,
  deleteField
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Class, Student, Question } from '../types';
import { writeBatch } from 'firebase/firestore';

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
   * Close a class by setting state and closeAt. Does not delete the class document.
   */
  async closeClass(classCode: string): Promise<void> {
    const classRef = doc(db, 'classes', classCode);
    await updateDoc(classRef, {
      state: 'closed',
      closeAt: Timestamp.now()
    });
    // Mark all students as removed when closing the class
    try {
      const studentsRef = collection(db, 'classes', classCode, 'students');
      const snapshot = await (await import('firebase/firestore')).getDocs(studentsRef);
      const batch = writeBatch(db);
      snapshot.forEach(snap => {
        const studentRef = doc(db, 'classes', classCode, 'students', snap.id);
        batch.update(studentRef, { status: 'removed' });
      });
      await batch.commit();
    } catch (err) {
      console.error('Error marking students removed on close:', err);
    }
  }

  /**
   * Reopen a previously closed class by setting state to 'open' and removing closeAt
   */
  async reopenClass(classCode: string): Promise<void> {
    const classRef = doc(db, 'classes', classCode);
    await updateDoc(classRef, {
      state: 'open',
      closeAt: deleteField()
    });
  }

  /**
   * Update a single student's status field
   */
  async updateStudentStatus(classCode: string, studentId: string, status: 'active' | 'removed') {
    const studentRef = doc(db, 'classes', classCode, 'students', studentId);
    await updateDoc(studentRef, { status });
  }

  /**
   * Lower a student's hand by setting handRaised to false and record in history
   */
  async lowerStudentHand(classCode: string, studentId: string): Promise<void> {
    const studentRef = doc(db, 'classes', classCode, 'students', studentId);
    await updateDoc(studentRef, { handRaised: false });
    
    // Record in hand history that teacher lowered the hand
    await this.recordHandHistory(
      classCode,
      studentId,
      'lowered',
      'teacher',
      'Teacher'
    );
  }

  /**
   * Records a hand history entry when student raises or lowers their hand
   */
  private async recordHandHistory(
    classCode: string,
    studentId: string,
    action: 'raised' | 'lowered',
    raisedBy: 'student' | 'teacher',
    raisedByName: string | null
  ): Promise<void> {
    try {
      const handHistoryRef = collection(db, 'classes', classCode, 'students', studentId, 'handHistory');
      await addDoc(handHistoryRef, {
        action,
        raisedBy,
        raisedByName: raisedByName || null,
        timestamp: Timestamp.now()
      });
    } catch (err) {
      console.error('Error recording hand history:', err);
    }
  }

  /**
   * Gets the hand history for a student
   */
  async getHandHistory(classCode: string, studentId: string): Promise<any[]> {
    try {
      const handHistoryRef = collection(db, 'classes', classCode, 'students', studentId, 'handHistory');
      const q = query(handHistoryRef, orderBy('timestamp', 'desc'));
      const snapshot = await (await import('firebase/firestore')).getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : null
      }));
    } catch (err) {
      console.error('Error fetching hand history:', err);
      return [];
    }
  }

  /**
   * Listen to a specific student's document
   */
  onStudentDoc(classCode: string, studentId: string, callback: (data: any) => void): () => void {
    const studentRef = doc(db, 'classes', classCode, 'students', studentId);
    return onSnapshot(studentRef, (snapshot) => {
      if (snapshot.exists()) callback(snapshot.data());
    }, (err) => console.error('Error in student doc listener:', err));
  }

  /**
   * Listen for updates to the class document (e.g., state changes)
   */
  onClassUpdate(classCode: string, callback: (data: any) => void): () => void {
    const classRef = doc(db, 'classes', classCode);
    return onSnapshot(classRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    }, (error) => {
      console.error('Error in class listener:', error);
    });
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
   * Updates student's hand raised status and records in hand history
   */
  async updateHandRaised(classCode: string, studentId: string, handRaised: boolean): Promise<void> {
    const studentRef = doc(db, 'classes', classCode, 'students', studentId);
    await updateDoc(studentRef, { handRaised });
    
    // Record in hand history
    await this.recordHandHistory(
      classCode,
      studentId,
      handRaised ? 'raised' : 'lowered',
      'student',
      null
    );
  }

  /**
   * Updates question status (pending/answered)
   */
  async updateQuestionStatus(classCode: string, questionId: string, status: 'pending' | 'answered'): Promise<void> {
    const questionRef = doc(db, 'classes', classCode, 'questions', questionId);
    if (status === 'answered') {
      await updateDoc(questionRef, { status, answeredAt: Timestamp.now() });
    } else {
      // revert to pending: remove answeredAt
      await updateDoc(questionRef, { status, answeredAt: deleteField() });
    }
  }

  /**
   * Updates a question with teacher's answer
   */
  async answerQuestion(classCode: string, questionId: string, answer: string, answeredBy: string): Promise<void> {
    const questionRef = doc(db, 'classes', classCode, 'questions', questionId);
    await updateDoc(questionRef, {
      answer,
      answeredBy,
      status: 'answered',
      answeredAt: Timestamp.now()
    });
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
      status: 'pending', // New questions start as pending
      isDeleted: false
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
          handRaised: data.handRaised,
          status: data.status || 'active'
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
        const isDeleted = !!data.isDeleted;
        if (isDeleted) return; // skip soft-deleted questions for all views
        questions.push({
          id: doc.id,
          text: data.text,
          studentId: data.studentId,
          createdAt: data.createdAt ? data.createdAt.toDate() : undefined,
          status: data.status || 'pending', // Default to 'pending' for backward compatibility
          isDeleted: false,
          answeredAt: data.answeredAt ? data.answeredAt.toDate() : undefined,
          answer: data.answer,
          answeredBy: data.answeredBy
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
  /**
   * Soft-delete a question by setting `isDeleted: true`.
   * This keeps the document for audit/history but hides it from all views.
   */
  async removeQuestion(classCode: string, questionId: string): Promise<void> {
    const questionRef = doc(db, 'classes', classCode, 'questions', questionId);
    await updateDoc(questionRef, { isDeleted: true });
  }

  /**
   * Gets all classes with their basic info
   */
  async getAllClasses(): Promise<any[]> {
    try {
      const classesRef = collection(db, 'classes');
      const snapshot = await (await import('firebase/firestore')).getDocs(classesRef);
      return snapshot.docs.map(doc => ({
        code: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : null,
        closeAt: doc.data().closeAt ? doc.data().closeAt.toDate() : null
      }));
    } catch (err) {
      console.error('Error fetching all classes:', err);
      return [];
    }
  }

  /**
   * Gets detailed statistics for a class
   */
  async getClassStatistics(classCode: string): Promise<any> {
    try {
      // Get class info
      const classData = await this.getClass(classCode);
      const classRef = doc(db, 'classes', classCode);
      const classSnap = await getDoc(classRef);
      const classFullData = classSnap.data() || {};

      // Get all students (including those who left)
      const studentsRef = collection(db, 'classes', classCode, 'students');
      const studentsSnap = await (await import('firebase/firestore')).getDocs(studentsRef);
      const allStudents = studentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Count ALL students who joined the class (whether they're still in or not)
      const totalStudentCount = allStudents.length;

      // Get questions
      const questionsRef = collection(db, 'classes', classCode, 'questions');
      const questionsSnap = await (await import('firebase/firestore')).getDocs(questionsRef);
      const questions = questionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : null
      })).filter((q: any) => !q.isDeleted);

      // Calculate hand raise statistics
      const handRaiseStats: {[studentId: string]: any} = {};
      for (const student of allStudents) {
        const handHistoryRef = collection(db, 'classes', classCode, 'students', student.id, 'handHistory');
        const handHistorySnap = await (await import('firebase/firestore')).getDocs(handHistoryRef);
        const handHistory = handHistorySnap.docs.map(doc => ({
          ...doc.data(),
          timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : null
        }));
        
        handRaiseStats[student.id] = {
          totalRaises: handHistory.filter((h: any) => h.action === 'raised').length,
          totalLowers: handHistory.filter((h: any) => h.action === 'lowered').length,
          handHistory
        };
      }

      // Calculate duration
      const createdAt = classFullData.createdAt ? classFullData.createdAt.toDate() : new Date();
      const closeAt = classFullData.closeAt ? classFullData.closeAt.toDate() : new Date();
      const durationMinutes = Math.round((closeAt.getTime() - createdAt.getTime()) / (1000 * 60));

      // Calculate total hand raises across all students
      const totalHandRaises = Object.values(handRaiseStats).reduce((sum: number, stats: any) => sum + stats.totalRaises, 0);

      return {
        code: classCode,
        name: classData?.name || 'Unknown Class',
        createdAt,
        closeAt,
        state: classFullData.state || 'open',
        durationMinutes,
        students: allStudents,
        totalStudents: totalStudentCount,
        totalHandRaises,
        questions,
        totalQuestions: questions.length,
        answeredQuestions: questions.filter((q: any) => q.status === 'answered').length,
        pendingQuestions: questions.filter((q: any) => q.status !== 'answered').length,
        handRaiseStats
      };
    } catch (err) {
      console.error('Error fetching class statistics:', err);
      return null;
    }
  }

  // (Removed onQuestionsUpdateForStudents) We now use `isDeleted` flag and
  // filter deleted questions in the primary onQuestionsUpdate so deleted
  // items won't appear in any client view by default. If you want teachers
  // to see deleted items later, we can add a separate listener that includes them.
}

// Export a singleton instance
export const firebaseService = new FirebaseService();