import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CloudAngledRainIcon,
  PulseIcon,
  FireIcon,
  MountainIcon,
  ChevronRightIcon,
} from "@hugeicons/core-free-icons";

export default function LandingHazards() {
  const hazards = [
    {
      icon: CloudAngledRainIcon,
      title: "Flooding",
      description:
        "Learn how to prepare your home, which evacuation routes to use, and what to do during and after a flood.",
      local: "Typhoon and monsoon rain can still flood low-lying barangays.",
      header: "bg-blue-700",
      accent: "text-blue-700",
      border: "border-blue-200",
    },
    {
      icon: PulseIcon,
      title: "Earthquake",
      description:
        "Learn drop, cover and hold, how to stay safe while the ground shakes, and what to check once it stops.",
      local: "The July 1990 Luzon earthquake (magnitude 7.8) shook all of Central Luzon, a year before Pinatubo erupted.",
      header: "bg-stone-700",
      accent: "text-stone-700",
      border: "border-stone-300",
    },
    {
      icon: FireIcon,
      title: "Fire",
      description:
        "Learn how to prevent fires at home, get everyone out safely, and help your barangay respond.",
      local: "March is Fire Prevention Month in the Philippines, as the dry season begins.",
      header: "bg-orange-700",
      accent: "text-orange-700",
      border: "border-orange-200",
    },
  ];

  return (
    <section id="hazards" className="scroll-mt-20 py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="max-w-xl text-4xl font-extrabold tracking-tight text-gray-950 text-balance">
          Training for Bacolor&apos;s Real Threats
        </h2>

        <div className="mt-8 mb-14 grid gap-6 md:grid-cols-[1fr_auto] md:items-end md:gap-16">
          <p className="max-w-3xl text-2xl font-semibold leading-snug tracking-tight text-gray-950 text-pretty md:text-3xl">
            <HugeiconsIcon
              aria-hidden="true"
              icon={MountainIcon}
              className="mr-2 inline-block h-7 w-7 -translate-y-0.5 align-middle text-gray-950 md:h-8 md:w-8"
            />
            Mt. Pinatubo erupted in June 1991. In the years after, lahar buried
            much of Bacolor; on 3 September 1995 it half-buried San Guillermo
            Church.
          </p>
          <p className="max-w-xs text-gray-600 leading-relaxed">
            Modules are grounded in the specific hazards that Bacolor
            communities face.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {hazards.map((hazard) => (
            <div
              key={hazard.title}
              className={`flex flex-col rounded-2xl overflow-hidden border ${hazard.border} bg-white shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className={`${hazard.header} p-6 flex items-center gap-4`}>
                <HugeiconsIcon aria-hidden="true" icon={hazard.icon} className="w-8 h-8 text-white" />
                <h3 className="text-xl font-bold text-white">{hazard.title}</h3>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-base font-semibold leading-snug text-gray-950 text-pretty">
                  {hazard.local}
                </p>
                <p className="mt-3 flex-1 text-gray-600 text-sm leading-relaxed text-pretty">
                  {hazard.description}
                </p>
                <Link
                  to="/register"
                  className={`mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1 self-start text-sm font-bold ${hazard.accent} hover:underline underline-offset-4`}
                >
                  Create an account to start{" "}
                  <HugeiconsIcon aria-hidden="true" icon={ChevronRightIcon} className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
