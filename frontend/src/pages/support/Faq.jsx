import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  CreditCard,
  HelpCircle,
  Landmark,
  MessageSquarePlus,
  Search,
  ShieldCheck,
  UserRoundCheck,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  { id: "ALL", label: "All" },
  { id: "ACCOUNT", label: "Accounts" },
  { id: "TRANSFER", label: "Transfers" },
  { id: "CARD", label: "Cards" },
  { id: "SECURITY", label: "Security" },
  { id: "VERIFICATION", label: "Verification" },
];

const FAQS = [
  {
    id: "account-types",
    category: "ACCOUNT",
    question: "What types of accounts can I have with Epex Bank?",
    answer:
      "Available account types depend on the products offered to your profile and jurisdiction. You can view accounts currently available to you from the Accounts section of your Epex Bank dashboard.",
  },
  {
    id: "account-balance",
    category: "ACCOUNT",
    question: "Where can I see my available account balance?",
    answer:
      "Open the Accounts section from your dashboard and select an account. Your account page displays the available balance and other balance information provided by the banking system.",
  },
  {
    id: "account-statement",
    category: "ACCOUNT",
    question: "How do I view my account statement?",
    answer:
      "Open Accounts, select the account you want to review, and choose the statement option. You can then review the transactions associated with that account.",
  },
  {
    id: "multiple-accounts",
    category: "ACCOUNT",
    question: "Can I have more than one Epex Bank account?",
    answer:
      "Your ability to open additional accounts depends on the account products available to your profile and any applicable eligibility or verification requirements.",
  },

  {
    id: "internal-transfer",
    category: "TRANSFER",
    question: "How do I make an internal Epex Bank transfer?",
    answer:
      "Go to Transfers and select Internal Transfer. Choose the account to debit, enter the recipient's Epex Bank account number and transfer amount, review the information carefully, and submit the transfer.",
  },
  {
    id: "bank-transfer",
    category: "TRANSFER",
    question: "How do I transfer money to a bank beneficiary?",
    answer:
      "Go to Transfers and select Bank Transfer. Choose an existing beneficiary or add a new beneficiary, select your debit account, enter the amount and required payment information, then review the transfer before submitting it.",
  },
  {
    id: "international-transfer",
    category: "TRANSFER",
    question: "Can I make international transfers?",
    answer:
      "Where international transfers are available for your account, you can start one from Transfers > International Transfer. International payments may require additional verification, compliance checks, transfer limits, fees, currency conversion, or correspondent-bank processing.",
  },
  {
    id: "beneficiary",
    category: "TRANSFER",
    question: "What is a beneficiary?",
    answer:
      "A beneficiary is a person or organization whose payment details you save for transfers. Always verify the beneficiary's name, bank details and account information before sending money.",
  },
  {
    id: "transfer-pending",
    category: "TRANSFER",
    question: "Why is my transfer still pending?",
    answer:
      "A pending transfer has not reached its final processing state. Processing can depend on the transfer type, verification requirements, banking network processing and other applicable checks. Open the transfer details page to see the latest status available for that transfer.",
  },
  {
    id: "transfer-history",
    category: "TRANSFER",
    question: "Where can I see my previous transfers?",
    answer:
      "Open the Transfers section to review your transfer history. Select a transfer to view its reference, status, amount and other available details.",
  },

  {
    id: "cards-location",
    category: "CARD",
    question: "Where can I manage my cards?",
    answer:
      "Use the Cards section of your Epex Bank dashboard to view and manage card services currently available to your account.",
  },
  {
    id: "card-lost",
    category: "CARD",
    question: "What should I do if my card is lost or stolen?",
    answer:
      "Use the available card security controls as soon as possible and contact Epex Bank support if further assistance is required. Do not share your PIN, passwords or authentication codes with anyone.",
  },
  {
    id: "card-details",
    category: "CARD",
    question: "Should I send my full card details to support?",
    answer:
      "No. Never send your full card PIN, password, one-time authentication code or other sensitive authentication credentials in a support ticket or message.",
  },

  {
    id: "password-security",
    category: "SECURITY",
    question: "How should I protect my Epex Bank account?",
    answer:
      "Use a strong and unique password, protect access to your email and devices, keep authentication codes private, review account activity regularly, and never approve a transaction you did not initiate.",
  },
  {
    id: "otp",
    category: "SECURITY",
    question: "Should I share my OTP or authentication code?",
    answer:
      "No. Authentication codes and one-time passwords should be kept private. Do not include them in support tickets, messages or other communications.",
  },
  {
    id: "suspicious-activity",
    category: "SECURITY",
    question: "What should I do if I notice suspicious account activity?",
    answer:
      "Review the relevant transaction or transfer information and contact Epex Bank support promptly. If security controls are available for the affected service, use them to protect the account while the activity is being investigated.",
  },
  {
    id: "unknown-transfer",
    category: "SECURITY",
    question: "What should I do if I don't recognize a transfer?",
    answer:
      "Do not ignore an unfamiliar transfer. Record its reference and relevant details, review your recent account activity, secure your account credentials, and contact support so the transaction can be investigated.",
  },

  {
    id: "kyc",
    category: "VERIFICATION",
    question: "Why does Epex Bank require identity verification?",
    answer:
      "Financial services can require customer identity and eligibility checks for security, fraud prevention, regulatory compliance and access to certain banking products or transaction capabilities.",
  },
  {
    id: "verification-status",
    category: "VERIFICATION",
    question: "Where can I check my verification status?",
    answer:
      "Open the verification or KYC section of your Epex Bank account to review the status and any actions currently required from you.",
  },
  {
    id: "verification-review",
    category: "VERIFICATION",
    question: "Why can verification require additional review?",
    answer:
      "Some verification submissions may require additional information or review before they can be completed. Follow the instructions shown in your verification section and provide only the information requested through approved Epex Bank channels.",
  },
];

