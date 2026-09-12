import { Suspense } from 'react';
import {
  BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigationType,
} from 'react-router-dom';
import { MotionConfig, motion, useReducedMotion } from 'motion/react';

import { AuthProvider, useAuth } from './state/AuthContext.jsx';
import { ProgramProvider, useProgram } from './state/ProgramContext.jsx';
import { RestTimerProvider } from './state/RestTimerContext.jsx';
import { ActiveSessionProvider } from './state/ActiveSessionContext.jsx';
import { TabBar } from './components/TabBar.jsx';
import { routeVariants } from './lib/motion.js';
import { RestTakeover, RestMiniTimer } from './components/RestTimer.jsx';
import { Wordmark } from './components/Brand.jsx';
import { Skeleton } from './components/ui.jsx';

import Welcome from './screens/Welcome.jsx';
import Login from './screens/Login.jsx';
import Signup from './screens/Signup.jsx';
import Home from './screens/Home.jsx';
import Programs from './screens/Programs.jsx';
import TemplateLibrary from './screens/TemplateLibrary.jsx';
import TemplateDetail from './screens/TemplateDetail.jsx';
import ProgramLibrary from './screens/ProgramLibrary.jsx';
import BuildProgram from './screens/BuildProgram.jsx';
import WeeksGrid from './screens/WeeksGrid.jsx';
import WeekEditor from './screens/WeekEditor.jsx';
import SessionEditor from './screens/SessionEditor.jsx';
import LogSessionSummary from './screens/LogSessionSummary.jsx';
import LogExerciseFocus from './screens/LogExerciseFocus.jsx';
import Progress from './screens/Progress.jsx';
import PRHistory from './screens/PRHistory.jsx';
import ExerciseDetail from './screens/ExerciseDetail.jsx';
import Profile from './screens/Profile.jsx';

/* -------------------------------------------------------------------------- */

function BootSplash() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-bg">
      <Wordmark />
      <Skeleton className="h-1.5 w-24" radius={999} />
    </div>
  );
}

function RequireAuth() {
  const { status } = useAuth();
  if (status === 'loading') return <BootSplash />;
  // No `state` here: Navigate re-runs its effect on every render, so a freshly
  // built state object would push a new location each pass and never settle.
  if (status !== 'authenticated') return <Navigate to="/welcome" replace />;
  return <Outlet />;
}

function RedirectIfAuthed({ children }) {
  const { status } = useAuth();
  if (status === 'loading') return <BootSplash />;
  if (status === 'authenticated') return <Navigate to="/home" replace />;
  return children;
}

/**
 * Real app chrome: one tab bar for every signed-in screen, mounted outside the
 * animated routes so navigating never unmounts it and the active indicator can
 * slide rather than re-enter. Only the onboarding screens go without.
 */
const CHROME_FREE = new Set(['/welcome', '/login', '/signup']);

function AppTabBar() {
  const { status } = useAuth();
  const { actionTarget } = useProgram();
  const { pathname } = useLocation();
  if (status !== 'authenticated' || CHROME_FREE.has(pathname)) return null;
  return <TabBar actionTarget={actionTarget} />;
}

/**
 * Push/pop feel without a native navigator. Direction carries hierarchy:
 * pushing deeper arrives from the right, popping back arrives from the left, so
 * block → week → session reads as movement instead of four identical fades.
 *
 * Deliberately no exit animation — gating unmount on one would stall
 * redirect-only routes, which is a re-render loop rather than a transition.
 */
function AnimatedRoutes() {
  const location = useLocation();
  const back = useNavigationType() === 'POP';
  const variants = routeVariants(back, useReducedMotion());
  return (
    <motion.div
        key={location.pathname}
        className="h-full"
        initial={variants.initial}
        animate={variants.animate}
      >
        <Routes location={location}>
          <Route path="/welcome" element={<RedirectIfAuthed><Welcome /></RedirectIfAuthed>} />
          <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
          <Route path="/signup" element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />

          <Route element={<RequireAuth />}>
            <Route path="/home" element={<Home />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/profile" element={<Profile />} />

            <Route path="/programs/templates" element={<TemplateLibrary />} />
            <Route path="/programs/templates/:templateId" element={<TemplateDetail />} />
            <Route path="/programs/new" element={<BuildProgram />} />
            <Route path="/programs/library" element={<ProgramLibrary />} />
            <Route path="/programs/:programId/weeks" element={<WeeksGrid />} />
            <Route path="/programs/:programId/weeks/:week" element={<WeekEditor />} />
            <Route
              path="/programs/:programId/weeks/:week/sessions/:sessionId"
              element={<SessionEditor />}
            />
            <Route path="/log/:programId/:week/:sessionId" element={<LogSessionSummary />} />
            <Route path="/log/:programId/:week/:sessionId/:index" element={<LogExerciseFocus />} />
            <Route path="/progress/prs" element={<PRHistory />} />
            <Route path="/progress/exercise/:key" element={<ExerciseDetail />} />
          </Route>

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </motion.div>
  );
}

/**
 * Mobile-first: the app owns the viewport. On a wide screen it sits as a phone
 * column beside a quiet brand panel rather than floating alone in the middle.
 */
function Shell({ children }) {
  return (
    <div className="flex min-h-[100dvh] justify-center bg-page lg:justify-start lg:gap-16 lg:px-16 lg:py-12">
      <aside className="hidden max-w-[520px] flex-1 flex-col justify-center pl-6 lg:flex">
        <Wordmark />
        <h1 className="mt-8 text-6xl leading-[0.98] font-bold tracking-tighter text-ink text-balance">
          Lift more than last week.
        </h1>
        <p className="mt-6 max-w-[46ch] text-base leading-relaxed font-medium text-ink-muted">
          Pick a program or build your own, log every set with weight, reps and the RPE you
          actually felt, and watch the numbers move. Overload is built for the phone in your
          pocket between sets.
        </p>
        <div className="mt-10 flex items-center gap-2.5 text-[13px] font-semibold text-ink-muted">
          <span className="size-2 rounded-full bg-accent" aria-hidden />
          160 exercises · 3 Jeff Nippard programs · RPE-aware logging
        </div>
      </aside>

      <main className="relative w-full max-w-[430px] shrink-0 lg:my-auto">
        <div className="relative h-[100dvh] overflow-hidden bg-bg lg:h-[880px] lg:max-h-[calc(100dvh-96px)] lg:rounded-[44px] lg:shadow-[0_40px_90px_-30px_rgba(20,21,15,0.35)]">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    // `reducedMotion="user"` makes every Motion component drop transform and
    // layout animation when the OS asks for it while keeping opacity and colour,
    // which is the behaviour reduced motion actually wants: fewer and gentler
    // animations, not silence. Before this only two components honoured the
    // setting, so the CSS feedback was suppressed while the large spatial JS
    // motion kept running — the opposite of the intent.
    <MotionConfig reducedMotion="user">
    <BrowserRouter>
      <AuthProvider>
        <ProgramProvider>
          <ActiveSessionProvider>
            <RestTimerProvider>
            <Shell>
              <Suspense fallback={<BootSplash />}>
                <AnimatedRoutes />
              </Suspense>
              <AppTabBar />
              <RestMiniTimer />
              <RestTakeover />
            </Shell>
            </RestTimerProvider>
          </ActiveSessionProvider>
        </ProgramProvider>
      </AuthProvider>
    </BrowserRouter>
    </MotionConfig>
  );
}
