'use client'

type PromptFormProps = {
  inputId: string
  label: string
  prompt: string
  placeholder: string
  onPromptChange: (value: string) => void
  onSubmit: (value: string) => void | Promise<void>
  disabled?: boolean
  submitLabel: string
  submittingLabel?: string
  formClassName?: string
}

const PromptForm = ({
  inputId,
  label,
  prompt,
  placeholder,
  onPromptChange,
  onSubmit,
  disabled = false,
  submitLabel,
  submittingLabel = submitLabel,
  formClassName,
}: PromptFormProps) => {
  const isSubmitDisabled = disabled || prompt.trim().length === 0

  const formClasses = ['shop-prompt-form']
  if (formClassName) {
    formClasses.push(formClassName)
  }

  return (
    <form
      className={formClasses.join(' ')}
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit(prompt)
      }}
    >
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>

      <input
        id={inputId}
        type="text"
        className="shop-prompt-input"
        placeholder={placeholder}
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        disabled={disabled}
      />
      <button
        type="submit"
        className="shop-prompt-submit shop-prompt-submit--inside"
        disabled={isSubmitDisabled}
        aria-label={disabled ? submittingLabel : submitLabel}
        title={disabled ? submittingLabel : submitLabel}
      >
        <svg
          className="shop-prompt-submit__icon"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M8 12V4" />
          <path d="M4.5 7.5L8 4L11.5 7.5" />
        </svg>
      </button>
    </form>
  )
}

export default PromptForm
