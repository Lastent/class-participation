// Data models matching your Kotlin app structure

export interface Class {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  name: string;
  handRaised: boolean;
}

export interface Question {
  id: string;
  text: string;
  studentId: string;
  createdAt?: Date; // Optional for backward compatibility
  status?: 'pending' | 'answered'; // Optional for backward compatibility, defaults to 'pending'
}

// Additional types for the React app
export type UserRole = 'teacher' | 'student';

export interface ClassData extends Class {
  code: string;
}