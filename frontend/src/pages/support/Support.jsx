import {
  ArrowRight,
  CreditCard,
  FileQuestion,
  Headphones,
  HelpCircle,
  Landmark,
  MessageSquarePlus,
  ShieldCheck,
  TicketCheck,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const SUPPORT_TOPICS = [
  {
    title: "Accounts",
    description:
      "Get help with account access, balances, statements and account services.",
    icon: Landmark,
    route: "/support/faq",
  },
  {
    title: "Transfers",
    description:
      "Find help with internal, bank and international transfers.",
    icon: WalletCards,
    route: "/support/faq",
  },
  {
    title: "Cards",
    description:
      "Get assistance with card services, security and card-related issues.",
    icon: CreditCard,
    route: "/support/faq",
  },
  {
    title: "Security",
    description:
      "Learn how to protect your account and respond to suspicious activity.",
    icon: ShieldCheck,
    route: "/support/faq",
  },
];

const Support = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        {/* Header */}
        <div className="mb-7">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Headphones size={23} />
            </div>

            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-blue-700">
                  Epex Bank Support
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                How can we help?
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Get assistance with your Epex Bank account and
                banking services.
              </p>
            </div>
          </div>
        </div>

        {/* Primary support actions */}
        <section className="mb-7 grid gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate("/support/faq")}
            className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <HelpCircle size={21} />
              </div>

              <ArrowRight
                size={18}
                className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700"
              />
            </div>

            <h2 className="mt-5 font-semibold text-slate-950">
              Frequently asked questions
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Find answers to common questions about Epex Bank
              services.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/support/tickets/new")
            }
            className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <MessageSquarePlus size={21} />
              </div>

              <ArrowRight
                size={18}
                className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700"
              />
            </div>

            <h2 className="mt-5 font-semibold text-slate-950">
              Create support ticket
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Contact the support team about an issue or banking
              request.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/support/tickets")
            }
            className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <TicketCheck size={21} />
              </div>

              <ArrowRight
                size={18}
                className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700"
              />
            </div>

            <h2 className="mt-5 font-semibold text-slate-950">
              My support tickets
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review your existing support requests and their
              current status.
            </p>
          </button>
        </section>

        {/* Help center */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-950">
                Browse support topics
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Find guidance based on the service you need help
                with.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {SUPPORT_TOPICS.map((topic) => {
                const Icon = topic.icon;

                return (
                  <button
                    key={topic.title}
                    type="button"
                    onClick={() => navigate(topic.route)}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-blue-50 group-hover:text-blue-700">
                        <Icon size={19} />
                      </div>

                      <ArrowRight
                        size={17}
                        className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700"
                      />
                    </div>

                    <h3 className="mt-4 text-sm font-semibold text-slate-950">
                      {topic.title}
                    </h3>

                    <p className="mt-1.5 text-xs leading-5 text-slate-500">
                      {topic.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="space-y-5">
            {/* Security */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck size={20} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    Security reminder
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Never share your password, card PIN, one-time
                    password or authentication codes with anyone,
                    including someone claiming to be support.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick help */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <FileQuestion size={19} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    Need an answer quickly?
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Check the FAQ before opening a ticket.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/support/faq")}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                Browse FAQs
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Ticket */}
            <div className="rounded-3xl bg-blue-700 p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                <MessageSquarePlus size={19} />
              </div>

              <h2 className="mt-4 text-sm font-semibold text-white">
                Can't find what you need?
              </h2>

              <p className="mt-1 text-xs leading-5 text-blue-100">
                Send a support request and provide the details
                needed for our team to investigate.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate("/support/tickets/new")
                }
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                Create support ticket
                <ArrowRight size={16} />
              </button>
            </div>
          </aside>
        </div>

        {/* Footer help strip */}
        <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Looking for a specific answer?
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Search the Epex Bank FAQ or contact support if the
                information you need is not available.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/support/faq")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                <HelpCircle size={16} />
                FAQ
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/support/tickets/new")
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                <MessageSquarePlus size={16} />
                Contact support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;