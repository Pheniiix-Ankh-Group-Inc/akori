"use client"

import { useState , useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/Button"
import Link from "next/link"

const SECTORS = [
  "Technology", "Finance", "Healthcare", "Education", "Law",
  "Real Estate", "Arts & Culture", "Politics & Government",
  "Entrepreneurship", "Non-profit", "Media", "Other",
]

const COUNTRIES = [
  "Canada", "France", "United States", "Martinique", "Guadeloupe",
  "Haiti", "Jamaica", "Trinidad & Tobago", "Senegal", "Ivory Coast",
  "Cameroon", "Congo", "Other",
]

type FormData = {
  firstName:  string
  lastName:   string
  city:       string
  country:    string
  sector:     string
  jobTitle:   string
  bio:        string
  avatarUrl:  string
}

export default function OnboardingPage() {
  const router   = useRouter()
  const { data: session, isPending } = useSession()
  const supabase = createClient()

  const [step,    setStep]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")

  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName:  "",
    city:      "",
    country:   "",
    sector:    "",
    jobTitle:  "",
    bio:       "",
    avatarUrl: "",
  })

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [isPending, session, router])

  // ── Guards APRÈS tous les hooks ──
  if (isPending || !session) return (
    <div className="auth-page">
      <p className="text-xs">Loading...</p>
    </div>
  )



  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function validateStep(): boolean {
    setError("")
    if (step === 1 && (!form.firstName || !form.city || !form.country)) {
      setError("Please fill in all required fields.")
      return false
    }
    if (step === 2 && (!form.sector || !form.jobTitle)) {
      setError("Please fill in all required fields.")
      return false
    }
    return true
  }

  function next() {
    if (validateStep()) setStep((s) => s + 1)
  }

  function back() {
    setError("")
    setStep((s) => s - 1)
  }

  async function handleSubmit() {
    console.log("session:", session)
    console.log("form:", form)
    setLoading(true)
    setError("")

    const { error } = await supabase.from("profile").upsert({
      user_id:    session?.user.id,
      full_name:  `${form.firstName} ${form.lastName}`.trim(),
      city:       form.city,
      country:    form.country,
      sector:     form.sector,
      job_title:  form.jobTitle,
      bio:        form.bio,
      avatar_url: form.avatarUrl,
      onboarded:  true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })

    if (error) {
      console.error("Supabase error:", error)
      setError("Failed to save profile. Please try again.")
      setLoading(false)
      return
    }

    router.push("/dashboard")
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: "520px" }}>

        <Link href="/" className="auth-logo">
            <span className="logo">Ako<em>ri</em></span>
        </Link>
     
        <div className="auth-box">

          {/* Progress */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className="h-1 flex-1 rounded-full"
                style={{
                  background: s <= step ? "var(--accent)" : "var(--border)",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>

          <p className="label">
            Step {step} of 3 —{" "}
            {step === 1 ? "Identity" : step === 2 ? "Professional Profile" : "Photo & Confirmation"}
          </p>

          {/* STEP 1 */}
          {step === 1 && (
            <>
              <h1 className="auth-title">Who are you?</h1>
              <p className="auth-subtitle">Tell us a bit about yourself.</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="auth-field">
                  <label className="auth-label">First name <span className="text-accent">*</span></label>
                  <input type="text" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="John" className="auth-input" />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Last name</label>
                  <input type="text" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Doe" className="auth-input" />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">City <span className="text-accent">*</span></label>
                <input type="text" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Montreal" className="auth-input" />
              </div>

              <div className="auth-field">
                <label className="auth-label">Country <span className="text-accent">*</span></label>
                <select value={form.country} onChange={(e) => update("country", e.target.value)} className="auth-input">
                  <option value="">Select a country</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <h1 className="auth-title">Your expertise.</h1>
              <p className="auth-subtitle">Help members find you by profession.</p>

              <div className="auth-field">
                <label className="auth-label">Sector <span className="text-accent">*</span></label>
                <select value={form.sector} onChange={(e) => update("sector", e.target.value)} className="auth-input">
                  <option value="">Select a sector</option>
                  {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="auth-field">
                <label className="auth-label">Job title <span className="text-accent">*</span></label>
                <input type="text" value={form.jobTitle} onChange={(e) => update("jobTitle", e.target.value)} placeholder="Software Engineer" className="auth-input" />
              </div>

              <div className="auth-field">
                <label className="auth-label">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => update("bio", e.target.value)}
                  placeholder="A few words about your background..."
                  className="auth-input"
                  rows={4}
                  style={{ resize: "vertical", borderRadius: "var(--r)" }}
                />
                <p className="text-xs mt-1">{form.bio.length} / 280 characters</p>
              </div>
            </>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <>
              <h1 className="auth-title">Almost done.</h1>
              <p className="auth-subtitle">Add a photo and confirm your profile.</p>

              <div className="auth-field">
                <label className="auth-label">Profile photo URL</label>
                <input type="url" value={form.avatarUrl} onChange={(e) => update("avatarUrl", e.target.value)} placeholder="https://..." className="auth-input" />
              </div>

              <div className="flex items-center gap-4 mb-6">
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="Preview" className="avatar" style={{ width: "64px", height: "64px" }} />
                ) : (
                  <div className="avatar-placeholder" style={{ width: "64px", height: "64px", fontSize: "1.2rem" }}>
                    {form.firstName?.slice(0, 2).toUpperCase() || "?"}
                  </div>
                )}
                <div>
                  <p className="text-sm" style={{ color: "var(--blanc)", fontWeight: 500 }}>
                    {`${form.firstName} ${form.lastName}`.trim() || "Your name"}
                  </p>
                  <p className="text-xs">{form.jobTitle || "Your title"} · {form.city || "Your city"}</p>
                  <p className="text-xs" style={{ marginTop: "0.2rem" }}>{form.sector || "Your sector"}</p>
                </div>
              </div>

              {form.bio && (
                <div className="card" style={{ marginBottom: "1.5rem" }}>
                  <div className="card-body" style={{ padding: "1rem 1.25rem" }}>
                    <p className="text-sm">{form.bio}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {error && <p className="auth-error">{error}</p>}

          <div className="flex gap-3 mt-2">
            {step > 1 && (
              <button onClick={back} className="auth-social-btn" style={{ marginBottom: 0 }}>
                ← Back
              </button>
            )}
            {step < 3 ? (
              <Button variant="white" onClick={next}>Continue →</Button>
            ) : (
              <Button variant="white" onClick={handleSubmit}>
                {loading ? "Saving..." : "Enter AKORI →"}
              </Button>
            )}
          </div>

          {step === 1 && (
            <p className="auth-footer">
              <a href="/dashboard" style={{ color: "var(--texte)", fontSize: "0.72rem" }}>
                Skip for now
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}