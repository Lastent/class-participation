import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoleSelection from './components/RoleSelection/RoleSelection';
import CreateClass from './components/CreateClass/CreateClass';
import JoinClass from './components/JoinClass/JoinClass';
import TeacherClass from './components/TeacherClass/TeacherClass';
import StudentClass from './components/StudentClass/StudentClass';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<RoleSelection />} />
          <Route path="/create-class" element={<CreateClass />} />
          <Route path="/join-class" element={<JoinClass />} />
          <Route path="/teacher/:classCode" element={<TeacherClass />} />
          <Route path="/student/:classCode" element={<StudentClass />} />
          <Route path="/join/:classCode" element={<JoinClass />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
