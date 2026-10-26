import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { FAQ_ITEMS } from "../../../constants/faqData";

export default function LandingFAQ() {
  const [openId, setOpenId] = useState(FAQ_ITEMS[0]?.id || null);

  const toggleAccordion = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="scroll-mt-20 py-24 bg-white border-b border-gray-100">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-10">
          <h2 className="text-4xl font-extrabold tracking-tight text-gray-950 text-balance">
            Got Questions? We&apos;ve Got Answers.
          </h2>
          <p className="mt-4 max-w-md text-gray-600 leading-relaxed">
            Quick answers about studying offline, renewing certificates, privacy and language.
          </p>
        </div>

        <div className="divide-y divide-gray-200 border-y border-gray-200">
          {FAQ_ITEMS.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div key={faq.id}>
                <h3>
                  <button
                    type="button"
                    id={`faq-q-${faq.id}`}
                    onClick={() => toggleAccordion(faq.id)}
                    className="w-full py-5 flex items-center justify-between gap-4 text-left cursor-pointer group"
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${faq.id}`}
                  >
                    <span className="block space-y-1 pr-2">
                      <span className="block text-xs font-semibold text-gray-600">
                        {faq.category}
                      </span>
                      <span className="block text-sm sm:text-base font-semibold text-gray-900 leading-snug group-hover:text-gray-600 transition-colors">
                        {faq.question}
                      </span>
                    </span>
                    <HugeiconsIcon
                      aria-hidden="true"
                      icon={isOpen ? ArrowUp01Icon : ArrowDown01Icon}
                      className="w-4 h-4 shrink-0 text-gray-600"
                    />
                  </button>
                </h3>

                {isOpen && (
                  <p
                    id={`faq-a-${faq.id}`}
                    role="region"
                    aria-labelledby={`faq-q-${faq.id}`}
                    className="pb-6 pr-8 text-sm text-gray-600 leading-relaxed"
                  >
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
