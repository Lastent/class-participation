import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

const RoleSelection = lazy(() => import('./components/RoleSelection/RoleSelection'));
const CreateClass = lazy(() => import('./components/CreateClass/CreateClass'));
const JoinClass = lazy(() => import('./components/JoinClass/JoinClass'));
const TeacherClass = lazy(() => import('./components/TeacherClass/TeacherClass'));
const StudentClass = lazy(() => import('./components/StudentClass/StudentClass'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard/AdminDashboard'));

function App() {
  return (
    <Router>
      <div className="App">
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<RoleSelection />} />
            <Route path="/create-class" element={<CreateClass />} />
            <Route path="/join-class" element={<JoinClass />} />
            <Route path="/teacher/:classCode" element={<TeacherClass />} />
            <Route path="/student/:classCode" element={<StudentClass />} />
            <Route path="/join/:classCode" element={<JoinClass />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
