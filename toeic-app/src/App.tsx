import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { QuizSession } from "./components/Quiz/QuizSession";
import { ReviewSession } from "./components/Review/ReviewSession";
import { DiagnosisTest } from "./components/Diagnosis/DiagnosisTest";
import "./index.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-white">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/quiz/:session" element={<QuizSession />} />
          <Route path="/review" element={<ReviewSession />} />
          <Route path="/diagnosis" element={<DiagnosisTest />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
