export default function LandingSteps() {
  const steps = [
    {
      title: "Create Your Account",
      desc: "Create a free account as a Bacolor resident to get access to the training.",
    },
    {
      title: "Begin at Level 1",
      desc: "Start with foundational disaster awareness modules designed for your community.",
    },
    {
      title: "Pass Competency Assessments",
      desc: "Complete timed quizzes and scenario-based activities to advance to higher levels.",
    },
    {
      title: "Earn Your Certificate",
      desc: "Receive a verifiable digital certificate tied to your profile upon successful completion.",
    },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-20 py-24 bg-gray-950">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-14 max-w-2xl">
          <h2 className="text-4xl font-extrabold tracking-tight text-white text-balance">
            Your Path to Preparedness
          </h2>
          <p className="mt-4 text-gray-300 leading-relaxed">
            A structured, progressive journey from awareness to verified
            community competency.
          </p>
        </div>

        <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {steps.map((step, index) => (
            <li key={step.title} className="relative border-t border-white/20 pt-6">
              <span className="absolute -top-[5px] left-0 h-2.5 w-2.5 rounded-full bg-white" aria-hidden="true" />
              <p className="text-sm font-semibold text-gray-400 tabular-nums">Step {index + 1}</p>
              <h3 className="mt-2 text-lg font-bold text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-300 leading-relaxed text-pretty">{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
