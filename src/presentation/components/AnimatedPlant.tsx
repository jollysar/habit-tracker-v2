import { useId } from "react";
import type { PlantType } from "../../domain/habits/models";
import { cn } from "../../lib/cn";

export type PlantGrowthStage = 0 | 1 | 2 | 3 | 4;

interface AnimatedPlantProps {
  readonly plantType?: PlantType;
  readonly streak?: number;
  readonly stage?: PlantGrowthStage;
  readonly size?: number;
  readonly className?: string;
}

export const plantChoices: ReadonlyArray<{
  readonly id: PlantType;
  readonly label: string;
  readonly description: string;
}> = [
  { id: "oak", label: "Meadow oak", description: "Round, leafy and sturdy" },
  { id: "pine", label: "Mountain pine", description: "Tall, calm and evergreen" },
  { id: "cherry", label: "Cherry blossom", description: "Soft pink spring blooms" },
];

export function plantStageForStreak(streak: number): PlantGrowthStage {
  if (streak <= 0) return 0;
  if (streak <= 2) return 1;
  if (streak <= 6) return 2;
  if (streak <= 13) return 3;
  return 4;
}

export function plantStageLabel(stage: PlantGrowthStage): string {
  return ["Planted", "Sprouting", "Growing", "Sapling", "Flourishing"][stage];
}

function EarlyGrowth({ stage, plantType }: { readonly stage: 1 | 2; readonly plantType: PlantType }) {
  const leaf = plantType === "pine" ? "#3f8b62" : plantType === "cherry" ? "#f49ab5" : "#67b867";
  return (
    <g className="plant-sprout">
      <path d={stage === 1 ? "M32 53 C32 48 32 44 31 40" : "M32 53 C31 46 33 38 32 31"} fill="none" stroke="#6f8f45" strokeWidth={stage === 1 ? 2.5 : 3.2} strokeLinecap="round" />
      <ellipse className="plant-leaf" cx="27.5" cy={stage === 1 ? 43 : 38} rx={stage === 1 ? 4.5 : 6} ry={stage === 1 ? 2.6 : 3.2} transform={`rotate(28 27.5 ${stage === 1 ? 43 : 38})`} fill={leaf} />
      <ellipse className="plant-leaf plant-leaf-delay" cx="36.5" cy={stage === 1 ? 40 : 34} rx={stage === 1 ? 4.2 : 5.8} ry={stage === 1 ? 2.4 : 3.1} transform={`rotate(-30 36.5 ${stage === 1 ? 40 : 34})`} fill={leaf} />
      {stage === 2 && (
        <>
          <ellipse className="plant-leaf" cx="27" cy="31" rx="5" ry="2.8" transform="rotate(35 27 31)" fill={leaf} opacity=".9" />
          {plantType === "cherry" && <circle className="plant-leaf plant-leaf-delay" cx="34" cy="27" r="3.2" fill="#ffc1d2" />}
          {plantType === "pine" && <path d="M32 29 27 37h10Z" fill="#2f7650" />}
        </>
      )}
    </g>
  );
}

function OakTree({ mature }: { readonly mature: boolean }) {
  return (
    <g className="plant-character">
      <path d={mature ? "M29 54c2-10 1-20 4-31 2 11 1 21 3 31Z" : "M30 54c1-8 1-15 3-23 2 8 1 16 3 23Z"} fill="#8b5a35" />
      <path d="M32 39 23 31M34 36l8-8" stroke="#79502f" strokeWidth="2.6" strokeLinecap="round" />
      <g className="plant-canopy">
        <circle cx="32" cy={mature ? 20 : 27} r={mature ? 12 : 9} fill="#58a95d" />
        <circle className="plant-leaf" cx={mature ? 22 : 25} cy={mature ? 25 : 29} r={mature ? 9 : 6.5} fill="#3d914f" />
        <circle className="plant-leaf plant-leaf-delay" cx={mature ? 43 : 40} cy={mature ? 25 : 29} r={mature ? 9.5 : 6.5} fill="#75c66f" />
        <circle cx="34" cy={mature ? 29 : 33} r={mature ? 10 : 7} fill="#4ca45a" />
        {mature && <circle className="plant-leaf" cx="27" cy="15" r="7.5" fill="#82cf78" />}
      </g>
    </g>
  );
}

