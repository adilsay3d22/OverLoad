import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateProgram from './pages/CreateProgram';
import CustomBuilder from './pages/CustomBuilder';
import Progress from './pages/Progress';
import RequireAuth from './components/RequireAuth';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/create-program"
        element={
          <RequireAuth>
            <CreateProgram />
          </RequireAuth>
        }
      />
      <Route
        path="/create-program/custom"
        element={
          <RequireAuth>
            <CustomBuilder />
          </RequireAuth>
        }
      />
      <Route
        path="/progress"
        element={
          <RequireAuth>
            <Progress />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
