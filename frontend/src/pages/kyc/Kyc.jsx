import { useCallback, useEffect, useRef, useState } from "react";

import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FileText,
  IdCard,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Upload,
  UserRound,
  XCircle,
} from "lucide-react";

import api from "../../services/api.js";

const STATUS = {
  NOT_STARTED: "NOT_STARTED",
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
};

const DOCUMENT_TYPES = [
  { value: "PASSPORT", label: "International Passport" },
  { value: "NATIONAL_ID", label: "National ID" },
  { value: "DRIVERS_LICENSE", label: "Driver's License" },
  { value: "VOTERS_CARD", label: "Voter's Card" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const emptyForm = {
  taxIdentificationNumber: "",
  amlCode: "",
  cftCode: "",
  documentType: "",
  documentNumber: "",
  documentFront: null,
  documentBack: null,
  selfie: null,
};

const Kyc = () => {
  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(emptyForm);

  const frontRef = useRef(null);
  const backRef = useRef(null);
  const selfieRef = useRef(null);

  const loadKyc = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/kyc/me");

      const data =
        response?.data?.data ??
        response?.data ??
        null;

      setKyc(data);

      if (data) {
        setForm((current) => ({
          ...current,

          taxIdentificationNumber:
            data.taxIdentificationNumber ||
            current.taxIdentificationNumber ||
            "",

          amlCode:
            data.amlCode ||
            current.amlCode ||
            "",

          cftCode:
            data.cftCode ||
            current.cftCode ||
            "",
        }));
      }
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Unable to load your KYC verification status.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKyc();
  }, [loadKyc]);

  const status = String(
    kyc?.status || STATUS.NOT_STARTED,
  ).toUpperCase();

  const canSubmit =
    status === STATUS.NOT_STARTED ||
    status === STATUS.REJECTED;

  const tin = String(
    kyc?.taxIdentificationNumber || "",
  ).trim();

  const amlCode = String(
    kyc?.amlCode || "",
  ).trim();

  const cftCode = String(
    kyc?.cftCode || "",
  ).trim();

  const tinVerified = Boolean(
    kyc?.taxCodeVerified,
  );

  const amlVerified = Boolean(
    kyc?.amlCodeVerified,
  );

  const cftVerified = Boolean(
    kyc?.cftCodeVerified,
  );

  const handleFile = (field, file) => {
    setError("");
    setSuccess("");

    if (!file) {
      setForm((current) => ({
        ...current,
        [field]: null,
      }));
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(
        "Please select a JPG, PNG, or PDF file.",
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "Each uploaded document must be 10 MB or smaller.",
      );
      return;
    }

    setForm((current) => ({
      ...current,
      [field]: file,
    }));
  };

  const clearForm = () => {
    setForm((current) => ({
      ...emptyForm,

      taxIdentificationNumber:
        current.taxIdentificationNumber ||
        kyc?.taxIdentificationNumber ||
        "",

      amlCode:
        current.amlCode ||
        kyc?.amlCode ||
        "",

      cftCode:
        current.cftCode ||
        kyc?.cftCode ||
        "",
    }));

    if (frontRef.current) {
      frontRef.current.value = "";
    }

    if (backRef.current) {
      backRef.current.value = "";
    }

    if (selfieRef.current) {
      selfieRef.current.value = "";
    }
  };

  const uploadFile = async (
    file,
    fieldName,
  ) => {
    const body = new FormData();

    body.append("file", file);
    body.append("field", fieldName);

    const response = await api.post(
      "/kyc/upload",
      body,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    const url =
      response?.data?.data?.url ||
      response?.data?.url ||
      response?.data?.data?.fileUrl;

    if (!url) {
      throw new Error(
        `The ${fieldName} upload did not return a file URL.`,
      );
    }

    return url;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !form.taxIdentificationNumber.trim()
    ) {
      setError(
        "Please enter your TIN / Tax Identification Number. This is required for transfer tax compliance.",
      );
      return;
    }

    if (!form.amlCode.trim()) {
      setError(
        "Please enter your AML code. This is required for AML compliance.",
      );
      return;
    }

    if (!form.cftCode.trim()) {
      setError(
        "Please enter your CFT code. This is required for CFT compliance.",
      );
      return;
    }

    if (!form.documentType) {
      setError(
        "Please select the type of identity document.",
      );
      return;
    }

    if (!form.documentNumber.trim()) {
      setError(
        "Please enter your document number.",
      );
      return;
    }

    if (!form.documentFront) {
      setError(
        "Please upload the front of your identity document.",
      );
      return;
    }

    if (!form.selfie) {
      setError(
        "Please upload a clear selfie.",
      );
      return;
    }

    if (
      status === STATUS.REJECTED &&
      !kyc?.id
    ) {
      setError(
        "Your KYC record could not be identified for resubmission.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const documentFrontUrl =
        await uploadFile(
          form.documentFront,
          "documentFront",
        );

      let documentBackUrl = "";

      if (form.documentBack) {
        documentBackUrl =
          await uploadFile(
            form.documentBack,
            "documentBack",
          );
      }

      const selfieUrl =
        await uploadFile(
          form.selfie,
          "selfie",
        );

      const payload = {
        taxIdentificationNumber:
          form.taxIdentificationNumber.trim(),

        amlCode:
          form.amlCode.trim(),

        cftCode:
          form.cftCode.trim(),

        documentType:
          form.documentType,

        documentNumber:
          form.documentNumber.trim(),

        documentFrontUrl,

        documentBackUrl:
          documentBackUrl || undefined,

        selfieUrl,
      };

      const response =
        status === STATUS.REJECTED
          ? await api.post(
              "/kyc/resubmit",
              payload,
            )
          : await api.post(
              "/kyc",
              payload,
            );

      const updatedKyc =
        response?.data?.data ??
        response?.data ??
        null;

      setKyc(updatedKyc);

      setSuccess(
        status === STATUS.REJECTED
          ? "Your KYC documents, TIN, AML code, and CFT code have been resubmitted successfully."
          : "Your KYC application, TIN, AML code, and CFT code have been submitted successfully.",
      );

      clearForm();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "We could not submit your KYC application. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl animate-pulse space-y-6">
          <div className="h-8 w-56 rounded-lg bg-slate-200 dark:bg-slate-800" />

          <div className="h-40 rounded-3xl bg-slate-200 dark:bg-slate-800" />

          <div className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">

        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
              <ShieldCheck className="h-4 w-4" />

              Identity & compliance verification
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              KYC Verification
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
              Verify your identity and provide your TIN,
              AML code, and CFT code to access services
              that require completed compliance verification.
            </p>
          </div>

          <button
            type="button"
            onClick={loadKyc}
            disabled={loading || submitting}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <RefreshCw className="h-4 w-4" />

            Refresh
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              <p className="font-bold">
                Something needs your attention
              </p>

              <p className="mt-1 text-sm leading-6">
                {error}
              </p>
            </div>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5" />

            <p className="text-sm font-semibold leading-6">
              {success}
            </p>
          </div>
        )}

        <StatusCard
          status={status}
          kyc={kyc}
        />

        <div className="grid gap-4 lg:grid-cols-3">

          {tin && (
            <ComplianceStatusCard
              title="TIN / Tax ID"
              code={tin}
              verified={tinVerified}
              verifiedAt={kyc?.taxCodeVerifiedAt}
              description="Your TIN must be verified by the compliance team before transfers requiring the TIN check can proceed."
            />
          )}

          {amlCode && (
            <ComplianceStatusCard
              title="AML Code"
              code={amlCode}
              verified={amlVerified}
              verifiedAt={kyc?.amlCodeVerifiedAt}
              description="Your AML code must be verified before transfers requiring the AML check can proceed."
            />
          )}

          {cftCode && (
            <ComplianceStatusCard
              title="CFT Code"
              code={cftCode}
              verified={cftVerified}
              verifiedAt={kyc?.cftCodeVerifiedAt}
              description="Your CFT code must be verified before transfers requiring the CFT check can proceed."
            />
          )}

        </div>

        {status === STATUS.NOT_STARTED && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                Complete your identity & compliance verification
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Enter your TIN, AML code, CFT code,
                identity document details, and upload the
                requested documents. Make sure all information
                is accurate and belongs to you.
              </p>
            </div>

            <KycForm
              form={form}
              setForm={setForm}
              onFile={handleFile}
              onSubmit={handleSubmit}
              submitting={submitting}
              frontRef={frontRef}
              backRef={backRef}
              selfieRef={selfieRef}
              rejected={false}
            />
          </section>
        )}

        {status === STATUS.PENDING && (
          <InfoPanel
            icon={
              <Clock3 className="h-6 w-6" />
            }
            title="KYC submitted — awaiting review"
            text="Your documents, TIN, AML code, and CFT code have been submitted successfully. The compliance team must review your information before the required compliance checks can be satisfied."
            tone="amber"
          />
        )}

        {status === STATUS.UNDER_REVIEW && (
          <InfoPanel
            icon={
              <Clock3 className="h-6 w-6" />
            }
            title="Your KYC is under review"
            text="A member of the compliance team is reviewing your identity information, TIN, AML code, and CFT code. You do not need to submit the application again."
            tone="blue"
          />
        )}

        {status === STATUS.VERIFIED && (
          <VerifiedPanel kyc={kyc} />
        )}

        {status === STATUS.REJECTED && (
          <section className="rounded-3xl border border-red-200 bg-white p-5 shadow-sm dark:border-red-900/50 dark:bg-slate-900 sm:p-7">

            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
              <div className="flex items-start gap-3">

                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

                <div>
                  <h2 className="font-bold text-red-900 dark:text-red-300">
                    KYC requires resubmission
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-400">
                    {kyc?.rejectionReason ||
                      "Your previous KYC application was rejected. Please review your information and submit the requested documents again."}
                  </p>
                </div>

              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-950 dark:text-white">
              Resubmit your verification
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Correct the issue identified during review
              and submit your TIN, AML code, CFT code,
              and required documents again.
            </p>

            <div className="mt-6">
              <KycForm
                form={form}
                setForm={setForm}
                onFile={handleFile}
                onSubmit={handleSubmit}
                submitting={submitting}
                frontRef={frontRef}
                backRef={backRef}
                selfieRef={selfieRef}
                rejected
              />
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex items-start gap-4">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
              <LockKeyhole className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            </div>

            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Keep your verification information secure
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Never share your password, OTP, card PIN,
                TIN, AML code, CFT code, or other security
                codes with anyone. Only upload genuine
                documents belonging to you.
              </p>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
};

const StatusCard = ({
  status,
  kyc,
}) => {
  const configs = {
    NOT_STARTED: {
      title: "Verification not started",
      text: "Your KYC profile is ready. Complete the form below to begin identity and compliance verification.",
      icon: (
        <ShieldCheck className="h-7 w-7" />
      ),
      box: "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white",
      iconBox:
        "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
    },

    PENDING: {
      title: "Verification submitted",
      text: "Your application has been received and is waiting for compliance review.",
      icon: (
        <Clock3 className="h-7 w-7" />
      ),
      box: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200",
      iconBox:
        "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    },

    UNDER_REVIEW: {
      title: "Verification under review",
      text: "Your KYC information is currently being reviewed by the compliance team.",
      icon: (
        <Clock3 className="h-7 w-7" />
      ),
      box: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200",
      iconBox:
        "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
    },

    VERIFIED: {
      title: "Identity verified",
      text: "Your identity verification has been successfully completed.",
      icon: (
        <CheckCircle2 className="h-7 w-7" />
      ),
      box: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200",
      iconBox:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
    },

    REJECTED: {
      title: "Verification rejected",
      text: "Your previous verification requires correction and resubmission.",
      icon: (
        <XCircle className="h-7 w-7" />
      ),
      box: "border-red-200 bg-red-50 text-red-950 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200",
      iconBox:
        "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
    },
  };

  const config =
    configs[status] ||
    configs.NOT_STARTED;

  return (
    <section
      className={`rounded-3xl border p-5 sm:p-7 ${config.box}`}
    >
      <div className="flex items-start gap-4">

        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${config.iconBox}`}
        >
          {config.icon}
        </div>

        <div className="min-w-0 flex-1">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold">
              {config.title}
            </h2>

            <span className="w-fit rounded-full bg-white/70 px-3 py-1 text-xs font-bold dark:bg-slate-900/60">
              {status.replace(
                /\_/g,
                " ",
              )}
            </span>
          </div>

          <p className="mt-2 max-w-3xl text-sm leading-6 opacity-80">
            {config.text}
          </p>

          {kyc?.updatedAt && (
            <p className="mt-3 text-xs font-medium opacity-70">
              Last updated:{" "}
              {formatDate(
                kyc.updatedAt,
              )}
            </p>
          )}

        </div>
      </div>
    </section>
  );
};

const ComplianceStatusCard = ({
  title,
  code,
  verified,
  verifiedAt,
  description,
}) => (
  <section
    className={`rounded-3xl border p-5 shadow-sm ${
      verified
        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
        : "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20"
    }`}
  >
    <div className="flex items-start gap-3">

      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          verified
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
        }`}
      >
        {verified ? (
          <BadgeCheck className="h-6 w-6" />
        ) : (
          <FileText className="h-6 w-6" />
        )}
      </div>

      <div className="min-w-0 flex-1">

        <div className="flex flex-col gap-2">
          <h2
            className={`text-lg font-bold ${
              verified
                ? "text-emerald-950 dark:text-emerald-200"
                : "text-amber-950 dark:text-amber-200"
            }`}
          >
            {title}
          </h2>

          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
              verified
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
            }`}
          >
            {verified
              ? "VERIFIED"
              : "PENDING VERIFICATION"}
          </span>
        </div>

        <p
          className={`mt-3 text-sm leading-6 ${
            verified
              ? "text-emerald-800 dark:text-emerald-300"
              : "text-amber-800 dark:text-amber-300"
          }`}
        >
          {description}
        </p>

        <div
          className={`mt-4 rounded-xl border p-3 ${
            verified
              ? "border-emerald-200 bg-white/70 dark:border-emerald-900/50 dark:bg-slate-900/50"
              : "border-amber-200 bg-white/70 dark:border-amber-900/50 dark:bg-slate-900/50"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Submitted code
          </p>

          <p className="mt-1 break-all font-bold text-slate-900 dark:text-white">
            {code}
          </p>

          {verifiedAt && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Verified on{" "}
              {formatDate(
                verifiedAt,
              )}
            </p>
          )}
        </div>

      </div>
    </div>
  </section>
);

const InfoPanel = ({
  icon,
  title,
  text,
  tone,
}) => {
  const tones = {
    amber:
      "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200",

    blue:
      "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200",
  };

  return (
    <section
      className={`rounded-3xl border p-5 sm:p-7 ${
        tones[tone]
      }`}
    >
      <div className="flex items-start gap-4">

        <div className="mt-0.5 shrink-0">
          {icon}
        </div>

        <div>
          <h2 className="font-bold">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 opacity-80">
            {text}
          </p>
        </div>

      </div>
    </section>
  );
};

const VerifiedPanel = ({
  kyc,
}) => (
  <section className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900/50 dark:bg-slate-900 sm:p-7">

    <div className="flex items-start gap-4">

      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
        <CheckCircle2 className="h-6 w-6" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">
          Your identity is verified
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Your KYC verification has been approved.
          Your identity and compliance details are shown below.
        </p>
      </div>

    </div>

    <div className="mt-6 grid gap-4 sm:grid-cols-2">

      <Detail
        label="TIN / Tax Identification Number"
        value={
          kyc?.taxIdentificationNumber
        }
      />

      <Detail
        label="TIN verification"
        value={
          kyc?.taxCodeVerified
            ? "Verified"
            : "Pending verification"
        }
      />

      <Detail
        label="AML code"
        value={kyc?.amlCode}
      />

      <Detail
        label="AML verification"
        value={
          kyc?.amlCodeVerified
            ? "Verified"
            : "Pending verification"
        }
      />

      <Detail
        label="CFT code"
        value={kyc?.cftCode}
      />

      <Detail
        label="CFT verification"
        value={
          kyc?.cftCodeVerified
            ? "Verified"
            : "Pending verification"
        }
      />

      <Detail
        label="Document type"
        value={kyc?.documentType}
      />

      <Detail
        label="Document number"
        value={kyc?.documentNumber}
      />

      <Detail
        label="Verified on"
        value={formatDate(kyc?.verifiedAt)}
      />

      <Detail
        label="Last reviewed"
        value={formatDate(kyc?.reviewedAt)}
      />

    </div>
  </section>
);

const Detail = ({
  label,
  value,
}) => (
  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">

    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}
    </p>

    <p className="mt-2 break-words font-bold text-slate-900 dark:text-white">
      {value || "—"}
    </p>

  </div>
);

const KycForm = ({
  form,
  setForm,
  onFile,
  onSubmit,
  submitting,
  frontRef,
  backRef,
  selfieRef,
  rejected,
}) => (
  <form
    onSubmit={onSubmit}
    className="space-y-6"
  >

    {/* TIN */}

    <div>
      <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-200">
        TIN / Tax Identification Number
        <span className="ml-1 text-red-500">
          *
        </span>
      </label>

      <div className="relative">

        <BadgeCheck className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

        <input
          type="text"
          value={
            form.taxIdentificationNumber
          }
          onChange={(e) =>
            setForm((current) => ({
              ...current,
              taxIdentificationNumber:
                e.target.value,
            }))
          }
          placeholder="Enter your TIN / Tax Identification Number"
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
          autoComplete="off"
          maxLength={100}
          required
        />

      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        Your TIN is used for tax and transfer
        compliance checks. It must be verified by
        the compliance team before it can satisfy
        the TIN compliance requirement.
      </p>
    </div>

    {/* AML + CFT */}

    <div className="grid gap-5 md:grid-cols-2">

      <div>
        <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-200">
          AML Code
          <span className="ml-1 text-red-500">
            *
          </span>
        </label>

        <div className="relative">

          <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            value={
              form.amlCode
            }
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                amlCode:
                  e.target.value,
              }))
            }
            placeholder="Enter your AML code"
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
            autoComplete="off"
            maxLength={100}
            required
          />

        </div>

        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Your AML code is stored with your KYC
          application and must be verified by the
          compliance team before AML-protected
          transfers can proceed.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-200">
          CFT Code
          <span className="ml-1 text-red-500">
            *
          </span>
        </label>

        <div className="relative">

          <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            value={
              form.cftCode
            }
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                cftCode:
                  e.target.value,
              }))
            }
            placeholder="Enter your CFT code"
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
            autoComplete="off"
            maxLength={100}
            required
          />

        </div>

        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Your CFT code is used for counter-terrorist
          financing compliance checks and must be
          verified by the compliance team.
        </p>
      </div>

    </div>

    {/* Identity documents */}

    <div className="grid gap-5 sm:grid-cols-2">

      <div>
        <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-200">
          Identity document type
        </label>

        <div className="relative">

          <IdCard className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <select
            value={form.documentType}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                documentType:
                  e.target.value,
              }))
            }
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
            required
          >
            <option value="">
              Select document
            </option>

            {DOCUMENT_TYPES.map(
              (item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ),
            )}
          </select>

        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-200">
          Document number
        </label>

        <div className="relative">

          <FileText className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            value={
              form.documentNumber
            }
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                documentNumber:
                  e.target.value,
              }))
            }
            placeholder="Enter document number"
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
            autoComplete="off"
            required
          />

        </div>
      </div>

    </div>

    {/* Files */}

    <div className="grid gap-5 md:grid-cols-2">

      <FileInput
        label="Document front"
        help="JPG, PNG or PDF · maximum 10 MB"
        file={form.documentFront}
        inputRef={frontRef}
        onChange={(file) =>
          onFile(
            "documentFront",
            file,
          )
        }
        required
      />

      <FileInput
        label="Document back"
        help="Required only when your document has a back side"
        file={form.documentBack}
        inputRef={backRef}
        onChange={(file) =>
          onFile(
            "documentBack",
            file,
          )
        }
      />

    </div>

    <FileInput
      label="Selfie"
      help="Upload a clear, recent photo of yourself · maximum 10 MB"
      file={form.selfie}
      inputRef={selfieRef}
      onChange={(file) =>
        onFile(
          "selfie",
          file,
        )
      }
      required
      imageOnly
    />

    {/* Compliance information */}

    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
      <div className="flex items-start gap-3">

        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />

        <div>

          <p className="font-bold text-blue-900 dark:text-blue-300">
            Compliance verification
          </p>

          <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-400">
            Your TIN, AML code, and CFT code will
            be saved with your KYC application.
            The bank's compliance settings determine
            which checks are required for transfers.
            When a compliance check is enabled,
            the corresponding code must be verified
            by an administrator before the related
            transfers can proceed.
          </p>

        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex items-start gap-3">

        <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

        <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
          Make sure your document is valid,
          readable, and belongs to you. Information
          submitted for verification should match
          your account information and your
          compliance details.
        </p>

      </div>
    </div>

    <button
      type="submit"
      disabled={submitting}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500 sm:w-auto"
    >
      {submitting ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />

          {rejected
            ? "Resubmitting..."
            : "Submitting..."}
        </>
      ) : (
        <>
          <Upload className="h-5 w-5" />

          {rejected
            ? "Resubmit KYC"
            : "Submit KYC"}
        </>
      )}
    </button>

  </form>
);

const FileInput = ({
  label,
  help,
  file,
  inputRef,
  onChange,
  required,
  imageOnly,
}) => (
  <div>

    <label className="mb-2 block text-sm font-bold text-slate-800 dark:text-slate-200">
      {label}

      {required && (
        <span className="ml-1 text-red-500">
          *
        </span>
      )}
    </label>

    <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-blue-500 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-blue-500">

      <input
        ref={inputRef}
        type="file"
        accept={
          imageOnly
            ? "image/jpeg,image/png"
            : "image/jpeg,image/png,application/pdf"
        }
        className="hidden"
        required={
          required && !file
        }
        onChange={(e) =>
          onChange(
            e.target.files?.[0] ||
              null,
          )
        }
      />

      {file ? (
        <>
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />

          <p className="mt-2 max-w-full truncate text-sm font-bold text-slate-900 dark:text-white">
            {file.name}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {(
              file.size /
              1024 /
              1024
            ).toFixed(2)}{" "}
            MB
          </p>
        </>
      ) : (
        <>
          <Upload className="h-8 w-8 text-slate-400" />

          <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
            Click to choose a file
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {help}
          </p>
        </>
      )}

    </label>
  </div>
);

export default Kyc;