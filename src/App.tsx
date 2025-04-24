import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import './App.css'
import Ask from './components/Ask'
import FaceOff from './components/FaceOff';
import Math from './components/Math';

function App() {



  return (
    <Router>
    <div >
      {/* Navigation Tabs */}
      <nav className="flex flex-start text-[25px] xl ml-10 space-x-8 p-2.5 mb">
        <Link to="/ask" className="text-blue-500 hover:underline hover:text-blue-700">
          Curio
        </Link>
        <Link to="/FaceOff" className="text-blue-500 hover:underline">
          DialExa
        </Link>
        <Link to="/math" className="text-blue-500 hover:underline">
          Math
        </Link>
      </nav>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Ask/>} />
        <Route path="/ask" element={<Ask/>} />
        <Route path="/FaceOff" element={<FaceOff />} />
        <Route path="/math" element={<Math />} />
      </Routes>
    </div>
  </Router>
  )
};

export default App
