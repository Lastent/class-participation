// Data models matching your Kotlin app structure

export interface Class {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  name: string;
  handRaised: boolean;
  status?: 'active' | 'removed';
}

export interface Question {
  id: string;
  text: string;
  studentId: string;
  createdAt?: Date; // Optional for backward compatibility
  // Keep status for pending/answered and add isDeleted flag for soft-deletes
  status?: 'pending' | 'answered'; // Optional for backward compatibility, defaults to 'pending'
  isDeleted?: boolean;
  answeredAt?: Date;
}

// Additional types for the React app
export type UserRole = 'teacher' | 'student';

export interface ClassData extends Class {
  code: string;
}