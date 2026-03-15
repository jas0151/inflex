interface StatsCardProps {
  label: string;
  value: number;
  icon: string;
  color: string;
}

export default function StatsCard({ label, value, icon, color }: StatsCardProps) {
  return (
    <div className="bg-white border border-rule rounded-lg p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted font-medium">{label}</p>
          <p className="mt-1 text-3xl font-bold text-ink font-mono">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );
}
