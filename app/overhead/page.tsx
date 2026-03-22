import { prisma } from "../lib/prisma";
import { OverheadEditor } from "../components/OverheadEditor";
import { totalMonthlyOverhead, type OverheadRow } from "../lib/pricing";

export default async function OverheadPage() {
  const overheadCosts = await prisma.$queryRawUnsafe<OverheadRow[]>(
    `SELECT id, name, amount, period, notes, active FROM OverheadCost ORDER BY name`,
  );

  type ProfileRow = {
    id: number;
    name: string;
    estimatedUnitsPerMonth: number | null;
  };
  const profiles = await prisma.$queryRawUnsafe<ProfileRow[]>(
    `SELECT id, name, estimatedUnitsPerMonth FROM PricingProfile`,
  );

  const profile = profiles[0] || { id: 0, name: "Default", estimatedUnitsPerMonth: 50 };
  const monthlyTotal = totalMonthlyOverhead(overheadCosts.filter((c) => Boolean(c.active)));
  const perUnit = profile.estimatedUnitsPerMonth && profile.estimatedUnitsPerMonth > 0
    ? monthlyTotal / profile.estimatedUnitsPerMonth
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overhead Costs</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Manage fixed monthly costs and production volume estimates
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="stat-card">
          <div className="stat-value text-lg">AU${monthlyTotal.toFixed(2)}</div>
          <div className="stat-label">Total Monthly Overhead</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-lg">{profile.estimatedUnitsPerMonth || "—"}</div>
          <div className="stat-label">Estimated Units/Month</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-lg" style={{ color: perUnit > 5 ? "#ef4444" : "var(--color-accent)" }}>
            AU${perUnit.toFixed(2)}
          </div>
          <div className="stat-label">Overhead per Unit</div>
          {perUnit > 5 && (
            <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
              ⚠️ Too high! Increase production estimate
            </p>
          )}
        </div>
      </div>

      <OverheadEditor
        overheadCosts={overheadCosts}
        profileId={profile.id}
        estimatedUnitsPerMonth={profile.estimatedUnitsPerMonth}
      />
    </div>
  );
}
