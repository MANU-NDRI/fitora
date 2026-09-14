export function SimpleBarChart({
  data,
  formatValue,
}: {
  data: { label: string; value: number }[];
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex h-48 items-end gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-[10px] text-fitora-gray">
            {formatValue ? formatValue(d.value) : d.value}
          </span>
          <div
            className="w-full rounded-t-md bg-fitora-green/80 transition-all"
            style={{ height: `${Math.max(4, (d.value / max) * 130)}px` }}
          />
          <span className="text-[10px] text-fitora-gray-dim">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
