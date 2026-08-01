import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateProgram from './pages/CreateProgram';
import CustomBuilder from './pages/CustomBuilder';
import Program from './pages/Program';
import WeeksGrid from './pages/WeeksGrid';
import SessionsForWeek from './pages/SessionsForWeek';
import SessionDetail from './pages/SessionDetail';
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
            <SessionsForWeek />
          </RequireAuth>
        }
      />
      <Route
        path="/program/sessions"
        element={
          <RequireAuth>
            <SessionsForWeek />
          </RequireAuth>
        }
      />
      <Route
        path="/program/session/:phaseIndex/:sessionIndex"
        element={
          <RequireAuth>
            <SessionDetail />
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
