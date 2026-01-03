import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ConsoleApp from './ConsoleApp';
import DcaPortal from './components/DcaPortal';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<ConsoleApp />} />
                <Route path="/dca" element={<DcaPortal />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
