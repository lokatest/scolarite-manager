import { signup } from "@/lib/actions/auth";
import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  async function submit(formData: FormData) {
    "use server";
    const res = await signup(formData);
    if (res?.error) {
      const { redirect } = await import("next/navigation");
      redirect(`/signup?error=${encodeURIComponent(res.error)}`);
    }
    if (res?.success) {
      const { redirect } = await import("next/navigation");
      redirect(`/signup?success=${encodeURIComponent(res.success)}`);
    }
  }

  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--tts-bg)] px-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white text-xl font-bold font-display mb-4"
            style={{ background: "linear-gradient(135deg, var(--tts-dark), var(--tts-blue))" }}
          >
            SM
          </div>
          <h1 className="text-2xl font-bold font-display text-[var(--tts-dark)]">
            Créer un compte
          </h1>
          <p className="text-sm text-[var(--tts-text-muted)] mt-1">
            Le premier compte créé devient administrateur
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[var(--tts-border)] p-8">
          {params?.error && (
            <div className="mb-5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
              {params.error}
            </div>
          )}
          {params?.success && (
            <div className="mb-5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3">
              {params.success}
            </div>
          )}
          <form action={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
                Nom complet
              </label>
              <input
                name="full_name"
                type="text"
                required
                placeholder="Jean Dupont"
                className="w-full rounded-lg border border-[var(--tts-border)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tts-blue)] focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
                Adresse email
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="vous@etablissement.cm"
                className="w-full rounded-lg border border-[var(--tts-border)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tts-blue)] focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
                Mot de passe
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="8 caractères minimum"
                className="w-full rounded-lg border border-[var(--tts-border)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tts-blue)] focus:border-transparent transition"
              />
            </div>
            <SubmitButton
              pendingLabel="Création..."
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.99]"
              style={{ background: "var(--tts-orange)" }}
            >
              Créer mon compte
            </SubmitButton>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--tts-text-muted)] mt-6">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-[var(--tts-blue)] hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
