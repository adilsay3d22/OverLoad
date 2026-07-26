import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateProgram from './pages/CreateProgram';
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
