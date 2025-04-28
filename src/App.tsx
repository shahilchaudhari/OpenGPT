import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import './App.css'
import Curio from "./components/Curio";
import DialExa from "./components/DialExa";
import MathWiz from "./components/MathWize";

function App() {



  return (
    <Router>
    <div >
      {/* Navigation Tabs */}
      <nav className="flex flex-start text-[25px] xl ml-10 space-x-8 p-2.5 mb">
        <Link to="/Curio" className="text-blue-500 hover:underline hover:text-blue-700">
          Curio
        </Link>
        <Link to="/Dialexa" className="text-blue-500 hover:underline">
          DialExa
        </Link>
        <Link to="/MathWiz" className="text-blue-500 hover:underline">
          MathWiz
        </Link>
      </nav>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Curio/>} />
        <Route path="/Curio" element={<Curio/>} />
        <Route path="/DialExa" element={<DialExa />} />
        <Route path="/MathWiz" element={<MathWiz />} />
      </Routes>
    </div>
  </Router>
  )
};

export default App
