import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import InputForm from './pages/InputForm'
import Results from './pages/Results'
import DiseaseDetection from './pages/DiseaseDetection'
import Advisory from './pages/Advisory'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/predict" element={<InputForm />} />
        <Route path="/input" element={<InputForm />} />
        <Route path="/results" element={<Results />} />
        <Route path="/advisory" element={<Advisory />} />
        <Route path="/disease" element={<DiseaseDetection />} />
      </Routes>
    </Router>
  )
}

export default App
