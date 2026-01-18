import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "@radix-ui/react-label";
import { toast } from "react-toastify";

const ScannerPage = () => {
  const [scanData, setScanData] = useState("");
  const [manualRegNo, setManualRegNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);

  const studentInfoRef = useRef(null);


  const regNo = manualRegNo || scanData;

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-fetch student when regNo changes
  useEffect(() => {
    if (regNo && regNo.length >= 3) {
      fetchStudent();
    }
  }, [regNo]);

  useEffect(() => {
  if (studentInfo && studentInfoRef.current) {
    requestAnimationFrame(() => {
      studentInfoRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      // fallback
      window.scrollTo({
        top: studentInfoRef.current.offsetTop - 20,
        behavior: "smooth",
      });
    });
  }
}, [studentInfo]);



  // QR Scanner
  const handleQRUpdate = (err, result) => {
    if (result && result.text !== scanData) {
      setScanData(result.text);
      // Haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
    }
  };

  // Fetch student info
  const fetchStudent = async () => {
    if (!regNo) return;
    setLoading(true);
    try {
      const studentRef = doc(db, "students", regNo);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) {
        toast.error("Student not found", {
          position: isMobile ? "top-center" : "top-right",
          autoClose: 3000,
        });
        setStudentInfo(null);
      } else {
        setStudentInfo({ id: studentSnap.id, ...studentSnap.data() });
        // Success haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 50, 50]);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching student info", {
        position: isMobile ? "top-center" : "top-right",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEntry = async () => {
    if (!studentInfo) return;
    setLoading(true);
    try {
      const studentRef = doc(db, "students", regNo);
      const currentTime = new Date().toLocaleString();

      await updateDoc(studentRef, {
        logs: arrayUnion({
          action: "Entry",
          time: currentTime,
          timestamp: new Date(),
        }),
      });

      const logsRef = collection(db, "allLogged");
      await setDoc(doc(logsRef, `${regNo}_${Date.now()}`), {
        name: studentInfo.name,
        registrationNo: regNo,
        action: "Entry",
        time: currentTime,
        timestamp: new Date(),
        exit: null,
        exitTimestamp: null,
      });

      toast.success(`✅ Entry marked for ${studentInfo.name}`, {
        position: isMobile ? "top-center" : "top-right",
        autoClose: 2000,
      });
      
      // Success haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Error marking entry", {
        position: isMobile ? "top-center" : "top-right",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExit = async () => {
    if (!studentInfo) return;
    setLoading(true);
    try {
      const studentRef = doc(db, "students", regNo);
      const logsRef = collection(db, "allLogged");
      const logsQuery = query(logsRef, orderBy("timestamp", "desc"), limit(50));
      const logsSnap = await getDocs(logsQuery);

      let lastEntryLog = null;
      logsSnap.forEach((doc) => {
        const log = doc.data();
        if (log.registrationNo === regNo && log.action === "Entry" && log.exit === null) {
          lastEntryLog = { id: doc.id, ...log };
        }
      });

      if (!lastEntryLog) {
        toast.error("No active entry found for this student", {
          position: isMobile ? "top-center" : "top-right",
        });
        setLoading(false);
        return;
      }

      const exitTime = new Date().toLocaleString();

      await updateDoc(studentRef, {
        logs: arrayUnion({
          action: "Exit",
          time: exitTime,
          timestamp: new Date(),
        }),
      });

      await updateDoc(doc(logsRef, lastEntryLog.id), {
        exit: exitTime,
        exitTimestamp: new Date(),
      });

      toast.success(`🚪 Exit marked for ${studentInfo.name}`, {
        position: isMobile ? "top-center" : "top-right",
        autoClose: 2000,
      });
      
      // Success haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Error marking exit", {
        position: isMobile ? "top-center" : "top-right",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setScanData("");
    setManualRegNo("");
    setStudentInfo(null);
    setScannerActive(true);
  };

  const toggleScanner = () => {
    setScannerActive(!scannerActive);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-2 px-2 sm:px-4">
      <div className="max-w-md mx-auto space-y-4">
        
        {/* Header */}
        <div className="text-center py-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Student Scanner</h1>
          <p className="text-sm text-gray-600">Scan QR or enter manually</p>
        </div>

        {/* QR Scanner Card */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">QR Scanner</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleScanner}
                className="text-xs px-3 py-1"
              >
                {scannerActive ? "Pause" : "Resume"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {scannerActive ? (
              <div className="relative">
                <div className="rounded-lg overflow-hidden border-2 border-gray-200">
                  <BarcodeScannerComponent
                    width="100%"
                    height={isMobile ? 250 : 300}
                    onUpdate={handleQRUpdate}
                    facingMode="environment"
                    torch={false}
                    className="w-full"
                  />
                </div>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-blue-500 rounded-lg border-dashed"></div>
                </div>
              </div>
            ) : (
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400 text-4xl mb-2">📷</div>
                  <p className="text-gray-500">Scanner paused</p>
                  <Button onClick={toggleScanner} className="mt-2" size="sm">
                    Resume Scanner
                  </Button>
                </div>
              </div>
            )}
            
            <div className="mt-3 text-center">
              {scanData ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                  <p className="text-green-800 text-sm font-medium">
                    📱 Scanned: <span className="font-mono">{scanData}</span>
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Position QR code within the frame</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Manual Entry Card */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-center">Manual Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="regNo" className="text-sm font-medium text-gray-700">
                Registration Number
              </Label>
              <Input
                id="regNo"
                value={manualRegNo}
                onChange={(e) => setManualRegNo(e.target.value.toUpperCase())}
                placeholder="Enter registration number"
                className="text-center text-lg font-mono h-12 border-2 focus:border-blue-500"
                autoComplete="off"
                inputMode="text"
              />
            </div>
            
            {loading && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Info Card */}
        {studentInfo && (
          
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm animate-in slide-in-from-bottom duration-300">
            <div ref={studentInfoRef}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-center text-green-700">
                 Student Found
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-3">
                {studentInfo.imageUrl && (
                  <div className="flex justify-center">
                    <img
                      src={studentInfo.imageUrl}
                      alt={studentInfo.name}
                      className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white shadow-lg"
                      loading="lazy"
                    />
                  </div>
                )}
                
                <div className="space-y-2 text-left bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Name:</span>
                    <span className="font-semibold text-gray-800">{studentInfo.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Branch:</span>
                    <span className="font-semibold text-gray-800">{studentInfo.branch}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Reg No:</span>
                    <span className="font-mono font-semibold text-gray-800">{studentInfo.id}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={handleEntry}
                  disabled={loading}
                  className="h-12 text-base font-semibold bg-green-600 hover:bg-green-700 active:scale-95 transition-all duration-150"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing</span>
                    </div>
                  ) : (
                    <> Mark Entry</>
                  )}
                </Button>
                <Button
                  onClick={handleExit}
                  disabled={loading}
                  variant="destructive"
                  className="h-12 text-base font-semibold bg-red-600 hover:bg-red-700 active:scale-95 transition-all duration-150"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing</span>
                    </div>
                  ) : (
                    <> Mark Exit</>
                  )}
                </Button>
              </div>

              {/* Reset Button */}
              <Button
                onClick={resetForm}
                variant="outline"
                className="w-full mt-3 h-10 active:scale-95 transition-all duration-150"
              >
                🔄 Scan Another
              </Button>
            </CardContent>
            </div>
          </Card>
        )}

        {/* Current Status Indicator */}
        <div className="text-center text-xs text-gray-500 pb-2">
          {regNo ? `Current: ${regNo}` : "Ready to scan..."}
        </div>
      </div>
    </div>
  );
};

export default ScannerPage;