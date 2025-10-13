# Classroom Interaction App - React Version# Getting Started with Create React App



A real-time classroom interaction tool that allows teachers and students to communicate effectively during class sessions. This is a React TypeScript version of your original Kotlin Android app.This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).



## Features## Available Scripts



### For TeachersIn the project directory, you can run:

- Create classes with unique 6-character codes

- Generate QR codes for easy student access### `npm start`

- Monitor students in real-time

- See who has their hand raisedRuns the app in the development mode.\

- View and manage student questionsOpen [http://localhost:3000](http://localhost:3000) to view it in the browser.

- Real-time updates without manual refresh

The page will reload if you make edits.\

### For StudentsYou will also see any lint errors in the console.

- Join classes using 6-character codes

- Raise/lower hand to get teacher's attention### `npm test`

- Submit questions to the teacher

- View their own submitted questionsLaunches the test runner in the interactive watch mode.\

- Simple and intuitive interfaceSee the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.



## Technology Stack### `npm run build`



- **Frontend**: React 18 with TypeScriptBuilds the app for production to the `build` folder.\

- **Database**: Firebase Firestore (real-time database)It correctly bundles React in production mode and optimizes the build for the best performance.

- **Styling**: CSS3 with modern responsive design

- **QR Codes**: react-qr-code libraryThe build is minified and the filenames include the hashes.\

- **Routing**: React Router v6Your app is ready to be deployed!



## Setup InstructionsSee the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.



### 1. Firebase Configuration### `npm run eject`



Before running the app, you need to set up Firebase:**Note: this is a one-way operation. Once you `eject`, you can’t go back!**



1. Go to [Firebase Console](https://console.firebase.google.com/)If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

2. Create a new project or use an existing one

3. Enable Firestore DatabaseInstead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

4. Go to Project Settings > General > Your apps

5. Add a web app and copy the configurationYou don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

6. Replace the placeholder values in `src/config/firebase.ts` with your actual Firebase config:

## Learn More

```typescript

const firebaseConfig = {You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

  apiKey: "your-actual-api-key",

  authDomain: "your-project-id.firebaseapp.com",To learn React, check out the [React documentation](https://reactjs.org/).

  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

### 2. Firestore Security Rules

Set up the following Firestore security rules for proper access control:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to classes and their subcollections
    match /classes/{classId} {
      allow read, write: if true;
      
      match /students/{studentId} {
        allow read, write: if true;
      }
      
      match /questions/{questionId} {
        allow read, write: if true;
      }
    }
  }
}
```

**Note**: These rules allow unrestricted access for simplicity. In production, implement proper authentication and authorization.

### 3. Install and Run

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

The app will open at `http://localhost:3000`

## Data Structure

The app uses the following Firestore structure:

```
classes/
  {classCode}/
    - id: string
    - name: string
    - createdAt: timestamp
    
    students/
      {studentId}/
        - id: string
        - name: string
        - handRaised: boolean
        - joinedAt: timestamp
    
    questions/
      {questionId}/
        - id: string
        - text: string
        - studentId: string
        - createdAt: timestamp
```

## How to Use

### As a Teacher:
1. Click "I'm a Teacher"
2. Enter a class name and click "Create Class"
3. Share the generated 6-character code with students
4. Optionally show the QR code for students to scan
5. Monitor student activity in real-time

### As a Student:
1. Click "I'm a Student"
2. Enter your name and the class code provided by the teacher
3. Click "Join Class"
4. Use "Raise Hand" to get attention
5. Use "Ask Question" to submit questions

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App (one-way operation)

## Differences from Kotlin Version

This React version maintains the same core functionality as your Kotlin app but includes some web-specific enhancements:

- **Responsive Design**: Works on desktop, tablet, and mobile browsers
- **URL-based Navigation**: Direct links to classes via URL
- **QR Code Generation**: Built-in QR code display for easy sharing
- **Real-time Updates**: Uses Firestore real-time listeners
- **Modern Web UI**: Clean, modern interface with smooth animations

## Next Steps

To enhance the app further, consider:

1. **Authentication**: Add user accounts and proper authentication
2. **Class History**: Store and retrieve past classes
3. **Advanced Features**: Polls, file sharing, breakout rooms
4. **Mobile App**: Convert to React Native for mobile apps
5. **Analytics**: Track engagement and participation metrics

## Troubleshooting

### Common Issues:

1. **Firebase errors**: Make sure your Firebase config is correct and Firestore is enabled
2. **Build errors**: Ensure all dependencies are installed with `npm install`
3. **Real-time updates not working**: Check Firestore security rules and network connection
4. **QR code not displaying**: Verify the react-qr-code package is installed

For more help, check the browser console for error messages.