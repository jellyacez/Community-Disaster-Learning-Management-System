import { HugeiconsIcon } from "@hugeicons/react";
import {
  BookOpen01Icon,
  Award01Icon,
  Wifi01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

export default function LandingFeatures() {
  const features = [
    {
      icon: BookOpen01Icon,
      title: "Learn one level at a time",
      description:
        "Start with disaster basics, pass each level's assessment, and move on to advanced preparedness skills.",
    },
    {
      icon: Award01Icon,
      title: "A certificate officials can check",
      description:
        "Finish a module and get a certificate with its own QR code. Anyone, including barangay officials, can scan it to check that it's real.",
    },
    {
      icon: Wifi01Icon,
      title: "Keeps working when the signal drops",
      description:
        "Install it on your phone and keep studying saved lessons during an outage. Your progress uploads once you're back online.",
    },
    {
      icon: UserGroupIcon,
      title: "Your barangay knows who's ready",
      description:
        "Residents, barangay officials and the MDRRMO use the same system, so your barangay can see who is prepared before a disaster hits.",
    },
  ];

  return (
    <section id="features" className="scroll-mt-20 py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-4xl font-extrabold tracking-tight text-gray-950 text-balance">
            What You Get as a Resident
          </h2>
          <p className="mt-4 max-w-md text-gray-600 leading-relaxed">
            Every feature accounts for barangay-level realities.
          </p>
        </div>

        <ul className="divide-y divide-gray-200 border-y border-gray-200">
          {features.map((feature) => (
            <li key={feature.title} className="flex gap-5 py-7">
              <HugeiconsIcon
                aria-hidden="true"
                icon={feature.icon}
                className="mt-1 h-6 w-6 shrink-0 text-gray-900"
              />
              <div>
                <h3 className="text-lg font-bold text-gray-950 text-balance">{feature.title}</h3>
                <p className="mt-1.5 max-w-xl text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
