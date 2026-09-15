import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Search01Icon,
  HelpSquareIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { FAQ_ITEMS } from "../../../constants/faqData";

export default function LandingFAQ() {
  const [openId, setOpenId] = useState(FAQ_ITEMS[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleAccordion = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const filteredFaqs = FAQ_ITEMS.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section id="faq" className="py-24 bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block bg-red-100 text-red-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wide">
            Frequently Asked Questions
          </span>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-3">
            Got Questions? We&apos;ve Got Answers.
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
            Everything you need to know about offline study mode, recertifications, and municipal credentialing.
          </p>

          {/* Quick Search */}
          <div className="pt-6 max-w-md mx-auto">
            <div className="relative">
              <HugeiconsIcon
                aria-hidden="true"
                icon={Search01Icon}
                className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search queries (e.g. offline, certificate, privacy)..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
              />
            </div>
          </div>
        </motion.div>

        {/* Accordion List */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
        >
          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs sm:text-sm">
              No answers matching &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = openId === faq.id;
              return (
                <div key={faq.id} className="transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleAccordion(faq.id)}
                    className="w-full px-6 py-4 sm:py-5 flex items-center justify-between gap-4 text-left hover:bg-gray-50/70 transition cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <div className="space-y-1 pr-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded">
                        {faq.category}
                      </span>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-snug">
                        {faq.question}
                      </h3>
                    </div>
                    <div className="p-1.5 rounded-lg text-gray-400 shrink-0 bg-gray-50">
                      <HugeiconsIcon
                        aria-hidden="true"
                        icon={isOpen ? ArrowUp01Icon : ArrowDown01Icon}
                        className="w-4 h-4 text-gray-600"
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-xs sm:text-sm text-gray-600 leading-relaxed bg-gray-50/40 border-t border-gray-50">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </motion.div>

        {/* Fallback Banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mt-8 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="text-center sm:text-left">
            <h4 className="text-sm font-bold text-gray-900">
              Still have questions about disaster training?
            </h4>
            <p className="text-xs text-gray-600 mt-0.5">
              Contact our municipal MDRRMO desk or register for complete access.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/signin"
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold rounded-lg border border-gray-200 transition shadow-xs"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1"
            >
              Start Free
              <HugeiconsIcon aria-hidden="true" icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}