'use client'

type PromptFormVariant = 'default' | 'compact'

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
  variant?: PromptFormVariant
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
  variant = 'default',
}: PromptFormProps) => {
  const isCompact = variant === 'compact'
  const isSubmitDisabled = disabled || prompt.trim().length === 0

  const formClasses = ['shop-prompt-form']
  if (isCompact) {
    formClasses.push('shop-prompt-form--compact')
  }
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

      {isCompact ? (
        <div className="shop-input-with-action">
          <input
            id={inputId}
            type="text"
            className="shop-prompt-input shop-prompt-input--compact"
            placeholder={placeholder}
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            disabled={disabled}
          />
          <button
            type="submit"
            className="shop-prompt-submit shop-prompt-submit--inside"
            disabled={isSubmitDisabled}
          >
            {disabled ? submittingLabel : submitLabel}
          </button>
        </div>
      ) : (
        <>
          <input
            id={inputId}
            type="text"
            className="shop-prompt-input"
            placeholder={placeholder}
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            disabled={disabled}
          />
          <button type="submit" className="shop-prompt-submit" disabled={isSubmitDisabled}>
            {disabled ? submittingLabel : submitLabel}
          </button>
        </>
      )}
    </form>
  )
}

export default PromptForm