const categoryIcon = {
  ACCOUNT: Landmark,
  TRANSFER: WalletCards,
  CARD: CreditCard,
  SECURITY: ShieldCheck,
  VERIFICATION: UserRoundCheck,
};

const Faq = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [openFaqId, setOpenFaqId] = useState(null);

  const filteredFaqs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return FAQS.filter((faq) => {
      const matchesCategory =
        category === "ALL" || faq.category === category;

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        faq.question.toLowerCase().includes(normalizedSearch) ||
        faq.answer.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [category, search]);

  const handleCategoryChange = (categoryId) => {
    setCategory(categoryId);
    setOpenFaqId(null);
  };

  const toggleFaq = (faqId) => {
    setOpenFaqId((current) =>
      current === faqId ? null : faqId,
    );
  };

  const clearSearch = () => {
    setSearch("");
    setCategory("ALL");
    setOpenFaqId(null);
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-7 flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/support")}
            className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            aria-label="Back to support"
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <HelpCircle
                size={20}
                className="text-blue-700"
              />

              <span className="text-sm font-semibold text-blue-700">
                Help Center
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Frequently asked questions
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Find answers to common questions about Epex Bank
              accounts, transfers, cards, security and verification.
            </p>
          </div>
        </div>

        <div className="mb-7 overflow-hidden rounded-3xl bg-slate-950 px-5 py-7 shadow-sm sm:px-8 sm:py-9">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
              <HelpCircle size={24} />
            </div>

            <h2 className="mt-4 text-xl font-bold text-white sm:text-2xl">
              How can we help?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Search our frequently asked questions or browse by
              category.
            </p>

            <div className="relative mt-5">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search questions..."
                aria-label="Search frequently asked questions"
                className="w-full rounded-2xl border border-white/10 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-950 shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        <div className="mb-6 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {CATEGORIES.map((item) => {
              const active = category === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    handleCategoryChange(item.id)
                  }
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-blue-700 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
          <main>
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-slate-700">
                {filteredFaqs.length}{" "}
                {filteredFaqs.length === 1
                  ? "question"
                  : "questions"}
              </p>

              {search || category !== "ALL" ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                >
                  Clear filters
                </button>
              ) : null}
            </div>

            {filteredFaqs.length > 0 ? (
              <div className="space-y-3">
                {filteredFaqs.map((faq) => {
                  const isOpen = openFaqId === faq.id;
                  const Icon =
                    categoryIcon[faq.category] || HelpCircle;

                  return (
                    <article
                      key={faq.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => toggleFaq(faq.id)}
                        aria-expanded={isOpen}
                        aria-controls={`faq-answer-${faq.id}`}
                        className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5 sm:py-5"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          <Icon size={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="pr-2 text-sm font-semibold leading-6 text-slate-950 sm:text-[15px]">
                            {faq.question}
                          </p>
                        </div>

                        <ChevronDown
                          size={19}
                          className={`mt-2 shrink-0 text-slate-400 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isOpen ? (
                        <div
                          id={`faq-answer-${faq.id}`}
                          className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-5"
                        >
                          <div className="pl-0 sm:pl-[52px]">
                            <p className="text-sm leading-7 text-slate-600">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Search size={21} />
                </div>

                <h2 className="mt-4 font-semibold text-slate-950">
                  No matching questions
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  We couldn't find an FAQ matching your current
                  search and category.
                </p>

                <button
                  type="button"
                  onClick={clearSearch}
                  className="mt-5 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  View all questions
                </button>
              </div>
            )}
          </main>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <MessageSquarePlus size={20} />
              </div>

              <h2 className="mt-4 font-semibold text-slate-950">
                Still need help?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Create a support ticket if you couldn't find the
                answer you need.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate("/support/tickets/new")
                }
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              >
                <MessageSquarePlus size={17} />
                Create support ticket
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/support/tickets")
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                View my tickets
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-950">
                    Security reminder
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Never share your password, PIN or one-time
                    authentication codes in a support message.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-950">
                Popular topics
              </h3>

              <div className="mt-4 space-y-2">
                {[
                  ["TRANSFER", "Transfers"],
                  ["SECURITY", "Account security"],
                  ["VERIFICATION", "Verification"],
                ].map(([categoryId, label]) => (
                  <button
                    key={categoryId}
                    type="button"
                    onClick={() => {
                      setCategory(categoryId);
                      setSearch("");
                      setOpenFaqId(null);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    {label}
                    <ChevronDown
                      size={15}
                      className="-rotate-90"
                    />
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Faq;