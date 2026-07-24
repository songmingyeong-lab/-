"use client";

import { useRouter } from "next/navigation";

interface AreaOption {
  slug: string;
  label: string;
}

export function AreaSelector({ areas, selected }: { areas: AreaOption[]; selected: string }) {
  const router = useRouter();
  return (
    <label className="area-selector">
      <span>행정동 선택</span>
      <select
        aria-label="행정동 선택"
        value={selected}
        onChange={(event) => router.push(`/?area=${encodeURIComponent(event.target.value)}`)}
      >
        {areas.map((area) => <option key={area.slug} value={area.slug}>{area.label}</option>)}
      </select>
    </label>
  );
}
