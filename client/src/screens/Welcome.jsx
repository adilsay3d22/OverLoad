import { Link, useNavigate } from 'react-router-dom';
import { DumbbellGlyph } from '../components/Brand.jsx';
import { ClimbPattern } from '../components/ClimbPattern.jsx';
import { PillButton } from '../components/ui.jsx';

/**
 * The pre-auth entry screen.
 *
 * Composition follows the reference the user supplied: a pattern field holding
 * the mark, then a quiet sheet carrying the words, one action, and the link for
 * people who already have an account. The field does the talking so the type
 * does not have to, which is what lets everything below it stay small.
 *
 * The pattern is authored, not decorative — every stroke in it climbs, which is
 * the product's whole claim. See ClimbPattern for what was taken from the
 * reference art and what was deliberately changed.
 *
 * The headline still loads rather than sets: Outfit is a variable face here, so
 * weight runs 300 to 800 while tracking tightens. That is the route's only
 * motion, and it is reduced-motion gated in index.css.
 *
 * Two things the previous version shipped are gone for good: three dots that
 * implied a carousel which does not exist, and a "+7.5kg" badge that presented
 * a fabricated training result as real. The three counts below are the only
 * numbers here and each is true of what ships — exercises.json holds 160
 * entries, templates.json holds 4 programs, each 8 weeks long.
 */
export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col overflow-y-auto overscroll-contain bg-bg">
      <div className="flex min-h-full flex-col">
        {/* The field. A fixed share of the viewport, so the sheet below always
            clears the fold on a short phone. */}
        <div className="relative h-[48%] min-h-[260px] shrink-0 overflow-hidden rounded-b-[32px] bg-surface">
          <ClimbPattern className="absolute inset-0 size-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-[82px] items-center justify-center rounded-full bg-ink text-surface shadow-raised">
              <DumbbellGlyph size={38} />
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-[26px] pb-10">
          <div className="min-h-7 flex-1" />

          <h1 className="load-weight text-center text-[34px] leading-[1.08] text-ink">
            Lift more than last week.
          </h1>

          <p className="mx-auto mt-4 max-w-[300px] text-center text-[14px] leading-[1.55] font-medium text-ink-muted">
            Follow a program, log every set with the RPE it actually felt like, and watch the
            numbers move.
          </p>

          <div className="min-h-7 flex-1" />

          <p
            className="mb-5 text-center text-[10px] leading-none font-semibold text-ink-muted uppercase"
            style={{ letterSpacing: '0.14em' }}
          >
            {/* Each fact holds together; only the separators may break. */}
            <span className="whitespace-nowrap">160 exercises</span>
            <span aria-hidden> · </span>
            <span className="whitespace-nowrap">4 programs</span>
            <span aria-hidden> · </span>
            <span className="whitespace-nowrap">8 weeks each</span>
          </p>

          <PillButton onClick={() => navigate('/signup')}>Create account</PillButton>

          <p className="mt-[18px] text-center text-[13px] font-medium text-ink-muted">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-bold text-ink underline decoration-line-strong decoration-2 underline-offset-[3px] hover:decoration-accent"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
