import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateProgram from './pages/CreateProgram';
import CustomBuilder from './pages/CustomBuilder';
import Program from './pages/Program';
import WeeksGrid from './pages/WeeksGrid';
import WeekEditor from './pages/WeekEditor';
import SessionEditor from './pages/SessionEditor';
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
        path="/program"
        element={
          <RequireAuth>
            <Program />
          </RequireAuth>
        }
      />
      <Route
        path="/program/weeks"
        element={
          <RequireAuth>
            <WeeksGrid />
          </RequireAuth>
        }
      />
      <Route
        path="/program/week/:weekNumber"
        element={
          <RequireAuth>
            <WeekEditor />
          </RequireAuth>
        }
      />
      <Route
        path="/program/week/:weekNumber/session/:day"
        element={
          <RequireAuth>
            <SessionEditor />
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