function PineTree({ mature }: { readonly mature: boolean }) {
  return (
    <g className="plant-character">
      <path d={mature ? "M30 55 32 17l3 38Z" : "M30 55 32 25l3 30Z"} fill="#8a5b38" />
      <g className="plant-canopy">
        <path d={mature ? "M32 8 19 29h26Z" : "M32 18 22 35h20Z"} fill="#2f7650" />
        <path className="plant-leaf" d={mature ? "M32 17 15 41h34Z" : "M32 26 19 44h26Z"} fill="#3e9360" />
        <path className="plant-leaf plant-leaf-delay" d={mature ? "M32 28 11 52h42Z" : "M32 36 17 53h30Z"} fill="#28704b" />
        {mature && <path d="M32 7 29 13h6Z" fill="#86c96e" />}
      </g>
    </g>
  );
}

function CherryTree({ mature }: { readonly mature: boolean }) {
  const clusters = mature
    ? [[21, 22, 8], [30, 16, 9], [42, 21, 9], [35, 28, 9], [24, 31, 7]]
    : [[26, 27, 7], [35, 23, 8], [41, 31, 6], [30, 34, 7]];
  return (
    <g className="plant-character">
      <path d={mature ? "M28 54c5-10 2-20 6-30 0 7 2 11 5 16-4-3-5-5-6-8 0 8 1 15 4 22Z" : "M29 54c4-8 2-15 5-23 0 7 2 11 5 14-3-2-5-4-6-7 0 6 1 11 3 16Z"} fill="#986044" />
      <path d="M33 39 23 29M35 34l9-8" stroke="#87533d" strokeWidth="2.4" strokeLinecap="round" />
      <g className="plant-canopy">
        {clusters.map(([cx, cy, r], index) => (
          <g key={`${cx}-${cy}`} className={index % 2 ? "plant-leaf plant-leaf-delay" : "plant-leaf"}>
            <circle cx={cx} cy={cy} r={r} fill={index % 2 ? "#f29ab7" : "#ffc1d2"} />
            <circle cx={cx - 2} cy={cy - 2} r={r * .45} fill="#ffd9e4" opacity=".75" />
          </g>
        ))}
      </g>
    </g>
  );
}

export function AnimatedPlant({
  plantType = "oak",
  streak = 0,
  stage: explicitStage,
  size = 48,
  className,
}: AnimatedPlantProps) {
  const stage = explicitStage ?? plantStageForStreak(streak);
  const soilGradient = useId().replace(/:/g, "");

  return (
    <svg
      className={cn("animated-plant overflow-visible", className)}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      data-growth-stage={stage}
      data-plant-type={plantType}
    >
      <defs>
        <linearGradient id={soilGradient} x1="20" y1="49" x2="45" y2="59" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b87842" />
          <stop offset="1" stopColor="#75482e" />
        </linearGradient>
      </defs>
      <ellipse className="plant-soil-shadow" cx="32" cy="57" rx={stage === 0 ? 13 : 17} ry={stage === 0 ? 4 : 4.8} fill="#18251b" opacity=".1" />
      <path d={stage === 0 ? "M19 55c4-7 22-7 26 0-6 4-20 4-26 0Z" : "M15 55c6-7 28-7 34 0-8 5-26 5-34 0Z"} fill={`url(#${soilGradient})`} />
      <path d="M20 54c6-3 18-4 25 0" stroke="#d29a62" strokeWidth="1.7" strokeLinecap="round" opacity=".75" />
      <g key={`${plantType}-${stage}`} className="plant-growth">
        {stage === 0 && (
          <g className="plant-seed">
            <ellipse cx="32" cy="51" rx="3.4" ry="2.2" transform="rotate(-14 32 51)" fill="#e3b95f" />
            <path d="M32 51c1-2 2-3 4-4" stroke="#f5d88a" strokeWidth="1" strokeLinecap="round" />
          </g>
        )}
        {(stage === 1 || stage === 2) && <EarlyGrowth stage={stage} plantType={plantType} />}
        {stage >= 3 && plantType === "oak" && <OakTree mature={stage === 4} />}
        {stage >= 3 && plantType === "pine" && <PineTree mature={stage === 4} />}
        {stage >= 3 && plantType === "cherry" && <CherryTree mature={stage === 4} />}
        {stage === 4 && (
          <g className="plant-sparkles" fill="#f7c948">
            <circle cx="10" cy="24" r="1.5" />
            <circle cx="53" cy="17" r="1.2" />
            <path d="M51 36h4M53 34v4" stroke="#f7c948" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        )}
      </g>
    </svg>
  );
}
