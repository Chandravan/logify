import React, { useState } from "react";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBIgWKE904al1DGYARgfxFjrmzwBjRlT3I",
  authDomain: "hostel-34e6a.firebaseapp.com",
  projectId: "hostel-34e6a",
  storageBucket: "hostel-34e6a.firebasestorage.app",
  messagingSenderId: "307307582358",
  appId: "1:307307582358:web:8a71a413663933bd38c3b7",
  measurementId: "G-8N9VEWS14W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function Home() {
  const [registrationNo, setRegistrationNo] = useState("");
  const [studentInfo, setStudentInfo] = useState(null);
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle QR code scan
  const handleQRUpdate = async (err, result) => {
    if (result) {
      console.log("QR Result:", result);
      const qrData = result.text;
      setRegistrationNo(qrData);
      fetchStudentData(qrData);
    } else {
      setMessage("Invalid QR Code");
    }
  };

  // Fetch student data and logs from Firebase
  const fetchStudentData = async (regNo) => {
    setMessage("");
    setStudentInfo(null);
    setLogs([]);
    setLoading(true);

    try {
      const studentDocRef = doc(db, "students", regNo);
      const studentDoc = await getDoc(studentDocRef);

      if (studentDoc.exists()) {
        setStudentInfo(studentDoc.data());

        // Fetch logs
        const logsRef = collection(db, `students/${regNo}/logs`);
        const logsSnapshot = await getDocs(logsRef);
        const logsData = [];
        logsSnapshot.forEach((log) => logsData.push(log.data()));
        setLogs(logsData);
      } else {
        setMessage("No student found with this registration number.");
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
      setMessage("Error fetching student details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle entry log (log-in)
  const handleEntry = async () => {
    if (!studentInfo) return;
    const entryTime = new Date().toLocaleString();
    const logRef = collection(db, `students/${registrationNo}/logs`);
    await setDoc(doc(logRef), {
      entry: entryTime,
    });

      // Log entry in the global 'allLogged' collection
      await setDoc(doc(db, "allLogged", `${registrationNo}_${entryTime}`), {
        regNo: registrationNo,
        entry: entryTime,
        timestamp: new Date(), // Add timestamp for ordering
      });

    setLogs((prevLogs) => [...prevLogs, { entry: entryTime }]);

     // Show success toast notification
     toast.success("Successfully logged in!");
     setLoading(false);

     // Reload the page after successful login
     setTimeout(() => {
      window.location.reload();
    }, 2000);  // Delay of 2 second before reloading
  
  };

  // Handle exit log (log-out)
  const handleExit = async () => {
    if (!studentInfo) return;
    const exitTime = new Date().toLocaleString();

    //Get the last log document
    const logRef = collection(db, `students/${registrationNo}/logs`);
    const logDoc = await getDocs(logRef);
    const logDocRef = logDoc.docs[logDoc.size - 1]; // Update the last log entry
    await updateDoc(logDocRef.ref, {
      exit: exitTime,
    });

     // Log exit in the global 'allLogged' collection
     await setDoc(doc(db, "allLogged", `${registrationNo}_${exitTime}`), {
      regNo: registrationNo,
      exit: exitTime,
      timestamp: new Date(), // Add timestamp for ordering
    });
    
    setLogs((prevLogs) =>
      prevLogs.map((log, index) =>
        index === prevLogs.length - 1 ? { ...log, exit: exitTime } : log
      )
    );

     // Show success toast notification
     toast.success("Successfully logged out!");

     setLoading(false);
  // Delay the page reload to allow the toast to show
     setTimeout(() => {
      window.location.reload();
    }, 2000);  // Delay of 2 second before reloading
  };

  return (
    <div className="container">
      <div className="scanner-container">
        <BarcodeScannerComponent
          width={500}
          height={500}
          onUpdate={handleQRUpdate}
          facingMode="user"
        />
      </div>
      <div className="student-details-container">
        <h1>Student Details</h1>
        {loading && <p>Loading...</p>}
        {message && <p>{message}</p>}
        {studentInfo && (
          <div style={{ marginTop: "20px" }}>
            <h2>Student Details</h2>
            {studentInfo.imageUrl && (
      <img
        src={studentInfo.imageUrl}
        alt="Student"
        style={{ width: "350px", height: "350px", borderRadius: "90%", marginBottom: "10px" }}
      />
    )}
            <p>
              <strong>Name:</strong> {studentInfo.name}
            </p>
            <p>
              <strong>Branch:</strong> {studentInfo.branch}
            </p>
            <div>
              <button onClick={handleEntry} style={{ margin: "5px" }}>
                Log In
              </button>
              <button onClick={handleExit} style={{ margin: "5px" }}>
                Log Out
              </button>
            </div>
          </div>
        )}
        {logs.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <h2>Logs</h2>
            <ul>
              {logs.map((log, index) => (
                <li key={index}>
                  <strong>Entry:</strong> {log.entry || "N/A"} <br />
                  <strong>Exit:</strong> {log.exit || "N/A"}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Toast container for notifications */}
        <ToastContainer />
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;